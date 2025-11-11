"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Settings, Clock, X, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function WaitingRoom() {
  const [players, setPlayers] = useState<any[]>([])
  const [waitlistTeams, setWaitlistTeams] = useState<any[]>([])
  const [spotsFilled, setSpotsFilled] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [currentSession, setCurrentSession] = useState<string>("Session 1")
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showGameStartedBanner, setShowGameStartedBanner] = useState(false)
  const maxSpots = 24 // 6 tables × 4 players per session
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user has already viewed their table - if so, redirect them
    const checkIfTableViewed = async () => {
      const currentPlayerId = localStorage.getItem("current-player-id")
      if (!currentPlayerId) return

      const hasViewedTable = localStorage.getItem(`table-viewed-${currentPlayerId}`)
      if (hasViewedTable === "true") {
        // Check if they still have a table assigned
        const { data: playerData } = await supabase
          .from("players")
          .select("table_id")
          .eq("id", currentPlayerId)
          .single()

        if (playerData?.table_id) {
          // Get table number and redirect
          const { data: tableData } = await supabase
            .from("game_tables")
            .select("table_number")
            .eq("id", playerData.table_id)
            .single()

          if (tableData?.table_number) {
            console.log("[v0] User has already viewed table, redirecting to game page")
            router.push(`/game?entry=${tableData.table_number}`)
            return
          }
        }

        // Also check teams table as fallback
        const { data: teamData1 } = await supabase
          .from("teams")
          .select("table_number")
          .eq("player1_id", currentPlayerId)
          .maybeSingle()

        const { data: teamData2 } = await supabase
          .from("teams")
          .select("table_number")
          .eq("player2_id", currentPlayerId)
          .maybeSingle()

        const teamData = teamData1 || teamData2
        if (teamData?.table_number) {
          console.log("[v0] User has already viewed table, redirecting to game page")
          router.push(`/game?entry=${teamData.table_number}`)
        }
      }
    }

    checkIfTableViewed()
  }, [router, supabase])

  useEffect(() => {
    // Get current player ID - check localStorage first, then database
    const loadCurrentPlayer = async () => {
      // First check localStorage (set when player joins)
      const savedPlayerId = localStorage.getItem("current-player-id")
      if (savedPlayerId) {
        setCurrentPlayerId(savedPlayerId)
        console.log("[v0] Set current player ID from localStorage:", savedPlayerId)
        return
      }

      // Fallback: get most recent player from database
      const { data: recentPlayers } = await supabase
        .from("players")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)

      if (recentPlayers && recentPlayers.length > 0) {
        setCurrentPlayerId(recentPlayers[0].id)
        localStorage.setItem("current-player-id", recentPlayers[0].id)
        console.log("[v0] Set current player ID from database:", recentPlayers[0].id)
      } else {
        // Last fallback: localStorage session-players
        const savedPlayers = localStorage.getItem("session-players")
        if (savedPlayers) {
          const parsedPlayers = JSON.parse(savedPlayers)
          if (parsedPlayers.length > 0) {
            const playerId = parsedPlayers[parsedPlayers.length - 1].id
            setCurrentPlayerId(playerId)
            localStorage.setItem("current-player-id", playerId)
          }
        }
      }
    }

    const loadPlayers = async () => {
      const { data, error } = await supabase.from("players").select("*").order("created_at", { ascending: true })

      if (error) {
        console.error("[v0] Error loading players:", error)
        return
      }

      if (data) {
        setPlayers(data || [])

        // Determine session based on player count
        const session1Players = (data || []).filter((p: any) => p.session_id === "session-1")
        const session2Players = (data || []).filter((p: any) => p.session_id === "session-2")

        if (session2Players.length > 0) {
          setCurrentSession("Session 2")
          setSpotsFilled(session2Players.length)
        } else {
          setCurrentSession("Session 1")
          setSpotsFilled(session1Players.length)
        }
      } else {
        // Handle case when data is null/undefined (0 players)
        setPlayers([])
        setCurrentSession("Session 1")
        setSpotsFilled(0)
      }
    }

    loadCurrentPlayer()

    const loadWaitlist = async () => {
      const { data, error } = await supabase.from("teams").select("*").eq("status", "waitlist")

      if (error) {
        console.error("[v0] Error loading waitlist:", error)
        return
      }

      if (data) {
        setWaitlistTeams(data || [])
      } else {
        setWaitlistTeams([])
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
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, async () => {
        console.log("[v0] Teams changed, reloading...")
        loadWaitlist()
        // Check if current player's team was updated
        if (currentPlayerId) {
          const { data: teamData1 } = await supabase
            .from("teams")
            .select("table_number")
            .eq("player1_id", currentPlayerId)
            .maybeSingle()

          const { data: teamData2 } = await supabase
            .from("teams")
            .select("table_number")
            .eq("player2_id", currentPlayerId)
            .maybeSingle()

          const teamData = teamData1 || teamData2

          if (teamData && teamData.table_number) {
            console.log("[v0] Player assigned to table via realtime:", teamData.table_number)
            setTableNumber(teamData.table_number)
            
            // Check if user has already viewed their table - don't show banner if they have
            const hasViewedTable = localStorage.getItem(`table-viewed-${currentPlayerId}`)
            if (!gameStarted && hasViewedTable !== "true") {
              setGameStarted(true)
              setShowGameStartedBanner(true)
            } else {
              setGameStarted(true)
            }
          }
        }
      })
      .subscribe()

    const gameStateChannel = supabase
      .channel("game-state-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, async (payload) => {
        console.log("[v0] Game state changed:", payload)
        if (payload.new && (payload.new as any).started) {
          setGameStarted(true)
          
          if (currentPlayerId) {
            // Check if player has a table assigned before showing banner
            const { data: teamData1 } = await supabase
              .from("teams")
              .select("table_number")
              .eq("player1_id", currentPlayerId)
              .maybeSingle()

            const { data: teamData2 } = await supabase
              .from("teams")
              .select("table_number")
              .eq("player2_id", currentPlayerId)
              .maybeSingle()

            const teamData = teamData1 || teamData2

            if (teamData && teamData.table_number) {
              console.log("[v0] Player assigned to table via game state change:", teamData.table_number)
              setTableNumber(teamData.table_number)
              
              // Only show banner if player has table assigned
              const hasViewedTable = localStorage.getItem(`table-viewed-${currentPlayerId}`)
              if (hasViewedTable !== "true") {
                setShowGameStartedBanner(true)
              }
            } else {
              // Player doesn't have table yet - don't show banner
              console.log("[v0] Game started but player not assigned to table yet")
              setShowGameStartedBanner(false)
            }
          } else {
            // No current player ID - don't show banner
            setShowGameStartedBanner(false)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(teamsChannel)
      supabase.removeChannel(gameStateChannel)
    }
  }, [currentPlayerId, supabase, gameStarted])

  useEffect(() => {
    if (!currentPlayerId) {
      console.log("[v0] No currentPlayerId, skipping table assignment check")
      return
    }

    const checkPlayerTableAssignment = async () => {
      try {
        if (!currentPlayerId) {
          console.log("[v0] No currentPlayerId for table check")
          return
        }

        // First check player status and table_id directly
        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("id, status, table_id, session_id")
          .eq("id", currentPlayerId)
          .single()

        if (playerError) {
          console.error("[v0] Error checking player:", playerError)
          return
        }

        console.log("[v0] Player data:", { 
          id: playerData?.id, 
          status: playerData?.status, 
          table_id: playerData?.table_id,
          session_id: playerData?.session_id
        })

        // If player has table_id, get the table number from game_tables
        if (playerData && playerData.table_id) {
          const { data: tableData, error: tableError } = await supabase
            .from("game_tables")
            .select("table_number")
            .eq("id", playerData.table_id)
            .single()

          if (!tableError && tableData && tableData.table_number) {
            console.log("[v0] ✅ Player has table_id, found table number:", tableData.table_number)
            setTableNumber(tableData.table_number)
            
            // Check if user has already viewed their table - don't show banner if they have
            const hasViewedTable = localStorage.getItem(`table-viewed-${currentPlayerId}`)
            if (!gameStarted && hasViewedTable !== "true") {
              setGameStarted(true)
              setShowGameStartedBanner(true)
            } else if (gameStarted && hasViewedTable === "true") {
              // User has viewed table, don't show banner
              setGameStarted(true)
            } else {
              setGameStarted(true)
            }
            return
          }
        }

        // Check teams table for table_number (more reliable)
        // Use separate queries instead of .or() to avoid 406 errors
        const { data: teamData1 } = await supabase
          .from("teams")
          .select("table_number, status")
          .eq("player1_id", currentPlayerId)
          .maybeSingle()

        const { data: teamData2 } = await supabase
          .from("teams")
          .select("table_number, status")
          .eq("player2_id", currentPlayerId)
          .maybeSingle()

        const teamData = teamData1 || teamData2

        if (!teamData) {
          // No team found yet, that's okay - only log if game started
          if (gameStarted) {
            console.log("[v0] ⚠️ Game started but no team found for player:", currentPlayerId)
          }
          return
        }

        if (teamData && teamData.table_number) {
          console.log("[v0] ✅ Player assigned to table via teams table:", teamData.table_number, "Team status:", teamData.status)
          setTableNumber(teamData.table_number)
          
          // Check if user has already viewed their table - don't show banner if they have
          const hasViewedTable = localStorage.getItem(`table-viewed-${currentPlayerId}`)
          if (!gameStarted && hasViewedTable !== "true") {
            setGameStarted(true)
            setShowGameStartedBanner(true)
          } else if (gameStarted && hasViewedTable === "true") {
            // User has viewed table, don't show banner
            setGameStarted(true)
          } else {
            setGameStarted(true)
          }
        } else if (teamData && !teamData.table_number && gameStarted) {
          console.log("[v0] ⚠️ Team found but no table_number assigned yet. Team status:", teamData.status)
        }
      } catch (error) {
        console.error("[v0] Failed to check player assignment:", error)
      }
    }

    const pollGameState = async () => {
      try {
        // Use the database game_state endpoint, not the in-memory one
        const response = await fetch("/api/start-game")
        const data = await response.json()

        console.log("[v0] Game state poll:", data)

        if (data.started) {
          const wasGameStarted = gameStarted
          
          // Always check player assignment first
          await checkPlayerTableAssignment()
          
          // Only show banner if player actually has a table assigned
          if (!wasGameStarted && tableNumber) {
            console.log("[v0] 🎮 Game started! Player has table assigned:", tableNumber)
            setGameStarted(true)
            
            // Check if user has already viewed their table - don't show banner if they have
            const hasViewedTable = currentPlayerId ? localStorage.getItem(`table-viewed-${currentPlayerId}`) : null
            if (hasViewedTable !== "true") {
              setShowGameStartedBanner(true)
            }
          } else if (!wasGameStarted && !tableNumber) {
            // Game is started but player doesn't have a table yet - don't show banner
            console.log("[v0] 🎮 Game started but player not assigned to table yet")
            setGameStarted(true)
            setShowGameStartedBanner(false)
          } else if (wasGameStarted && tableNumber && !showGameStartedBanner) {
            // Player just got assigned a table
            const hasViewedTable = currentPlayerId ? localStorage.getItem(`table-viewed-${currentPlayerId}`) : null
            if (hasViewedTable !== "true") {
              setShowGameStartedBanner(true)
            }
          }
          
          // If game just started, check more aggressively
          if (!wasGameStarted) {
            // Check immediately and then every 2 seconds for the first 20 seconds
            let checks = 0
            const aggressiveCheck = setInterval(async () => {
              checks++
              await checkPlayerTableAssignment()
              // Show banner if table is assigned
              if (tableNumber && !showGameStartedBanner) {
                const hasViewedTable = currentPlayerId ? localStorage.getItem(`table-viewed-${currentPlayerId}`) : null
                if (hasViewedTable !== "true") {
                  setShowGameStartedBanner(true)
                }
              }
              if (checks >= 10 || tableNumber) {
                clearInterval(aggressiveCheck)
              }
            }, 2000)
          }
        } else {
          // Game was reset - clear waiting room state for new game
          if (gameStarted) {
            console.log("[v0] 🔄 Game reset detected - clearing waiting room state")
            setGameStarted(false)
            setShowGameStartedBanner(false)
            setTableNumber(null)
            // Reload players to show fresh waiting room
            const reloadPlayers = async () => {
              const { data, error } = await supabase.from("players").select("*").order("created_at", { ascending: true })
              if (!error) {
                setPlayers(data || [])
                const session1Players = (data || []).filter((p: any) => p.session_id === "session-1")
                const session2Players = (data || []).filter((p: any) => p.session_id === "session-2")
                if (session2Players.length > 0) {
                  setCurrentSession("Session 2")
                  setSpotsFilled(session2Players.length)
                } else {
                  setCurrentSession("Session 1")
                  setSpotsFilled(session1Players.length)
                }
              }
            }
            reloadPlayers()
          }
        }
      } catch (error) {
        console.error("[v0] Failed to poll game state:", error)
      }
    }

    // Poll immediately, then every 3 seconds (reduced frequency)
    pollGameState()
    const pollInterval = setInterval(pollGameState, 3000)
    
    // Also check player assignment every 3 seconds (reduced frequency)
    checkPlayerTableAssignment()
    const checkInterval = setInterval(checkPlayerTableAssignment, 3000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(checkInterval)
    }
  }, [gameStarted, currentPlayerId, supabase])

  useEffect(() => {
    // Poll timer state
    const pollTimer = async () => {
      try {
        const response = await fetch("/api/timer")
        if (response.ok) {
          const data = await response.json()
          if (data.timer_active && data.time_remaining !== undefined) {
            setTimerActive(true)
            setTimeRemaining(data.time_remaining)
          } else {
            setTimerActive(false)
            setTimeRemaining(0)
          }
        }
      } catch (error) {
        console.error("[v0] Error polling timer:", error)
      }
    }

    // Poll immediately, then every 3 seconds (reduced frequency)
    pollTimer()
    const timerInterval = setInterval(pollTimer, 3000)

    return () => clearInterval(timerInterval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const progressPercentage = (spotsFilled / maxSpots) * 100

  const handleSeeTable = () => {
    console.log("[v0] 🔘 Button clicked! handleSeeTable called")
    console.log("[v0] Current state:", { 
      gameStarted, 
      tableNumber, 
      currentPlayerId,
      buttonDisabled: !gameStarted || !tableNumber 
    })
    
    if (tableNumber && currentPlayerId) {
      // Mark that user has viewed their table
      localStorage.setItem(`table-viewed-${currentPlayerId}`, "true")
      console.log("[v0] ✅ Navigating to game with table number:", tableNumber)
      router.push(`/game?entry=${tableNumber}`)
    } else {
      console.log("[v0] ❌ Cannot navigate - tableNumber is null/undefined")
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
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

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
            {timerActive && (
              <div className="bg-[#1a1a2e] text-[#F2F7F7] rounded-xl p-6 border-2 border-[#1a1a2e]">
                <div className="text-center space-y-2">
                  <Clock className="w-8 h-8 mx-auto" />
                  <p className="text-sm opacity-90">Game Starting In</p>
                  <div className="text-4xl font-bold">{formatTime(timeRemaining)}</div>
                </div>
              </div>
            )}

            {/* Game Started Banner - Above spots filled */}
            {showGameStartedBanner && (
              <div className="bg-green-600 text-white rounded-xl p-3 border-2 border-green-500 shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-5 duration-300">
                <div className="flex items-center gap-2 flex-1">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">🎮 Game Started!</p>
                    <p className="text-xs opacity-95 mt-0.5">Click "See Your Table" below to join</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGameStartedBanner(false)}
                  className="flex-shrink-0 hover:bg-green-700 rounded-full p-1 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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

            <div className="space-y-3">
              <Button
                size="lg"
                disabled={!gameStarted || !tableNumber}
                className="w-full h-14 text-base font-medium bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] shadow-md disabled:opacity-50 disabled:cursor-not-allowed relative z-50"
                onClick={handleSeeTable}
              >
                • See Your Table •
              </Button>
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                  Debug: gameStarted={gameStarted ? 'true' : 'false'}, tableNumber={tableNumber || 'null'}
                </div>
              )}

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
