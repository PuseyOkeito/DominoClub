"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { loadMatchmakingResults, reportGameResult, type Team, type Table } from "@/lib/matchmaking"

export default function GameResultPage() {
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [opponentTeam, setOpponentTeam] = useState<Team | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultSubmitted, setResultSubmitted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = searchParams.get("table")

  useEffect(() => {
    if (!tableId) {
      router.push("/waiting-room")
      return
    }

    const { players, teams, tables } = loadMatchmakingResults()
    const currentTable = tables.find((t) => t.id === tableId)

    if (!currentTable) {
      router.push("/waiting-room")
      return
    }

    const team1 = teams.find((t) => t.id === currentTable.team1Id)
    const team2 = teams.find((t) => t.id === currentTable.team2Id)

    setTable(currentTable)
    setMyTeam(team1 || null)
    setOpponentTeam(team2 || null)

    // Check if result already submitted
    if (currentTable.status === "finished") {
      setResultSubmitted(true)
    }
  }, [tableId, router])

  const handleSubmitResult = () => {
    if (!selectedWinner || !table) return

    setIsSubmitting(true)

    // Report the game result
    reportGameResult(table.id, selectedWinner)

    setTimeout(() => {
      setIsSubmitting(false)
      setResultSubmitted(true)

      // Redirect to next round or waiting room
      setTimeout(() => {
        router.push("/waiting-room")
      }, 2000)
    }, 1000)
  }

  if (!myTeam || !opponentTeam || !table) {
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

  if (resultSubmitted) {
    const winningTeam = table.winnerId === myTeam.id ? myTeam : opponentTeam
    const losingTeam = table.winnerId === myTeam.id ? opponentTeam : myTeam

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
                <h2 className="text-3xl font-bold text-[#1a1a2e]">Game Complete!</h2>
                <p className="text-[#6b7280] text-sm">Results have been recorded</p>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 border-[#1a1a2e] space-y-4">
                <div className="text-center">
                  <div className="text-sm text-[#6b7280] mb-2">Winners</div>
                  <div className="text-2xl font-bold text-[#1a1a2e]">
                    {winningTeam.player1Name} & {winningTeam.player2Name}
                  </div>
                </div>

                <div className="border-t-2 border-[#e0e8e8] pt-4">
                  <div className="text-sm text-[#6b7280] mb-2">Runners Up</div>
                  <div className="text-xl font-medium text-[#1a1a2e]">
                    {losingTeam.player1Name} & {losingTeam.player2Name}
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a2e] text-[#F2F7F7] p-4 rounded-xl text-center">
                <p className="text-sm">Redirecting to waiting room for next round...</p>
              </div>
            </div>
          </div>
        </div>
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
      <div className="absolute inset-0 bg-black/20" />

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
              <h2 className="text-3xl font-bold text-[#1a1a2e]">Report Result</h2>
              <p className="text-[#6b7280] text-sm">Table {table.number}</p>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-[#6b7280] text-center mb-4">Select the winning team</div>

              {/* Team 1 */}
              <button
                onClick={() => setSelectedWinner(myTeam.id)}
                className={`w-full p-6 rounded-xl border-2 transition-all ${
                  selectedWinner === myTeam.id
                    ? "bg-[#1a1a2e] border-[#1a1a2e] text-[#F2F7F7]"
                    : "bg-white border-[#1a1a2e] text-[#1a1a2e] hover:bg-[#e0e8e8]"
                }`}
              >
                <div className="text-center space-y-2">
                  <div className="text-lg font-bold">
                    {myTeam.player1Name} & {myTeam.player2Name}
                  </div>
                  <div className="text-sm opacity-75">Team 1</div>
                </div>
              </button>

              {/* Team 2 */}
              <button
                onClick={() => setSelectedWinner(opponentTeam.id)}
                className={`w-full p-6 rounded-xl border-2 transition-all ${
                  selectedWinner === opponentTeam.id
                    ? "bg-[#1a1a2e] border-[#1a1a2e] text-[#F2F7F7]"
                    : "bg-white border-[#1a1a2e] text-[#1a1a2e] hover:bg-[#e0e8e8]"
                }`}
              >
                <div className="text-center space-y-2">
                  <div className="text-lg font-bold">
                    {opponentTeam.player1Name} & {opponentTeam.player2Name}
                  </div>
                  <div className="text-sm opacity-75">Team 2</div>
                </div>
              </button>
            </div>

            <Button
              size="lg"
              disabled={!selectedWinner || isSubmitting}
              className="w-full h-14 text-base font-medium bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] shadow-md disabled:opacity-50"
              onClick={handleSubmitResult}
            >
              {isSubmitting ? "Submitting..." : "• Submit Result •"}
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 bg-[#F2F7F7] hover:bg-[#e0e8e8] text-[#1a1a2e] rounded-2xl border-2 border-[#1a1a2e] font-medium"
              onClick={() => router.push("/game")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
