"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle2, X } from "lucide-react"

function GameResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tableNumber = searchParams.get("table")
  const [team1, setTeam1] = useState<{ id: string; player1Name: string; player2Name: string } | null>(null)
  const [team2, setTeam2] = useState<{ id: string; player1Name: string; player2Name: string } | null>(null)
  const [winningTeamId, setWinningTeamId] = useState<string | null>(null)
  const [team1Score, setTeam1Score] = useState<string>("")
  const [team2Score, setTeam2Score] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showThankYou, setShowThankYou] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadTableData = async () => {
      if (!tableNumber) {
        setError("No table number provided")
        return
      }

      try {
        // Get table data
        const { data: tableData, error: tableError } = await supabase
          .from("game_tables")
          .select("team1_id, team2_id")
          .eq("table_number", parseInt(tableNumber))
          .single()

        if (tableError || !tableData) {
          setError("Table not found")
          return
        }

        // Get team 1 data
        if (tableData.team1_id) {
          const { data: team1Data } = await supabase
            .from("teams")
            .select("id, player1_name, player2_name")
            .eq("id", tableData.team1_id)
            .single()

          if (team1Data) {
            setTeam1({
              id: team1Data.id,
              player1Name: team1Data.player1_name || "Player 1",
              player2Name: team1Data.player2_name || "Player 2",
            })
          }
        }

        // Get team 2 data
        if (tableData.team2_id) {
          const { data: team2Data } = await supabase
            .from("teams")
            .select("id, player1_name, player2_name")
            .eq("id", tableData.team2_id)
            .single()

          if (team2Data) {
            setTeam2({
              id: team2Data.id,
              player1Name: team2Data.player1_name || "Player 1",
              player2Name: team2Data.player2_name || "Player 2",
            })
          }
        }
      } catch (err) {
        console.error("[v0] Error loading table data:", err)
        setError("Failed to load table data")
      }
    }

    loadTableData()
  }, [tableNumber, supabase])

  const handleSubmit = async () => {
    if (!winningTeamId) {
      setError("Please select the winning team")
      return
    }

    if (!team1Score || !team2Score) {
      setError("Please enter scores for both teams")
      return
    }

    const score1 = parseInt(team1Score)
    const score2 = parseInt(team2Score)

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      setError("Scores must be valid numbers")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const losingTeamId = winningTeamId === team1?.id ? team2?.id : team1?.id

      // Update winning team
      if (winningTeamId) {
        // Get current wins
        const { data: winTeamData } = await supabase
          .from("teams")
          .select("wins")
          .eq("id", winningTeamId)
          .single()

        if (winTeamData) {
          const { error: winError } = await supabase
            .from("teams")
            .update({ wins: (winTeamData.wins || 0) + 1 })
            .eq("id", winningTeamId)

          if (winError) {
            throw winError
          }
        }
      }

      // Update losing team
      if (losingTeamId) {
        // Get current losses
        const { data: lossTeamData } = await supabase
          .from("teams")
          .select("losses")
          .eq("id", losingTeamId)
          .single()

        if (lossTeamData) {
          const { error: lossError } = await supabase
            .from("teams")
            .update({ losses: (lossTeamData.losses || 0) + 1 })
            .eq("id", losingTeamId)

          if (lossError) {
            throw lossError
          }
        }
      }

      // Redirect to thank you screen instead of game page
      setShowThankYou(true)
    } catch (err) {
      console.error("[v0] Error submitting result:", err)
      setError("Failed to submit result. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handlePlayAgain = () => {
    // Clear all localStorage data
    const currentPlayerId = localStorage.getItem("current-player-id")
    if (currentPlayerId) {
      localStorage.removeItem(`table-viewed-${currentPlayerId}`)
    }
    localStorage.removeItem("current-player-id")
    localStorage.removeItem("session-players")
    
    // Redirect to home page for new signup
    router.push("/?new=true")
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

      {showThankYou ? (
        <Card className="relative z-10 w-full max-w-md p-8 bg-[#F2F7F7] border-4 border-[#1a1a2e] shadow-2xl">
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-4xl font-bold text-[#1a1a2e]">Thanks for Playing!</h1>
              <p className="text-lg text-[#6b7280]">
                Your game result has been recorded.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full h-14 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] font-medium text-lg"
              onClick={handlePlayAgain}
            >
              Play Again
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="relative z-10 w-full max-w-md p-8 bg-[#F2F7F7] border-4 border-[#1a1a2e] shadow-2xl">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">Report Game Result</h1>
              {tableNumber && (
                <p className="text-lg text-[#6b7280]">Table {tableNumber}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-lg text-sm">
                {error}
              </div>
            )}

            {team1 && team2 ? (
              <>
                <div className="space-y-4">
                  <div>
                    <Label className="text-[#1a1a2e] font-semibold mb-3 block">Select Winning Team</Label>
                    <div className="space-y-3">
                      <button
                        onClick={() => setWinningTeamId(team1.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          winningTeamId === team1.id
                            ? "bg-green-100 border-green-500 text-green-900"
                            : "bg-white border-[#1a1a2e] text-[#1a1a2e] hover:bg-[#e0e8e8]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-base mb-1">Team 1</div>
                            <div className="text-sm opacity-80">
                              {team1.player1Name} & {team1.player2Name}
                            </div>
                          </div>
                          {winningTeamId === team1.id && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setWinningTeamId(team2.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          winningTeamId === team2.id
                            ? "bg-green-100 border-green-500 text-green-900"
                            : "bg-white border-[#1a1a2e] text-[#1a1a2e] hover:bg-[#e0e8e8]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-base mb-1">Team 2</div>
                            <div className="text-sm opacity-80">
                              {team2.player1Name} & {team2.player2Name}
                            </div>
                          </div>
                          {winningTeamId === team2.id && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="team1-score" className="text-[#1a1a2e] font-semibold mb-2 block">
                        Team 1 Score
                      </Label>
                      <div className="text-xs text-[#6b7280] mb-1">
                        {team1.player1Name} & {team1.player2Name}
                      </div>
                      <Input
                        id="team1-score"
                        type="number"
                        min="0"
                        value={team1Score}
                        onChange={(e) => setTeam1Score(e.target.value)}
                        className="h-12 text-lg text-center border-2 border-[#1a1a2e]"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="team2-score" className="text-[#1a1a2e] font-semibold mb-2 block">
                        Team 2 Score
                      </Label>
                      <div className="text-xs text-[#6b7280] mb-1">
                        {team2.player1Name} & {team2.player2Name}
                      </div>
                      <Input
                        id="team2-score"
                        type="number"
                        min="0"
                        value={team2Score}
                        onChange={(e) => setTeam2Score(e.target.value)}
                        className="h-12 text-lg text-center border-2 border-[#1a1a2e]"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 bg-white hover:bg-[#e0e8e8] text-[#1a1a2e] border-2 border-[#1a1a2e]"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] border-2 border-[#1a1a2e]"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Finish"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#6b7280]">Loading table data...</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </main>
  )
}

export default function GameResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#8B1C1F]" />}>
      <GameResultContent />
    </Suspense>
  )
}
