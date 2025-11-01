"use client"
import { useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Suspense, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { loadMatchmakingResults } from "@/lib/matchmaking"

const DominoScene = dynamic(() => import("@/components/domino-scene"), {
  ssr: false,
})

function GameContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const entryNumber = searchParams.get("entry") || "1"
  const [tableId, setTableId] = useState<string | null>(null)

  useEffect(() => {
    const { players, teams, tables } = loadMatchmakingResults()
    if (players.length > 0 && tables.length > 0) {
      const currentPlayer = players[0]
      if (currentPlayer.tableId) {
        setTableId(currentPlayer.tableId)
      }
    }
  }, [])

  const handleReportResult = () => {
    if (tableId) {
      router.push(`/game-result?table=${tableId}`)
    }
  }

  return (
    <main className="relative min-h-screen">
      <DominoScene />

      {/* Entry number overlay on the ground */}
      <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-32">
        <div className="text-center">
          <div className="text-[12rem] font-bold text-white/20 leading-none tracking-tighter">#{entryNumber}</div>
        </div>
      </div>

      {tableId && (
        <div className="absolute top-8 right-8 z-10">
          <Button
            size="lg"
            className="bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#F2F7F7] shadow-lg font-medium"
            onClick={handleReportResult}
          >
            • Report Result •
          </Button>
        </div>
      )}
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#8B1C1F]" />}>
      <GameContent />
    </Suspense>
  )
}
