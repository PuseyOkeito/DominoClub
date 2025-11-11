"use client"
import { useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Suspense, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

const DominoScene = dynamic(() => import("@/components/domino-scene"), {
  ssr: false,
})

function GameContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const entryNumber = searchParams.get("entry") || "1"
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadPlayerData = async () => {
      // Get current player ID from localStorage
      const currentPlayerId = localStorage.getItem("current-player-id")
      if (!currentPlayerId) {
        console.log("[v0] No player ID found, redirecting to home")
        router.push("/")
        return
      }

      try {
        // Get player data
        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("id, name, partner_name, table_id")
          .eq("id", currentPlayerId)
          .single()

        if (playerError) {
          console.error("[v0] Error loading player:", playerError)
          return
        }

        if (playerData) {
          setPlayerName(playerData.name)
          setPartnerName(playerData.partner_name || null)

          // Get table number from game_tables
          if (playerData.table_id) {
            const { data: tableData, error: tableError } = await supabase
              .from("game_tables")
              .select("table_number")
              .eq("id", playerData.table_id)
              .single()

            if (!tableError && tableData) {
              setTableNumber(tableData.table_number)
            } else {
              // Fallback: check teams table
              const { data: teamData, error: teamError } = await supabase
                .from("teams")
                .select("table_number")
                .or(`player1_id.eq.${currentPlayerId},player2_id.eq.${currentPlayerId}`)
                .single()

              if (!teamError && teamData && teamData.table_number) {
                setTableNumber(teamData.table_number)
              }
            }
          } else {
            // No table_id, check teams table
            const { data: teamData, error: teamError } = await supabase
              .from("teams")
              .select("table_number")
              .or(`player1_id.eq.${currentPlayerId},player2_id.eq.${currentPlayerId}`)
              .single()

            if (!teamError && teamData && teamData.table_number) {
              setTableNumber(teamData.table_number)
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error loading player data:", error)
      }
    }

    loadPlayerData()
  }, [router, supabase])

  const handleReportResult = () => {
    if (tableNumber) {
      router.push(`/game-result?table=${tableNumber}`)
    }
  }

  return (
    <main className="relative min-h-screen">
      <DominoScene />

      {/* Table number and partner info overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-32">
        <div className="text-center space-y-4">
          {tableNumber && (
            <div className="text-[12rem] font-bold text-white/20 leading-none tracking-tighter">
              Table {tableNumber}
            </div>
          )}
          {partnerName && (
            <div className="text-4xl font-semibold text-white/30 mt-4">
              Partner: {partnerName}
            </div>
          )}
          {entryNumber && (
            <div className="text-6xl font-bold text-white/15 mt-2">
              #{entryNumber}
            </div>
          )}
        </div>
      </div>

      {tableNumber && (
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
