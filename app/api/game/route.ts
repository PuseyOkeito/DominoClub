import { NextResponse } from "next/server"

// In-memory game state (in production, use a database)
const gameState = {
  started: false,
  startedAt: null as string | null,
}

export async function GET() {
  return NextResponse.json(gameState)
}

export async function POST(request: Request) {
  const body = await request.json()

  if (body.action === "start") {
    gameState.started = true
    gameState.startedAt = new Date().toISOString()
    return NextResponse.json({ success: true, gameState })
  }

  if (body.action === "reset") {
    gameState.started = false
    gameState.startedAt = null
    return NextResponse.json({ success: true, gameState })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
