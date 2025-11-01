// Matchmaking system for Domino Social
// Handles auto-pairing solo players, keeping partnered teams, and forming tables

export interface Player {
  id: string
  name: string
  email: string
  hasPartner: boolean
  hasPlayedBefore: boolean | null
  partnerName?: string | null
  partnerEmail?: string | null
  status: "waiting" | "paired" | "at_table" | "playing" | "finished"
  teamId?: string
  tableId?: string
}

export interface Team {
  id: string
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  status: "waiting" | "paired" | "at_table" | "playing" | "finished" | "waitlist"
  tableId?: string
  wins: number
  losses: number
}

export interface Table {
  id: string
  number: number
  team1Id: string
  team2Id: string
  status: "waiting" | "playing" | "finished"
  winnerId?: string
  loserId?: string
}

export interface MatchmakingResult {
  teams: Team[]
  tables: Table[]
  unpairedPlayers: Player[]
}

export function performMatchmaking(players: Player[]): MatchmakingResult {
  const teams: Team[] = []
  const tables: Table[] = []
  const unpairedPlayers: Player[] = []

  // Step 1: Create teams from partnered players
  const partneredPlayers = players.filter((p) => p.hasPartner && p.partnerName)
  const soloPlayers = players.filter((p) => !p.hasPartner)

  // Process partnered players (they come as pairs)
  for (let i = 0; i < partneredPlayers.length; i += 2) {
    const player1 = partneredPlayers[i]
    const player2 = partneredPlayers[i + 1]

    if (player2) {
      const teamId = `team-${Date.now()}-${i}`
      const team: Team = {
        id: teamId,
        player1Id: player1.id,
        player2Id: player2.id,
        player1Name: player1.name,
        player2Name: player2.name,
        status: "waiting",
        wins: 0,
        losses: 0,
      }
      teams.push(team)

      // Update player status
      player1.status = "paired"
      player1.teamId = teamId
      player2.status = "paired"
      player2.teamId = teamId
    }
  }

  // Step 2: Auto-pair solo players
  for (let i = 0; i < soloPlayers.length; i += 2) {
    const player1 = soloPlayers[i]
    const player2 = soloPlayers[i + 1]

    if (player2) {
      const teamId = `team-${Date.now()}-${i + 1000}`
      const team: Team = {
        id: teamId,
        player1Id: player1.id,
        player2Id: player2.id,
        player1Name: player1.name,
        player2Name: player2.name,
        status: "waiting",
        wins: 0,
        losses: 0,
      }
      teams.push(team)

      // Update player status
      player1.status = "paired"
      player1.teamId = teamId
      player2.status = "paired"
      player2.teamId = teamId
    } else {
      // Odd player out - add to unpaired list
      unpairedPlayers.push(player1)
    }
  }

  // Step 3: Form tables (2 teams = 4 players per table)
  for (let i = 0; i < teams.length; i += 2) {
    const team1 = teams[i]
    const team2 = teams[i + 1]

    if (team2) {
      const tableId = `table-${Date.now()}-${i}`
      const table: Table = {
        id: tableId,
        number: Math.floor(i / 2) + 1,
        team1Id: team1.id,
        team2Id: team2.id,
        status: "waiting",
      }
      tables.push(table)

      // Update team status
      team1.status = "at_table"
      team1.tableId = tableId
      team2.status = "at_table"
      team2.tableId = tableId

      // Update player status
      const team1Players = players.filter((p) => p.teamId === team1.id)
      const team2Players = players.filter((p) => p.teamId === team2.id)

      team1Players.forEach((p) => {
        p.status = "at_table"
        p.tableId = tableId
      })
      team2Players.forEach((p) => {
        p.status = "at_table"
        p.tableId = tableId
      })
    }
  }

  return { teams, tables, unpairedPlayers }
}

export function getPlayerAssignment(playerId: string, players: Player[], teams: Team[], tables: Table[]) {
  const player = players.find((p) => p.id === playerId)
  if (!player || !player.teamId) return null

  const team = teams.find((t) => t.id === player.teamId)
  if (!team) return null

  const partnerId = team.player1Id === playerId ? team.player2Id : team.player1Id
  const partner = players.find((p) => p.id === partnerId)

  const table = tables.find((t) => t.id === team.tableId)

  return {
    playerName: player.name,
    partnerName: partner?.name || "Unknown",
    tableNumber: table?.number || 0,
    teamId: team.id,
    tableId: table?.id,
  }
}

export function saveMatchmakingResults(players: Player[], teams: Team[], tables: Table[]) {
  localStorage.setItem("session-players", JSON.stringify(players))
  localStorage.setItem("session-teams", JSON.stringify(teams))
  localStorage.setItem("session-tables", JSON.stringify(tables))
}

export function loadMatchmakingResults(): { players: Player[]; teams: Team[]; tables: Table[] } {
  const playersData = localStorage.getItem("session-players")
  const teamsData = localStorage.getItem("session-teams")
  const tablesData = localStorage.getItem("session-tables")

  return {
    players: playersData ? JSON.parse(playersData) : [],
    teams: teamsData ? JSON.parse(teamsData) : [],
    tables: tablesData ? JSON.parse(tablesData) : [],
  }
}

export function addToWaitlist(teamId: string) {
  const { players, teams, tables } = loadMatchmakingResults()

  const team = teams.find((t) => t.id === teamId)
  if (!team) return

  team.status = "waitlist"
  team.tableId = undefined

  // Update player status
  players.forEach((p) => {
    if (p.teamId === teamId) {
      p.status = "waiting"
      p.tableId = undefined
    }
  })

  saveMatchmakingResults(players, teams, tables)
}

export function getWaitlistTeams(): Team[] {
  const { teams } = loadMatchmakingResults()
  return teams.filter((t) => t.status === "waitlist")
}

export function startNextRound(): MatchmakingResult {
  const { players, teams, tables } = loadMatchmakingResults()

  // Get waitlist teams
  const waitlistTeams = teams.filter((t) => t.status === "waitlist")

  // Reset team status to waiting
  waitlistTeams.forEach((t) => {
    t.status = "waiting"
  })

  const newTables: Table[] = []

  // Form new tables from waitlist teams (2 teams = 4 players per table)
  for (let i = 0; i < waitlistTeams.length; i += 2) {
    const team1 = waitlistTeams[i]
    const team2 = waitlistTeams[i + 1]

    if (team2) {
      const tableId = `table-${Date.now()}-${i}`
      const table: Table = {
        id: tableId,
        number: Math.floor(i / 2) + 1,
        team1Id: team1.id,
        team2Id: team2.id,
        status: "waiting",
      }
      newTables.push(table)

      // Update team status
      team1.status = "at_table"
      team1.tableId = tableId
      team2.status = "at_table"
      team2.tableId = tableId

      // Update player status
      players.forEach((p) => {
        if (p.teamId === team1.id || p.teamId === team2.id) {
          p.status = "at_table"
          p.tableId = tableId
        }
      })
    }
  }

  // Add new tables to existing tables
  tables.push(...newTables)

  saveMatchmakingResults(players, teams, tables)

  return {
    teams: waitlistTeams,
    tables: newTables,
    unpairedPlayers: [],
  }
}

export function reportGameResult(tableId: string, winningTeamId: string) {
  const { players, teams, tables } = loadMatchmakingResults()

  const table = tables.find((t) => t.id === tableId)
  if (!table) return

  table.status = "finished"
  table.winnerId = winningTeamId
  table.loserId = table.team1Id === winningTeamId ? table.team2Id : table.team1Id

  const winningTeam = teams.find((t) => t.id === winningTeamId)
  const losingTeam = teams.find((t) => t.id === table.loserId)

  if (winningTeam) {
    winningTeam.wins += 1
    winningTeam.status = "finished"
  }
  if (losingTeam) {
    losingTeam.losses += 1
    losingTeam.status = "waitlist"
    losingTeam.tableId = undefined
  }

  players.forEach((p) => {
    if (p.tableId === tableId) {
      if (p.teamId === winningTeamId) {
        p.status = "finished"
      } else {
        p.status = "waiting"
      }
      p.tableId = undefined
    }
  })

  saveMatchmakingResults(players, teams, tables)
}
