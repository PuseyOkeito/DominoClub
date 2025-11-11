import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // First, clear all players who are still "waiting" (not assigned to tables)
    // This ensures the waiting room is fresh for new signups
    const { data: waitingPlayers, error: waitingPlayersError } = await supabase
      .from("players")
      .select("id")
      .eq("status", "waiting")
      .is("table_id", null)

    if (!waitingPlayersError && waitingPlayers && waitingPlayers.length > 0) {
      const waitingPlayerIds = waitingPlayers.map((p) => p.id)
      console.log(`[v0] Clearing ${waitingPlayerIds.length} waiting players before starting new game`)

      // Delete waiting players
      const { error: deleteError } = await supabase
        .from("players")
        .delete()
        .in("id", waitingPlayerIds)

      if (deleteError) {
        console.error("[v0] Error clearing waiting players:", deleteError)
        // Continue anyway - don't fail the game start
      } else {
        console.log(`[v0] ✅ Cleared ${waitingPlayerIds.length} waiting players`)
      }
    }

    // Reset game state to start fresh
    // Reset to false when clearing waiting players (new game cycle)
    const { error: resetError } = await supabase
      .from("game_state")
      .update({ started: false, updated_at: new Date().toISOString() })
      .eq("id", "current")

    if (resetError) {
      console.error("[v0] Error resetting game state:", resetError)
      // Continue anyway
    }

    // Now set started to true for the new game
    const { error } = await supabase
      .from("game_state")
      .update({ started: true, updated_at: new Date().toISOString() })
      .eq("id", "current")

    if (error) {
      console.error("[v0] Error starting game:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in start-game API:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("game_state").select("*").eq("id", "current").single()

    if (error) {
      console.error("[v0] Error getting game state:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in start-game GET API:", error)
    return NextResponse.json({ error: "Failed to get game state" }, { status: 500 })
  }
}
