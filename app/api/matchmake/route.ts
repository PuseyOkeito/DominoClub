import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()

    const supabase = await createClient()

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "waiting")
      .order("created_at", { ascending: true })

    if (playersError || !players || players.length < 4) {
      return NextResponse.json(
        {
          error: "Not enough players (need at least 4)",
        },
        { status: 400 },
      )
    }

    const teams = []
    const partneredPlayers = players.filter((p) => p.has_partner)
    const soloPlayers = players.filter((p) => !p.has_partner)

    // Create teams from partnered players
    for (let i = 0; i < partneredPlayers.length; i += 2) {
      const p1 = partneredPlayers[i]
      const p2 = partneredPlayers[i + 1]
      if (!p2) break

      const { data: team } = await supabase
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

      if (team) teams.push(team)
    }

    // Create teams from solo players
    for (let i = 0; i < soloPlayers.length; i += 2) {
      const p1 = soloPlayers[i]
      const p2 = soloPlayers[i + 1]
      if (!p2) break

      const { data: team } = await supabase
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

      if (team) teams.push(team)
    }

    let tableNumber = 1
    for (let i = 0; i < teams.length; i += 2) {
      const team1 = teams[i]
      const team2 = teams[i + 1]
      if (!team2) break

      // Create game table
      await supabase.from("game_tables").insert({
        table_number: tableNumber,
        team1_id: team1.id,
        team2_id: team2.id,
        status: "ready",
      })

      // Update teams with table number and status
      await supabase
        .from("teams")
        .update({ table_number: tableNumber, status: "at_table" })
        .in("id", [team1.id, team2.id])

      // Update players status to assigned
      await supabase
        .from("players")
        .update({ status: "assigned" })
        .in("id", [team1.player1_id, team1.player2_id, team2.player1_id, team2.player2_id])

      tableNumber++
    }

    return NextResponse.json({ success: true, teamsCreated: teams.length })
  } catch (error) {
    console.error("[v0] Error in matchmake API:", error)
    return NextResponse.json({ error: "Failed to matchmake" }, { status: 500 })
  }
}
