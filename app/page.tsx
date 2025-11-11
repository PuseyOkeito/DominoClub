"use client"
import { CheckInForm } from "@/components/checkin-form"
import { Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if player has already signed up
    const currentPlayerId = localStorage.getItem("current-player-id")
    if (currentPlayerId) {
      // Player already exists, redirect to waiting room
      console.log("[v0] Player already signed up, redirecting to waiting room")
      router.push("/waiting-room")
    }
  }, [router])

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

      <div className="relative z-10">
        <CheckInForm />
      </div>
    </main>
  )
}
