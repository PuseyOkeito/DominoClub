"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Bell, Clock, Users, Lock, Trash2, UserPlus, RotateCcw } from "lucide-react"
import Image from "next/image"
import { startNextRound, type Player, type Team } from "@/lib/matchmaking"
import { createClient } from "@/lib/supabase/client"

const ADMIN_PASSWORD = "domino2024" // In production, use environment variables

type Session = {
  id: string
  name: string
  startTime: string
  maxPlayers: number
  players: Player[]
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(300)
  const [players, setPlayers] = useState<Player[]>([])
  const [waitlistTeams, setWaitlistTeams] = useState<Team[]>([])
  const [isMatchmaking, setIsMatchmaking] = useState(false)

  const [newSessionName, setNewSessionName] = useState("")
  const [newSessionTime, setNewSessionTime] = useState("")
  const [showAddSession, setShowAddSession] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editStartTime, setEditStartTime] = useState("")

  const router = useRouter()
  
  // Lazy initialize Supabase client only when authenticated and in browser
  const getSupabaseClient = () => {
    if (typeof window === 'undefined') {
      return null
    }
    try {
      // Check environment variables before creating client
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      console.log("[v0] Environment check:", {
        urlExists: !!url,
        urlLength: url?.length || 0,
        urlPrefix: url?.substring(0, 20) || 'MISSING',
        keyExists: !!key,
        keyLength: key?.length || 0,
        keyPrefix: key?.substring(0, 20) || 'MISSING',
      })
      
      if (!url || !key || url.includes('your-supabase-url') || key.includes('your-supabase-key')) {
        console.error("[v0] Environment variables not properly set:", {
          urlSet: !!url && !url.includes('your-supabase-url'),
          keySet: !!key && !key.includes('your-supabase-key'),
        })
        alert('Supabase configuration error. Please check environment variables in Vercel and redeploy.')
        return null
      }
      
      const client = createClient()
      console.log("[v0] Supabase client created successfully")
      return client
    } catch (error: any) {
      console.error("[v0] Supabase client creation failed:", error.message, error)
      alert(`Failed to connect to Supabase: ${error.message}`)
      return null
    }
  }

  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem("admin-authenticated")
    if (auth === "true") {
      setIsAuthenticated(true)
    }

    // Load sessions from database
    const loadSessions = async () => {
      try {
        const response = await fetch("/api/sessions")
        if (!response.ok) {
          console.error("[v0] Failed to load sessions from API")
          // Fallback to localStorage if API fails
          const savedSessions = localStorage.getItem("game-sessions")
          if (savedSessions) {
            const parsedSessions = JSON.parse(savedSessions)
            setSessions(parsedSessions)
          }
          return
        }
        const data = await response.json()
        if (data.sessions && data.sessions.length > 0) {
          const formattedSessions: Session[] = data.sessions.map((s: any) => ({
            id: s.id,
            name: s.name,
            startTime: s.start_time,
            maxPlayers: s.max_players,
            players: [],
          }))
          setSessions(formattedSessions)
          
          // Auto-select first session
          if (formattedSessions.length > 0 && !selectedSessionId) {
            console.log("[v0] Auto-selecting session:", formattedSessions[0].id)
            setSelectedSessionId(formattedSessions[0].id)
          }
        } else {
          // If no sessions exist, create default one
          const defaultSessions: Session[] = [
            { id: "session-1", name: "Evening Session 1", startTime: "6:00 PM", maxPlayers: 24, players: [] },
          ]
          setSessions(defaultSessions)
        }
      } catch (error) {
        console.error("[v0] Error loading sessions:", error)
        // Fallback to localStorage
        const savedSessions = localStorage.getItem("game-sessions")
        if (savedSessions) {
          const parsedSessions = JSON.parse(savedSessions)
          setSessions(parsedSessions)
        }
      }
    }
    
    loadSessions()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    const loadData = async () => {
      const supabase = getSupabaseClient()
      if (!supabase) {
        console.error("[v0] Cannot load data: Supabase client not available")
        return
      }
      
      console.log("[v0] Attempting to fetch players from Supabase...")
      
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: true })

      if (playersError) {
        console.error("[v0] Error loading players:", playersError)
        console.error("[v0] Error details:", {
          message: playersError.message,
          code: playersError.code,
          details: playersError.details,
          hint: playersError.hint,
        })
        return
      }
      
      console.log("[v0] Successfully fetched players:", playersData?.length || 0)

      if (playersData) {
        console.log("[v0] Loaded players from database:", playersData.length, "players")
        console.log("[v0] Sample player data:", playersData[0])
        console.log("[v0] Session IDs in database:", [...new Set(playersData.map((p: any) => p.session_id))])
        
        setPlayers(playersData)

        const session1Players = playersData.filter((p: any) => p.session_id === "session-1")
        const session2Players = playersData.filter((p: any) => p.session_id === "session-2")
        
        console.log("[v0] Session 1 players:", session1Players.length)
        console.log("[v0] Session 2 players:", session2Players.length)

        // Auto-create Session 2 if Session 1 is full (24 players = 6 tables × 4 players)
        if (session1Players.length >= 24 && session2Players.length > 0) {
          // Check if session-2 already exists in database
          const sessionsResponse = await fetch("/api/sessions")
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json()
            const hasSession2 = sessionsData.sessions?.some((s: any) => s.id === "session-2")

            if (!hasSession2) {
              // Create session-2 in database
              await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: "Evening Session 2",
                  startTime: "8:00 PM",
                  maxPlayers: 24,
                }),
              })
            }
          }
        }
      }

      // Load waitlist teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("status", "waitlist")

      if (teamsError) {
        console.error("[v0] Error loading waitlist:", teamsError)
        return
      }

      if (teamsData) {
        setWaitlistTeams(teamsData)
      }

      // Reload sessions from database
      const sessionsResponse = await fetch("/api/sessions")
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        if (sessionsData.sessions && sessionsData.sessions.length > 0) {
          const formattedSessions: Session[] = sessionsData.sessions.map((s: any) => ({
            id: s.id,
            name: s.name,
            startTime: s.start_time,
            maxPlayers: s.max_players,
            players: [],
          }))
          setSessions(formattedSessions)
        }
      }
    }

    loadData()

    const supabase = getSupabaseClient()
    if (!supabase) {
      console.error("[v0] Cannot set up realtime: Supabase client not available")
      return
    }

    const playersChannel = supabase
      .channel("admin-players")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        console.log("[v0] Players changed, reloading...")
        loadData()
      })
      .subscribe()

    const teamsChannel = supabase
      .channel("admin-teams")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => {
        console.log("[v0] Teams changed, reloading...")
        loadData()
      })
      .subscribe()

    const sessionsChannel = supabase
      .channel("admin-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        console.log("[v0] Sessions changed, reloading...")
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(teamsChannel)
      supabase.removeChannel(sessionsChannel)
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem("admin-authenticated", "true")
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  const handleAddSession = async () => {
    if (!newSessionName || !newSessionTime) {
      alert("Please fill in all fields")
      return
    }

    try {
      // Convert time format if needed (e.g., "18:00" to "6:00 PM")
      let formattedTime = newSessionTime
      if (newSessionTime.includes(":")) {
        const [hours, minutes] = newSessionTime.split(":")
        const hour24 = parseInt(hours)
        const hour12 = hour24 % 12 || 12
        const ampm = hour24 >= 12 ? "PM" : "AM"
        formattedTime = `${hour12}:${minutes} ${ampm}`
      }

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSessionName,
          startTime: formattedTime,
          maxPlayers: 24,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create session")
      }

      const data = await response.json()
      const newSession: Session = {
        id: data.session.id,
        name: data.session.name,
        startTime: data.session.start_time,
        maxPlayers: data.session.max_players,
        players: [],
      }

      setSessions([...sessions, newSession])
      setNewSessionName("")
      setNewSessionTime("")
      setShowAddSession(false)
    } catch (error) {
      console.error("[v0] Error creating session:", error)
      alert("Failed to create session. Please try again.")
    }
  }

  const handleUpdateStartTime = async (sessionId: string) => {
    if (!editStartTime) {
      alert("Please enter a start time")
      return
    }

    try {
      // Convert time format if needed
      let formattedTime = editStartTime
      if (editStartTime.includes(":") && !editStartTime.includes("PM") && !editStartTime.includes("AM")) {
        const [hours, minutes] = editStartTime.split(":")
        const hour24 = parseInt(hours)
        const hour12 = hour24 % 12 || 12
        const ampm = hour24 >= 12 ? "PM" : "AM"
        formattedTime = `${hour12}:${minutes} ${ampm}`
      }

      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          startTime: formattedTime,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update session")
      }

      const data = await response.json()
      
      // Update local state
      const updatedSessions = sessions.map((s) =>
        s.id === sessionId
          ? { ...s, startTime: data.session.start_time }
          : s
      )
      setSessions(updatedSessions)
      setEditingSessionId(null)
      setEditStartTime("")
    } catch (error) {
      console.error("[v0] Error updating session:", error)
      alert("Failed to update session. Please try again.")
    }
  }

  const handleEditClick = (session: Session) => {
    setEditingSessionId(session.id)
    // Convert "6:00 PM" format to "18:00" for time input
    const timeMatch = session.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (timeMatch) {
      let hour = parseInt(timeMatch[1])
      const minutes = timeMatch[2]
      const ampm = timeMatch[3].toUpperCase()
      if (ampm === "PM" && hour !== 12) hour += 12
      if (ampm === "AM" && hour === 12) hour = 0
      setEditStartTime(`${hour.toString().padStart(2, "0")}:${minutes}`)
    } else {
      setEditStartTime(session.startTime)
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        alert("Supabase client not available. Please check environment variables.")
        return
      }
      
      const { error } = await supabase.from("players").delete().eq("id", playerId)
      
      if (error) {
        console.error("[v0] Error removing player:", error)
        alert("Failed to remove player. Please try again.")
        return
      }
      
      // Update local state
      const updatedPlayers = players.filter((p) => p.id !== playerId)
      setPlayers(updatedPlayers)
    } catch (error) {
      console.error("[v0] Error removing player:", error)
      alert("Failed to remove player. Please try again.")
    }
  }

  const handleStartMatchmaking = async () => {
    if (!selectedSessionId) {
      alert("Please select a session first")
      return
    }
    
    const sessionPlayers = players.filter((p: any) => p.session_id === selectedSessionId)
    if (sessionPlayers.length < 4) {
      alert("Need at least 4 players to start matchmaking")
      return
    }

    setIsMatchmaking(true)

    try {
      const response = await fetch("/api/matchmake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId || "session-1" }),
      })

      if (!response.ok) {
        throw new Error("Matchmaking failed")
      }

      const result = await response.json()
      console.log("[v0] Matchmaking result:", result)
      console.log("[v0] Matchmaking details:", {
        teamsCreated: result.teamsCreated,
        tablesCreated: result.tablesCreated,
        waitlistTeams: result.waitlistTeams,
        unpairedPlayers: result.unpairedPlayers
      })

      if (!result.success) {
        throw new Error(result.error || "Matchmaking failed")
      }

      // Start the game
      const startGameResponse = await fetch("/api/start-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!startGameResponse.ok) {
        console.error("[v0] Failed to start game:", await startGameResponse.json())
      } else {
        console.log("[v0] ✅ Game started successfully")
      }

      // Reload players to see updated statuses
      const supabaseClient = createClient()
      const { data: updatedPlayers } = await supabaseClient
        .from("players")
        .select("*")
        .eq("session_id", selectedSessionId)
        .order("created_at", { ascending: true })
      
      if (updatedPlayers) {
        console.log("[v0] Players after matchmaking:", updatedPlayers.map(p => ({
          name: p.name,
          status: p.status,
          table_id: p.table_id
        })))
        setPlayers(updatedPlayers)
      }

      alert(`Matchmaking complete! ${result.teamsCreated} teams created, ${result.tablesCreated} tables assigned.`)
    } catch (error) {
      console.error("[v0] Error during matchmaking:", error)
      alert("Failed to start matchmaking. Please try again.")
    } finally {
      setIsMatchmaking(false)
    }
  }

  const handleNextRound = () => {
    if (waitlistTeams.length < 2) {
      alert("Need at least 2 teams on waitlist to start next round")
      return
    }

    setIsMatchmaking(true)
    startNextRound()

    setTimeout(() => {
      setIsMatchmaking(false)
      alert("Next round started! Teams have been assigned to tables.")
    }, 1500)
  }

  const startTimer = async () => {
    try {
      // Start timer in database (5 minutes = 300 seconds)
      const response = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: 300 }), // 5 minutes
      })

      if (!response.ok) {
        throw new Error("Failed to start timer")
      }

      setTimerActive(true)
      setTimeRemaining(300) // 5 minutes
      console.log("[v0] Timer started - notifying all participants")

      // Poll timer state every second
      const interval = setInterval(async () => {
        const timerResponse = await fetch("/api/timer")
        if (timerResponse.ok) {
          const timerData = await timerResponse.json()
          if (timerData.timer_active && timerData.time_remaining !== undefined) {
            setTimeRemaining(timerData.time_remaining)
            if (timerData.time_remaining <= 0) {
              clearInterval(interval)
              setTimerActive(false)
            }
          } else {
            clearInterval(interval)
            setTimerActive(false)
            setTimeRemaining(0)
          }
        }
      }, 1000)

      // Store interval ID to clear it if needed
      ;(window as any).timerInterval = interval
    } catch (error) {
      console.error("[v0] Error starting timer:", error)
      alert("Failed to start timer. Please try again.")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleResetSession = async () => {
    if (!selectedSessionId) {
      alert("Please select a session first")
      return
    }

    const sessionPlayers = players.filter((p: any) => p.session_id === selectedSessionId)
    const sessionName = sessions.find((s) => s.id === selectedSessionId)?.name || selectedSessionId

    // Confirmation dialog
    const confirmed = confirm(
      `Are you sure you want to reset "${sessionName}"?\n\nThis will:\n- Delete all ${sessionPlayers.length} players\n- Remove all teams and tables\n- This action cannot be undone!`
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch("/api/reset-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reset session")
      }

      const result = await response.json()
      console.log("[v0] Reset session result:", result)

      // Reload players and sessions
      const supabaseClient = createClient()
      const { data: playersData } = await supabaseClient.from("players").select("*").order("created_at", { ascending: true })
      if (playersData) {
        setPlayers(playersData)
      }

      // Reload waitlist
      const { data: teamsData } = await supabaseClient.from("teams").select("*").eq("status", "waitlist")
      if (teamsData) {
        setWaitlistTeams(teamsData)
      }

      // Reload sessions
      const sessionsResponse = await fetch("/api/sessions")
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        if (sessionsData.sessions && sessionsData.sessions.length > 0) {
          const formattedSessions: Session[] = sessionsData.sessions.map((s: any) => ({
            id: s.id,
            name: s.name,
            startTime: s.start_time,
            maxPlayers: s.max_players,
            players: [],
          }))
          setSessions(formattedSessions)
        }
      }

      alert(`Session reset successfully!\n\nDeleted:\n- ${result.playersDeleted} players\n- ${result.teamsDeleted} teams\n- ${result.tablesDeleted} tables`)
    } catch (error: any) {
      console.error("[v0] Error resetting session:", error)
      alert(`Failed to reset session: ${error.message || "Unknown error"}`)
    }
  }

  // Login screen
  if (!isAuthenticated) {
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

        <div className="relative z-10 w-full max-w-md">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-[#1a1a2e] border-8 border-[#F2F7F7] flex items-center justify-center shadow-lg z-10 overflow-hidden">
            <Lock className="w-12 h-12 text-[#F2F7F7]" />
          </div>

          <div
            className="bg-[#F2F7F7] rounded-2xl border-4 border-[#1a1a2e] p-8 pt-16 shadow-2xl relative overflow-hidden"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(26, 26, 46, 0.03) 2px, rgba(26, 26, 46, 0.03) 4px)",
            }}
          >
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-[#1a1a2e]">Admin Access</h2>
                <p className="text-[#6b7280] text-sm">Enter password to continue</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1a1a2e] font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError(false)
                  }}
                  className={`h-12 rounded-lg border-2 ${
                    passwordError ? "border-red-500" : "border-[#1a1a2e]"
                  } bg-white text-[#1a1a2e]`}
                  placeholder="Enter admin password"
                />
                {passwordError && <p className="text-sm text-red-500">Incorrect password. Please try again.</p>}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-base font-medium bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] shadow-md"
              >
                • Login •
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 bg-[#F2F7F7] hover:bg-[#e0e8e8] text-[#1a1a2e] rounded-2xl border-2 border-[#1a1a2e] font-medium"
                onClick={() => router.push("/waiting-room")}
              >
                Back to Waiting Room
              </Button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  // Admin dashboard
  return (
    <main
      className="relative min-h-screen p-4 md:p-8"
      style={{
        backgroundImage: "url('/frame-19.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1a1a2e] border-4 border-[#F2F7F7] flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Domino Social"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#F2F7F7]">Admin Dashboard</h1>
              <p className="text-[#F2F7F7]/80 text-sm">Manage games and sessions</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="bg-[#F2F7F7] hover:bg-[#e0e8e8] text-[#1a1a2e] border-2 border-[#1a1a2e] rounded-xl"
            onClick={() => {
              localStorage.removeItem("admin-authenticated")
              setIsAuthenticated(false)
            }}
          >
            Logout
          </Button>
        </div>

        <Card className="p-6 bg-[#F2F7F7] border-4 border-[#1a1a2e]">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-[#1a1a2e] text-lg font-semibold">Manage Sessions</Label>
              <Button
                size="sm"
                className="bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-xl"
                onClick={() => setShowAddSession(!showAddSession)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Session
              </Button>
            </div>

            {showAddSession && (
              <div className="bg-[#e0e8e8] p-4 rounded-xl space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-name" className="text-[#1a1a2e]">
                    Session Name
                  </Label>
                  <Input
                    id="session-name"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="e.g., Evening Session 3"
                    className="h-10 rounded-lg border-2 border-[#1a1a2e] bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-time" className="text-[#1a1a2e]">
                    Start Time
                  </Label>
                  <Input
                    id="session-time"
                    type="time"
                    value={newSessionTime}
                    onChange={(e) => setNewSessionTime(e.target.value)}
                    className="h-10 rounded-lg border-2 border-[#1a1a2e] bg-white"
                  />
                </div>
                <Button
                  className="w-full bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-xl"
                  onClick={handleAddSession}
                >
                  Create Session
                </Button>
              </div>
            )}

            <div className="grid gap-3">
              {sessions.map((session) => {
                const sessionPlayers = players.filter((p: any) => p.session_id === session.id)
                const isEditing = editingSessionId === session.id
                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border-2 border-[#1a1a2e] ${
                      selectedSessionId === session.id
                        ? "bg-[#1a1a2e] text-[#F2F7F7]"
                        : "bg-[#F2F7F7] text-[#1a1a2e]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <Button
                        variant="ghost"
                        className={`flex-1 h-auto p-0 justify-start text-left ${
                          selectedSessionId === session.id
                            ? "text-[#F2F7F7] hover:bg-[#2a2a3e]"
                            : "text-[#1a1a2e] hover:bg-[#e0e8e8]"
                        }`}
                        onClick={() => setSelectedSessionId(session.id)}
                      >
                        <div className="flex-1">
                          <div className="font-semibold">{session.name}</div>
                          <div className="text-sm opacity-80">
                            {isEditing ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Input
                                  type="time"
                                  value={editStartTime}
                                  onChange={(e) => setEditStartTime(e.target.value)}
                                  className={`h-8 w-32 ${
                                    selectedSessionId === session.id
                                      ? "bg-[#2a2a3e] text-[#F2F7F7] border-[#F2F7F7]"
                                      : "bg-white text-[#1a1a2e] border-[#1a1a2e]"
                                  }`}
                                />
                                <Button
                                  size="sm"
                                  className={`h-8 ${
                                    selectedSessionId === session.id
                                      ? "bg-[#F2F7F7] text-[#1a1a2e] hover:bg-[#e0e8e8]"
                                      : "bg-[#1a1a2e] text-[#F2F7F7] hover:bg-[#2a2a3e]"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpdateStartTime(session.id)
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingSessionId(null)
                                    setEditStartTime("")
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                Start: {session.startTime} • {sessionPlayers.length}/{session.maxPlayers} players
                              </>
                            )}
                          </div>
                        </div>
                      </Button>
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 ${
                            selectedSessionId === session.id
                              ? "text-[#F2F7F7] hover:bg-[#2a2a3e]"
                              : "text-[#1a1a2e] hover:bg-[#e0e8e8]"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditClick(session)
                          }}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {selectedSessionId && (() => {
          const sessionPlayers = players.filter((p: any) => p.session_id === selectedSessionId)
          console.log("[v0] Selected session:", selectedSessionId, "Filtered players:", sessionPlayers.length, "Total players:", players.length)
          return (
            <Card className="p-6 bg-[#F2F7F7] border-4 border-[#1a1a2e]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-[#e0e8e8] rounded-xl">
                    <Users className="w-6 h-6 text-[#1a1a2e]" />
                    <div>
                      <div className="text-sm text-[#6b7280]">Active Players</div>
                      <div className="text-2xl font-bold text-[#1a1a2e]">{sessionPlayers.length}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-[#e0e8e8] rounded-xl">
                    <Users className="w-6 h-6 text-[#1a1a2e]" />
                    <div>
                      <div className="text-sm text-[#6b7280]">Waitlist Teams</div>
                      <div className="text-2xl font-bold text-[#1a1a2e]">{waitlistTeams.length}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[#1a1a2e] text-lg font-semibold block">
                    Players in Session {selectedSessionId}
                    {sessionPlayers.length !== players.length && (
                      <span className="text-sm text-[#6b7280] ml-2">
                        (showing {sessionPlayers.length} of {players.length} total)
                      </span>
                    )}
                  </Label>
                  <div className="bg-white rounded-xl p-4 border-2 border-[#1a1a2e] max-h-64 overflow-y-auto">
                    {sessionPlayers.length === 0 ? (
                      <div className="text-sm text-[#6b7280] text-center py-4 space-y-2">
                        <p>No players in this session...</p>
                        {players.length > 0 && (
                          <p className="text-xs">(Total players in database: {players.length})</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessionPlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-3 bg-[#F2F7F7] rounded-lg border border-[#e0e8e8]"
                          >
                            <div>
                              <span className="text-sm font-medium text-[#1a1a2e]">{player.name}</span>
                              <span className="text-xs text-[#6b7280] ml-2">
                                (session: {player.session_id || 'none'})
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemovePlayer(player.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[#1a1a2e] text-lg font-semibold block">Game Controls</Label>

                  {isMatchmaking ? (
                    <div className="bg-[#1a1a2e] text-[#F2F7F7] p-4 rounded-xl text-center">
                      <p className="font-medium">Processing matchmaking...</p>
                    </div>
                  ) : waitlistTeams.length >= 2 ? (
                    <Button
                      size="lg"
                      className="w-full h-14 bg-[#8b1c1f] hover:bg-[#6b1c1f] text-[#F2F7F7] rounded-xl border-2 border-[#8b1c1f]"
                      onClick={handleNextRound}
                    >
                      • Start Next Round ({waitlistTeams.length} teams) •
                    </Button>
                  ) : sessionPlayers.length >= 4 ? (
                    <Button
                      size="lg"
                      className="w-full h-14 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-xl border-2 border-[#1a1a2e]"
                      onClick={handleStartMatchmaking}
                    >
                      • Start Matchmaking ({sessionPlayers.length} players) •
                    </Button>
                  ) : (
                    <div className="bg-[#e0e8e8] text-[#6b7280] p-4 rounded-xl text-center">
                      <p className="text-sm">Waiting for at least 4 players to start...</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-[#1a1a2e] text-lg font-semibold block">Game Timer</Label>

                  {timerActive ? (
                    <div className="text-center p-8 bg-[#e0e8e8] rounded-xl">
                      <Clock className="w-12 h-12 text-[#1a1a2e] mx-auto mb-4" />
                      <div className="text-5xl font-bold text-[#1a1a2e] mb-2">{formatTime(timeRemaining)}</div>
                      <p className="text-[#6b7280]">Game starting soon...</p>
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full h-14 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-xl border-2 border-[#1a1a2e]"
                      onClick={startTimer}
                    >
                      <Bell className="w-5 h-5 mr-2" />
                      Start Timer & Notify Participants
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-[#1a1a2e] text-lg font-semibold block">Session Management</Label>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="w-full h-14 bg-[#dc2626] hover:bg-[#b91c1c] text-[#F2F7F7] rounded-xl border-2 border-[#dc2626]"
                    onClick={handleResetSession}
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Reset Session ({sessionPlayers.length} players)
                  </Button>
                  <p className="text-xs text-[#6b7280] text-center">
                    This will delete all players, teams, and tables for this session
                  </p>
                </div>
              </div>
            </Card>
          )
        })()}

        <Button
          variant="outline"
          className="w-full h-12 bg-[#F2F7F7] hover:bg-[#e0e8e8] text-[#1a1a2e] rounded-2xl border-2 border-[#1a1a2e] font-medium"
          onClick={() => router.push("/waiting-room")}
        >
          Back to Waiting Room
        </Button>
      </div>
    </main>
  )
}
