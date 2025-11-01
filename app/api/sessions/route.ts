import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching sessions:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error("[v0] Error in sessions GET API:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, startTime, maxPlayers } = body

    if (!name || !startTime) {
      return NextResponse.json(
        { error: "Name and start time are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const sessionId = `session-${Date.now()}`

    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        id: sessionId,
        name,
        start_time: startTime,
        max_players: maxPlayers || 24,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating session:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("[v0] Error in sessions POST API:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, name, startTime, maxPlayers } = body

    if (!id) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (startTime !== undefined) updateData.start_time = startTime
    if (maxPlayers !== undefined) updateData.max_players = maxPlayers

    const { data: session, error } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating session:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("[v0] Error in sessions PUT API:", error)
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

