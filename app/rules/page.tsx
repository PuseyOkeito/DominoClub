import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function RulesPage() {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/frame-19.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo circle at top */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-[#1a1a2e] border-8 border-[#F2F7F7] flex items-center justify-center shadow-lg z-10 overflow-hidden">
          <Image src="/logo.png" alt="Domino Social" width={96} height={96} className="w-full h-full object-cover" />
        </div>

        {/* Card */}
        <div
          className="bg-[#F2F7F7] rounded-2xl border-4 border-[#1a1a2e] p-8 pt-16 shadow-2xl relative overflow-hidden max-h-[80vh] overflow-y-auto"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(26, 26, 46, 0.03) 2px, rgba(26, 26, 46, 0.03) 4px)",
          }}
        >
          <div className="space-y-6 relative z-10">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-[#1a1a2e]">Rules & Tips</h1>
            </div>

            <div className="space-y-6 text-[#1a1a2e]">
              {/* Setup */}
              <section className="space-y-3">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>🎲</span> SETUP
                </h2>
                <ul className="space-y-2 text-sm leading-relaxed">
                  <li>4 players per table — partners sit opposite each other.</li>
                  <li>Each player draws 7 tiles.</li>
                  <li>Highest double starts.</li>
                  <li>Turns go clockwise.</li>
                  <li>If you can't play, you pass (or draw, if there's a boneyard).</li>
                </ul>
              </section>

              {/* Gameplay */}
              <section className="space-y-3">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>🏁</span> GAMEPLAY
                </h2>
                <div className="space-y-2 text-sm leading-relaxed">
                  <p>Players take turns matching the ends of the layout.</p>
                  <p>You must follow suit (match one end).</p>
                  <p>If no match, pass (or draw if boneyard is used).</p>
                  <p>The first team to play all tiles wins the hand.</p>
                  <p className="italic">
                    Dominoes is fast, social, and strategic — like poker meets chess, but louder.
                  </p>
                </div>
              </section>

              {/* Scoring */}
              <section className="space-y-3">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>🔢</span> SCORING
                </h2>
                <div className="space-y-2 text-sm leading-relaxed">
                  <p>When one team plays out, they score the sum of the opponents' remaining pips ÷ 5, rounded up.</p>
                  <p>
                    <strong>Example:</strong> Opponents have 23 pips → 5 points.
                  </p>
                  <p>First team to 6 points wins.</p>
                  <p>No streak breaks (keeps play flowing).</p>
                  <p>For social play, rounds are short — best of 3 is perfect for event pacing.</p>
                </div>
              </section>

              {/* Rotation System */}
              <section className="space-y-3">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>🔁</span> ROTATION SYSTEM
                </h2>
                <div className="space-y-2 text-sm leading-relaxed">
                  <p>To keep things social:</p>
                  <p>After each round, both partners split and join new tables.</p>
                  <p>New pardies = new chemistry, new conversation.</p>
                  <p>Encourage quick intros before each match — it's part of the vibe.</p>
                  <p className="italic">"Hey, I'm [Name] — let's see if we can read each other this round."</p>
                </div>
              </section>

              {/* How to Read the Game */}
              <section className="space-y-3">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>🧠</span> HOW TO READ THE GAME
                </h2>
                <div className="space-y-2 text-sm leading-relaxed">
                  <p>Dominoes isn't just luck — it's pattern reading, psychology, and timing.</p>
                  <p>Here's how to see the board like a pro:</p>

                  <div className="space-y-3 mt-3">
                    <div>
                      <p className="font-bold">1️⃣ Watch the Flow Early</p>
                      <p>
                        Notice which numbers appear often. If you've seen multiple 6s, they'll soon run out — so pivot
                        to another suit. Every tile played is a clue.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold">2️⃣ Track What's Missing</p>
                      <p>
                        When someone passes, they've revealed what they don't have. Keep mental notes — those details
                        win games.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold">3️⃣ Protect Your Partner</p>
                      <p>
                        You're a team. If your pardy is struggling, open a number that helps them move. Avoid feeding
                        your opponents easy plays. Smart players play for the team, not the turn.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold">4️⃣ Control the Ends</p>
                      <p>
                        The open ends are the only numbers that matter. Guide the board toward your strengths — or away
                        from your opponents'. He who controls the ends, controls the table.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold">5️⃣ Block When You Can't Win</p>
                      <p>
                        If your team is behind, play for the block — lock the table and force the count. Lowest total
                        pips wins the block.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold">6️⃣ Count the Pips</p>
                      <p>
                        Play your heavy tiles early. Keep a few low ones for the end — that's how you win tight rounds.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold">7️⃣ Read the People</p>
                      <p>
                        This is a social game. Watch reactions, listen to table talk — people reveal more than they
                        think. It's strategy, energy, and rhythm all at once.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bonus Tip */}
              <section className="space-y-3">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>✨</span> Bonus Tip
                </h2>
                <p className="text-sm leading-relaxed italic">
                  Each new pardy teaches you something — about strategy, communication, and vibes. Dominoes isn't just
                  played, it's felt.
                </p>
              </section>
            </div>

            {/* Back Button */}
            <div className="pt-4">
              <Link href="/waiting-room">
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-medium bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] shadow-md"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Waiting Room
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
