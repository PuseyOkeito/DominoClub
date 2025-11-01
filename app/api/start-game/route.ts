import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

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
