"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function WaitingRoom() {
  const [players, setPlayers] = useState<any[]>([])
  const [waitlistTeams, setWaitlistTeams] = useState<any[]>([])
  const [spotsFilled, setSpotsFilled] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [currentSession, setCurrentSession] = useState<string>("Session 1")
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const maxSpots = 28
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const savedPlayers = localStorage.getItem("session-players")
    if (savedPlayers) {
      const parsedPlayers = JSON.parse(savedPlayers)
      if (parsedPlayers.length > 0) {
        setCurrentPlayerId(parsedPlayers[parsedPlayers.length - 1].id)
      }
    }

    const loadPlayers = async () => {
      const { data, error } = await supabase.from("players").select("*").order("created_at", { ascending: true })

      if (error) {
        console.error("[v0] Error loading players:", error)
        return
      }

      if (data) {
        setPlayers(data)

        // Determine session based on player count
        const session1Players = data.filter((p: any) => p.session_id === "session-1")
        const session2Players = data.filter((p: any) => p.session_id === "session-2")

        if (session2Players.length > 0) {
          setCurrentSession("Session 2")
          setSpotsFilled(session2Players.length)
        } else {
          setCurrentSession("Session 1")
          setSpotsFilled(session1Players.length)
        }
      }
    }

    const loadWaitlist = async () => {
      const { data, error } = await supabase.from("teams").select("*").eq("status", "waitlist")

      if (error) {
        console.error("[v0] Error loading waitlist:", error)
        return
      }

      if (data) {
        setWaitlistTeams(data)
      }
    }

    loadPlayers()
    loadWaitlist()

    const playersChannel = supabase
      .channel("players-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        console.log("[v0] Players changed, reloading...")
        loadPlayers()
      })
      .subscribe()

    const teamsChannel = supabase
      .channel("teams-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => {
        console.log("[v0] Teams changed, reloading...")
        loadWaitlist()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(teamsChannel)
    }
  }, [])

  useEffect(() => {
    const pollGameState = async () => {
      try {
        const response = await fetch("/api/game")
        const data = await response.json()

        if (data.started && !gameStarted) {
          console.log("[v0] Game started!")
          setGameStarted(true)

          if (currentPlayerId) {
            const { data: playerData, error } = await supabase
              .from("players")
              .select("*, teams!inner(table_number)")
              .eq("id", currentPlayerId)
              .single()

            if (playerData && playerData.teams?.table_number) {
              setTableNumber(playerData.teams.table_number)
              console.log("[v0] Player assigned to table:", playerData.teams.table_number)
            }
          }

          alert('The game has started! Click "See Your Table" to join.')
        }
      } catch (error) {
        console.error("[v0] Failed to poll game state:", error)
      }
    }

    const pollInterval = setInterval(pollGameState, 3000)
    return () => clearInterval(pollInterval)
  }, [gameStarted, currentPlayerId])

  const progressPercentage = (spotsFilled / maxSpots) * 100

  const handleSeeTable = () => {
    if (tableNumber) {
      router.push(`/game?entry=${tableNumber}`)
    }
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/frame-19.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/20" />

      <button
        onClick={() => router.push("/admin")}
        className="absolute top-6 right-6 z-20 w-12 h-12 rounded-full bg-[#1a1a2e] border-2 border-[#F2F7F7] flex items-center justify-center hover:bg-[#2a2a3e] transition-colors shadow-lg"
        aria-label="Admin Settings"
      >
        <Settings className="w-6 h-6 text-[#F2F7F7]" />
      </button>

      <div className="relative z-10 w-full max-w-md pt-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-[#1a1a2e] border-8 border-[#F2F7F7] flex items-center justify-center shadow-lg overflow-hidden">
          <Image src="/logo.png" alt="Domino Social" width={96} height={96} className="w-full h-full object-cover" />
        </div>

        <div
          className="bg-[#F2F7F7] rounded-2xl border-4 border-[#1a1a2e] shadow-2xl relative overflow-hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(26, 26, 46, 0.03) 2px, rgba(26, 26, 46, 0.03) 4px)",
          }}
        >
          <div className="bg-[#1a1a2e] text-[#F2F7F7] p-6 rounded-t-xl text-center border-b-4 border-[#1a1a2e]">
            <h1 className="text-2xl font-bold mb-2">Waiting Room</h1>
            <p className="text-base opacity-90">Waiting for admin to start the game</p>
            <p className="text-sm opacity-75 mt-2">You're in {currentSession}</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-white rounded-xl p-6 border-2 border-[#1a1a2e]">
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-[#1a1a2e]">
                  {spotsFilled}
                  <span className="text-3xl text-[#6b7280]">/{maxSpots}</span>
                </div>
                <p className="text-sm text-[#6b7280]">spots filled</p>

                <div className="w-full h-3 bg-[#e0e8e8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a1a2e] transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {waitlistTeams.length > 0 && (
              <div className="bg-white rounded-xl p-4 border-2 border-[#1a1a2e]">
                <h3 className="text-sm font-medium text-[#1a1a2e] mb-3">Waitlist ({waitlistTeams.length} teams)</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {waitlistTeams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-2 bg-[#F2F7F7] rounded-lg border border-[#e0e8e8]"
                    >
                      <span className="text-sm font-medium text-[#1a1a2e]">
                        {team.player1_name} & {team.player2_name}
                      </span>
                      <span className="text-xs bg-[#8b1c1f] text-[#F2F7F7] px-2 py-1 rounded-full">
                        {team.wins}W - {team.losses}L
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-4 border-2 border-[#1a1a2e] max-h-64 overflow-y-auto">
              <h3 className="text-sm font-medium text-[#1a1a2e] mb-3">Players Joined</h3>
              <div className="space-y-2">
                {players.length === 0 ? (
                  <p className="text-sm text-[#6b7280] text-center py-4">No players yet...</p>
                ) : (
                  players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 bg-[#F2F7F7] rounded-lg border border-[#e0e8e8]"
                    >
                      <span className="text-sm font-medium text-[#1a1a2e]">{player.name}</span>
                      {player.has_partner && (
                        <span className="text-xs bg-[#1a1a2e] text-[#F2F7F7] px-2 py-1 rounded-full">Partnered</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                size="lg"
                disabled={!gameStarted || !tableNumber}
                className="w-full h-14 text-base font-medium bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSeeTable}
              >
                • See Your Table •
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 bg-[#F2F7F7] hover:bg-[#e0e8e8] text-[#1a1a2e] rounded-2xl border-2 border-[#1a1a2e] font-medium"
                onClick={() => router.push("/rules")}
              >
                Rules & Tips
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
