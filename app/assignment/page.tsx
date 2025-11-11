"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import { loadMatchmakingResults, getPlayerAssignment } from "@/lib/matchmaking"

interface Assignment {
  playerName: string
  partnerName: string
  tableNumber: number
  entryNumber: number
}

export default function AssignmentPage() {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const router = useRouter()

  useEffect(() => {
    const { players, teams, tables } = loadMatchmakingResults()
    
    console.log("[v0] Assignment page - matchmaking results:", { 
      players: players.length, 
      teams: teams.length, 
      tables: tables.length 
    })

    if (players.length > 0 && teams.length > 0 && tables.length > 0) {
      // Get the current user's player ID from localStorage
      const checkinState = localStorage.getItem("checkin-state")
      if (checkinState) {
        const state = JSON.parse(checkinState)
        const entryNumber = state.entryNumber

        // Find the player by entry number (or use first player for demo)
        const currentPlayer = players[0] // In production, match by actual user ID

        if (currentPlayer) {
          const playerAssignment = getPlayerAssignment(currentPlayer.id, players, teams, tables)

          if (playerAssignment) {
            setAssignment({
              playerName: playerAssignment.playerName,
              partnerName: playerAssignment.partnerName,
              tableNumber: playerAssignment.tableNumber,
              entryNumber: entryNumber || Math.floor(Math.random() * 20) + 10,
            })
          }
        }
      }
    } else {
      // Mock assignment for demo if no matchmaking data
      setAssignment({
        playerName: "You",
        partnerName: "Alex Johnson",
        tableNumber: 3,
        entryNumber: Math.floor(Math.random() * 20) + 10,
      })
    }
  }, [])

  const handleViewTable = () => {
    console.log("[v0] 🔘 Assignment page - Button clicked! handleViewTable called")
    console.log("[v0] Assignment data:", assignment)
    
    if (assignment) {
      console.log("[v0] ✅ Navigating to game with entry number:", assignment.entryNumber)
      router.push(`/game?entry=${assignment.entryNumber}`)
    } else {
      console.log("[v0] ❌ Cannot navigate - assignment is null")
    }
  }

  const handleBack = () => {
    if (assignment) {
      router.push(`/game?entry=${assignment.entryNumber}`)
    }
  }

  if (!assignment) {
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
        <div className="relative z-10 text-[#F2F7F7] text-xl">Loading assignment...</div>
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
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-[#1a1a2e] border-8 border-[#F2F7F7] flex items-center justify-center shadow-lg z-10 overflow-hidden">
          <Image src="/logo.png" alt="Domino Social" width={96} height={96} className="w-full h-full object-cover" />
        </div>

        <div
          className="bg-[#F2F7F7] rounded-2xl border-4 border-[#1a1a2e] p-8 pt-16 shadow-2xl relative overflow-hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(26, 26, 46, 0.03) 2px, rgba(26, 26, 46, 0.03) 4px)",
          }}
        >
          <div className="space-y-6 relative z-10">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-[#1a1a2e]">You're all set!</h2>
              <p className="text-[#6b7280] text-sm">Here's your table assignment</p>
            </div>

            {/* Table Assignment Card */}
            <div className="bg-white rounded-xl p-6 border-2 border-[#1a1a2e] space-y-4">
              <div className="text-center">
                <div className="text-sm text-[#6b7280] mb-1">Table Number</div>
                <div className="text-6xl font-bold text-[#1a1a2e]">{assignment.tableNumber}</div>
              </div>

              <div className="border-t-2 border-[#e0e8e8] pt-4">
                <div className="text-sm text-[#6b7280] mb-2">Your Partner</div>
                <div className="text-2xl font-bold text-[#1a1a2e]">{assignment.partnerName}</div>
              </div>

              <div className="border-t-2 border-[#e0e8e8] pt-4">
                <div className="text-sm text-[#6b7280] mb-2">Entry Number</div>
                <div className="text-3xl font-bold text-[#1a1a2e]">#{assignment.entryNumber}</div>
              </div>
            </div>

            <div className="bg-[#1a1a2e] text-[#F2F7F7] p-4 rounded-xl text-center">
              <p className="text-sm">The game will start shortly. Good luck!</p>
            </div>

            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full h-14 text-base font-medium bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] shadow-md relative z-50"
                onClick={handleViewTable}
              >
                • See your table •
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 text-base font-medium bg-[#F2F7F7] hover:bg-[#e0e8e8] text-[#1a1a2e] rounded-2xl border-2 border-[#1a1a2e] shadow-md"
                onClick={handleBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
