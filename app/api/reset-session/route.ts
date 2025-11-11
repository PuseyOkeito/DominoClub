import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    console.log(`[v0] Resetting session: ${sessionId}`)

    // Step 1: Get all players for this session
    const { data: sessionPlayers, error: playersFetchError } = await supabase
      .from("players")
      .select("id")
      .eq("session_id", sessionId)

    if (playersFetchError) {
      console.error("[v0] Error fetching session players:", playersFetchError)
      return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 })
    }

    if (!sessionPlayers || sessionPlayers.length === 0) {
      console.log(`[v0] No players found in session ${sessionId}, nothing to reset`)
      return NextResponse.json({ 
        success: true, 
        message: "Session already empty",
        playersDeleted: 0,
        teamsDeleted: 0,
        tablesDeleted: 0
      })
    }

    const playerIds = sessionPlayers.map((p) => p.id)
    console.log(`[v0] Found ${playerIds.length} players to delete`)

    // Step 2: Find all teams that reference these players
    const { data: teams, error: teamsFetchError } = await supabase
      .from("teams")
      .select("id")
      .or(`player1_id.in.(${playerIds.join(",")}),player2_id.in.(${playerIds.join(",")})`)

    if (teamsFetchError) {
      console.error("[v0] Error fetching teams:", teamsFetchError)
      // Continue anyway - might not have teams
    }

    let teamIds: string[] = []
    if (teams && teams.length > 0) {
      teamIds = teams.map((t) => t.id)
      console.log(`[v0] Found ${teamIds.length} teams to delete`)

      // Step 3: Delete game_tables that reference these teams
      if (teamIds.length > 0) {
        const { error: tablesDeleteError } = await supabase
          .from("game_tables")
          .delete()
          .or(`team1_id.in.(${teamIds.join(",")}),team2_id.in.(${teamIds.join(",")})`)

        if (tablesDeleteError) {
          console.error("[v0] Error deleting game_tables:", tablesDeleteError)
        } else {
          console.log(`[v0] Deleted game_tables for session ${sessionId}`)
        }
      }

      // Step 4: Delete the teams
      const { error: teamsDeleteError } = await supabase
        .from("teams")
        .delete()
        .in("id", teamIds)

      if (teamsDeleteError) {
        console.error("[v0] Error deleting teams:", teamsDeleteError)
      } else {
        console.log(`[v0] Deleted ${teamIds.length} teams`)
      }
    }

    // Step 5: Delete all players in the session
    const { error: playersDeleteError } = await supabase
      .from("players")
      .delete()
      .eq("session_id", sessionId)

    if (playersDeleteError) {
      console.error("[v0] Error deleting players:", playersDeleteError)
      return NextResponse.json({ error: "Failed to delete players" }, { status: 500 })
    }

    console.log(`[v0] Successfully reset session ${sessionId}`)

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} reset successfully`,
      playersDeleted: playerIds.length,
      teamsDeleted: teamIds.length,
      tablesDeleted: teamIds.length > 0 ? "multiple" : 0,
    })
  } catch (error) {
    console.error("[v0] Error in reset-session API:", error)
    return NextResponse.json(
      { error: "Failed to reset session", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

