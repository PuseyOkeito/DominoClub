import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // ===== CLEANUP: Reset old game data for this session =====
    console.log(`[v0] Cleaning up old data for session: ${sessionId}`)
    
    // Get all players for this session
    const { data: sessionPlayers, error: sessionPlayersError } = await supabase
      .from("players")
      .select("id")
      .eq("session_id", sessionId)

    if (sessionPlayersError) {
      console.error("[v0] Error fetching session players for cleanup:", sessionPlayersError)
    }

    if (sessionPlayers && sessionPlayers.length > 0) {
      const playerIds = sessionPlayers.map((p) => p.id)

      // Find teams that reference these players (using proper Supabase query)
      const { data: oldTeams } = await supabase
        .from("teams")
        .select("id")
        .or(`player1_id.in.(${playerIds.join(",")}),player2_id.in.(${playerIds.join(",")})`)

      if (oldTeams && oldTeams.length > 0) {
        const teamIds = oldTeams.map((t) => t.id)

        // Delete game_tables that reference these teams
        const { error: tablesDeleteError } = await supabase
          .from("game_tables")
          .delete()
          .or(`team1_id.in.(${teamIds.join(",")}),team2_id.in.(${teamIds.join(",")})`)

        if (tablesDeleteError) {
          console.error("[v0] Error deleting game_tables:", tablesDeleteError)
        }

        // Delete the teams
        const { error: teamsDeleteError } = await supabase
          .from("teams")
          .delete()
          .in("id", teamIds)

        if (teamsDeleteError) {
          console.error("[v0] Error deleting teams:", teamsDeleteError)
        }
      }

      // Reset player statuses back to "waiting" and clear table_id
      const { error: playersUpdateError } = await supabase
        .from("players")
        .update({
          status: "waiting",
          table_id: null,
        })
        .eq("session_id", sessionId)

      if (playersUpdateError) {
        console.error("[v0] Error resetting player statuses:", playersUpdateError)
      }
    }
    // ===== END CLEANUP =====

    // Now proceed with matchmaking
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "waiting")
      .order("created_at", { ascending: true })

    if (playersError) {
      console.error("[v0] Error fetching players:", playersError)
      return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 })
    }

    if (!players || players.length < 4) {
      return NextResponse.json(
        {
          error: "Not enough players (need at least 4)",
          playerCount: players?.length || 0,
        },
        { status: 400 },
      )
    }

    const teams = []
    const partneredPlayers = players.filter((p) => p.has_partner && p.partner_name)
    const soloPlayers = players.filter((p) => !p.has_partner)

    // ===== IMPROVED: Match partnered players by partner_name =====
    // Create a map to find partners
    const partnerMap = new Map<string, typeof players[0]>()
    partneredPlayers.forEach((p) => {
      if (p.partner_name) {
        partnerMap.set(p.partner_name.toLowerCase().trim(), p)
      }
    })

    const matchedPartners = new Set<string>()
    const unpairedPartners: typeof players = []

    // Match partnered players by finding their partner
    for (const player of partneredPlayers) {
      if (matchedPartners.has(player.id)) continue

      // Try to find their partner
      const partnerName = player.partner_name?.toLowerCase().trim()
      if (!partnerName) continue

      // Find a player whose name matches this player's partner_name
      const partner = partneredPlayers.find(
        (p) =>
          p.id !== player.id &&
          !matchedPartners.has(p.id) &&
          p.name.toLowerCase().trim() === partnerName,
      )

      if (partner) {
        // Found the partner! Create team
        const { data: team, error: teamError } = await supabase
          .from("teams")
          .insert({
            player1_id: player.id,
            player2_id: partner.id,
            player1_name: player.name,
            player2_name: partner.name,
            status: "paired",
          })
          .select()
          .single()

        if (teamError) {
          console.error("[v0] Error creating partnered team:", teamError)
        } else if (team) {
          teams.push(team)
          matchedPartners.add(player.id)
          matchedPartners.add(partner.id)
        }
      } else {
        // Partner not found yet, add to unpaired list
        unpairedPartners.push(player)
      }
    }

    // Add unpaired partners to solo players pool
    soloPlayers.push(...unpairedPartners)

    // ===== Create teams from solo players =====
    for (let i = 0; i < soloPlayers.length; i += 2) {
      const p1 = soloPlayers[i]
      const p2 = soloPlayers[i + 1]

      if (!p2) {
        // Odd player out - they'll wait for next round
        console.log(`[v0] Unpaired solo player: ${p1.name}`)
        break
      }

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          player1_id: p1.id,
          player2_id: p2.id,
          player1_name: p1.name,
          player2_name: p2.name,
          status: "paired",
        })
        .select()
        .single()

      if (teamError) {
        console.error("[v0] Error creating solo team:", teamError)
      } else if (team) {
        teams.push(team)
      }
    }

    if (teams.length === 0) {
      return NextResponse.json(
        {
          error: "No teams could be created",
          playerCount: players.length,
          partneredCount: partneredPlayers.length,
          soloCount: soloPlayers.length,
        },
        { status: 400 },
      )
    }

    // ===== Create game tables (2 teams = 4 players per table) =====
    const tablesCreated = []
    const waitlistTeams = []

    for (let i = 0; i < teams.length; i += 2) {
      const team1 = teams[i]
      const team2 = teams[i + 1]

      if (!team2) {
        // Odd team out - put on waitlist
        const { error: waitlistError } = await supabase
          .from("teams")
          .update({ status: "waitlist" })
          .eq("id", team1.id)

        if (waitlistError) {
          console.error("[v0] Error updating team to waitlist:", waitlistError)
        } else {
          waitlistTeams.push(team1)
        }
        break
      }

      // Get next available table number
      const { data: existingTables } = await supabase
        .from("game_tables")
        .select("table_number")
        .order("table_number", { ascending: false })
        .limit(1)

      const tableNumber = existingTables && existingTables.length > 0
        ? existingTables[0].table_number + 1
        : 1

      // Create game table
      const { data: gameTable, error: tableError } = await supabase
        .from("game_tables")
        .insert({
          table_number: tableNumber,
          team1_id: team1.id,
          team2_id: team2.id,
          status: "ready",
        })
        .select()
        .single()

      if (tableError) {
        console.error("[v0] Error creating game table:", tableError)
        continue
      }

      if (gameTable) {
        tablesCreated.push(gameTable)

        // Update teams with table number and status
        const { error: teamsUpdateError } = await supabase
          .from("teams")
          .update({ table_number: tableNumber, status: "at_table" })
          .in("id", [team1.id, team2.id])

        if (teamsUpdateError) {
          console.error("[v0] Error updating teams:", teamsUpdateError)
        }

        // Update players status to assigned
        const { error: playersUpdateError } = await supabase
          .from("players")
          .update({ status: "assigned" })
          .in("id", [team1.player1_id, team1.player2_id, team2.player1_id, team2.player2_id])

        if (playersUpdateError) {
          console.error("[v0] Error updating players:", playersUpdateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      teamsCreated: teams.length,
      tablesCreated: tablesCreated.length,
      waitlistTeams: waitlistTeams.length,
      unpairedPlayers: soloPlayers.length % 2,
    })
  } catch (error) {
    console.error("[v0] Error in matchmake API:", error)
    return NextResponse.json(
      { error: "Failed to matchmake", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
