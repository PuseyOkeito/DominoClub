import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, sessionId, hasPartner, partnerName } = body

    console.log("[v0] Join request received:", { name, sessionId, hasPartner, partnerName })

    // Validate required fields
    if (!name) {
      console.error("[v0] Missing required field: name")
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("[v0] Missing Supabase environment variables")
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase credentials" },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // Test connection first by checking if table exists
    const { error: tableError } = await supabase
      .from("players")
      .select("id")
      .limit(0)

    if (tableError) {
      console.error("[v0] Database table error:", tableError)
      return NextResponse.json(
        {
          error: `Database connection error: ${tableError.message}`,
          hint: tableError.hint || "Please ensure the 'players' table exists and RLS is disabled",
          details: tableError.details,
        },
        { status: 500 }
      )
    }

    // Check if we can connect to Supabase
    const { data: session1Players, error: countError } = await supabase
      .from("players")
      .select("id")
      .eq("session_id", "session-1")

    if (countError) {
      console.error("[v0] Error counting players:", countError)
      return NextResponse.json(
        {
          error: `Database query error: ${countError.message}`,
          hint: countError.hint,
          details: countError.details,
        },
        { status: 500 }
      )
    }

    const session1Count = session1Players?.length || 0
    const assignedSessionId = session1Count >= 28 ? "session-2" : "session-1"

    console.log("[v0] Assigning to session:", assignedSessionId, "Current count:", session1Count)

    const { data: player, error: insertError } = await supabase
      .from("players")
      .insert({
        name,
        session_id: assignedSessionId,
        has_partner: hasPartner || false,
        partner_name: partnerName || null,
        status: "waiting",
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting player:", insertError)
      return NextResponse.json(
        {
          error: `Failed to create player: ${insertError.message}`,
          hint: insertError.hint || "Check if RLS policies allow INSERT operations",
          details: insertError.details,
          code: insertError.code,
        },
        { status: 400 }
      )
    }

    console.log("[v0] Player created successfully:", player?.id)
    return NextResponse.json({ player })
  } catch (error: any) {
    console.error("[v0] Error in join API:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to join session. Please try again." },
      { status: 500 }
    )
  }
}
