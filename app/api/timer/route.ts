import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { duration } = await req.json() // duration in seconds

    if (!duration || duration <= 0) {
      return NextResponse.json({ error: "Duration is required and must be positive" }, { status: 400 })
    }

    const supabase = await createClient()

    // Calculate end time
    const endTime = new Date()
    endTime.setSeconds(endTime.getSeconds() + duration)

    const { error } = await supabase
      .from("game_state")
      .update({
        timer_active: true,
        timer_end_time: endTime.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", "current")

    if (error) {
      console.error("[v0] Error starting timer:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      timer_active: true,
      timer_end_time: endTime.toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in timer API:", error)
    return NextResponse.json({ error: "Failed to start timer" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("game_state")
      .select("timer_active, timer_end_time")
      .eq("id", "current")
      .maybeSingle()

    // If no row found or error, return inactive timer
    if (error || !data) {
      return NextResponse.json({ 
        timer_active: false, 
        timer_end_time: null,
        time_remaining: 0
      })
    }

    // Calculate remaining time
    let timeRemaining = 0
    if (data.timer_active && data.timer_end_time) {
      const endTime = new Date(data.timer_end_time)
      const now = new Date()
      timeRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000))
      
      // If timer expired, update database
      if (timeRemaining === 0 && data.timer_active) {
        await supabase
          .from("game_state")
          .update({ timer_active: false, timer_end_time: null })
          .eq("id", "current")
      }
    }

    return NextResponse.json({
      timer_active: data.timer_active && timeRemaining > 0,
      timer_end_time: data.timer_end_time,
      time_remaining: timeRemaining,
    })
  } catch (error) {
    console.error("[v0] Error in timer GET API:", error)
    // Return inactive timer on error instead of 500
    return NextResponse.json({ 
      timer_active: false, 
      timer_end_time: null,
      time_remaining: 0
    })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("game_state")
      .update({
        timer_active: false,
        timer_end_time: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "current")

    if (error) {
      console.error("[v0] Error stopping timer:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in timer DELETE API:", error)
    return NextResponse.json({ error: "Failed to stop timer" }, { status: 500 })
  }
}

