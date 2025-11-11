"use client"
import { CheckInForm } from "@/components/checkin-form"
import { Settings } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check for bypass parameter (e.g., ?new=true)
    const forceNew = searchParams.get("new") === "true"
    if (forceNew) {
      console.log("[v0] Force new signup requested, clearing localStorage")
      localStorage.removeItem("current-player-id")
      localStorage.removeItem("session-players")
      setIsChecking(false)
      return
    }

    const checkExistingPlayer = async () => {
      const currentPlayerId = localStorage.getItem("current-player-id")
      if (!currentPlayerId) {
        setIsChecking(false)
        return
      }

      // Verify player exists in database before redirecting
      try {
        const supabase = createClient()
        const { data: playerData, error } = await supabase
          .from("players")
          .select("id")
          .eq("id", currentPlayerId)
          .single()

        if (!error && playerData) {
          // Player exists, redirect to waiting room
          console.log("[v0] Player exists, redirecting to waiting room")
          router.push("/waiting-room")
        } else {
          // Player doesn't exist in database, clear localStorage
          console.log("[v0] Player not found in database, clearing localStorage")
          localStorage.removeItem("current-player-id")
          localStorage.removeItem("session-players")
          setIsChecking(false)
        }
      } catch (error) {
        console.error("[v0] Error checking player:", error)
        setIsChecking(false)
      }
    }

    checkExistingPlayer()
  }, [router, searchParams])

  // Show loading state while checking
  if (isChecking) {
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
        <div className="relative z-10 text-[#F2F7F7] text-xl">Loading...</div>
      </main>
    )
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
      {/* Dark overlay for better card contrast */}
      <div className="absolute inset-0 bg-black/20" />

      <button
        onClick={() => router.push("/admin")}
        className="absolute top-6 right-6 z-20 w-12 h-12 rounded-full bg-[#1a1a2e] border-2 border-[#F2F7F7] flex items-center justify-center hover:bg-[#2a2a3e] transition-colors shadow-lg"
        aria-label="Admin Settings"
      >
        <Settings className="w-6 h-6 text-[#F2F7F7]" />
      </button>

      {/* Clear session button - appears if player exists */}
      {!isChecking && localStorage.getItem("current-player-id") && (
        <button
          onClick={() => {
            localStorage.removeItem("current-player-id")
            localStorage.removeItem("session-players")
            window.location.reload()
          }}
          className="absolute top-6 left-6 z-20 px-4 py-2 rounded-lg bg-[#8b1c1f] text-[#F2F7F7] text-sm font-medium hover:bg-[#6b1c1f] transition-colors shadow-lg"
        >
          New Signup
        </button>
      )}

      <div className="relative z-10">
        <CheckInForm />
      </div>
    </main>
  )
}
