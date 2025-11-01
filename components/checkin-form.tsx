"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"

const soloFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
})

const partnerFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  partnerFirstName: z.string().min(2, "Partner's first name must be at least 2 characters"),
  partnerLastName: z.string().min(2, "Partner's last name must be at least 2 characters"),
})

type SoloFormData = z.infer<typeof soloFormSchema>
type PartnerFormData = z.infer<typeof partnerFormSchema>
type FormData = SoloFormData | PartnerFormData

type Step = "welcome" | "form" | "confirmation"

interface CheckInState {
  step: Step
  playingWithPartner: boolean
  entryNumber: number
  formData?: Partial<FormData>
}

export function CheckInForm() {
  const [step, setStep] = useState<Step>("welcome")
  const [playingWithPartner, setPlayingWithPartner] = useState(false)
  const [entryNumber] = useState(Math.floor(Math.random() * 20) + 10)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(playingWithPartner ? partnerFormSchema : soloFormSchema),
  })

  useEffect(() => {
    const savedState = localStorage.getItem("checkin-state")
    if (savedState) {
      try {
        const state: CheckInState = JSON.parse(savedState)
        setStep(state.step)
        setPlayingWithPartner(state.playingWithPartner)
        if (state.formData) {
          Object.entries(state.formData).forEach(([key, value]) => {
            setValue(key as keyof FormData, value)
          })
        }
      } catch (error) {
        console.error("Failed to load saved state:", error)
      }
    }
  }, [setValue])

  useEffect(() => {
    const state: CheckInState = {
      step,
      playingWithPartner,
      entryNumber,
    }
    localStorage.setItem("checkin-state", JSON.stringify(state))
  }, [step, playingWithPartner, entryNumber])

  const onSubmit = async (data: FormData) => {
    console.log("[v0] Form submitted:", data)
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`,
          sessionId: "session-1",
          hasPartner: playingWithPartner,
          partnerName: playingWithPartner ? `${data.partnerFirstName} ${data.partnerLastName}` : null,
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        const errorMessage = result?.error || "Failed to join session"
        console.error("[v0] Join API error:", errorMessage, "Status:", response.status, "Full response:", result)
        throw new Error(errorMessage)
      }

      console.log("[v0] Player joined successfully:", result.player)
      
      if (!result.player) {
        console.error("[v0] Invalid response - no player object:", result)
        throw new Error("Invalid response from server - player data missing")
      }

      const savedPlayers = localStorage.getItem("session-players")
      const players = savedPlayers ? JSON.parse(savedPlayers) : []
      players.push({
        id: result.player.id,
        name: result.player.name,
        sessionId: result.player.session_id,
        hasPartner: result.player.has_partner,
        partnerName: result.player.partner_name,
      })
      localStorage.setItem("session-players", JSON.stringify(players))

      localStorage.removeItem("checkin-state")
      
      // Show success before redirecting
      setSuccessMessage("Successfully joined! Redirecting to waiting room...")
      
      // Small delay to show success message
      setTimeout(() => {
        router.push("/waiting-room")
      }, 500)
    } catch (error: any) {
      console.error("[v0] Error joining session:", error)
      const errorMsg = error?.message || "Failed to join session. Please try again."
      setErrorMessage(errorMsg)
      
      // If player was created but we hit an error, still redirect to waiting room
      // This handles edge cases where insert succeeded but response parsing failed
      const savedPlayers = localStorage.getItem("session-players")
      if (savedPlayers) {
        const players = JSON.parse(savedPlayers)
        if (players.length > 0) {
          console.log("[v0] Player exists in localStorage, redirecting anyway")
          setTimeout(() => {
            router.push("/waiting-room")
          }, 2000)
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWelcomeChoice = (withPartner: boolean) => {
    setPlayingWithPartner(withPartner)
    setStep("form")
  }

  const handleViewGame = () => {
    localStorage.removeItem("checkin-state")
    router.push("/waiting-room")
  }

  const handleRulesTips = () => {
    router.push("/rules")
  }

  if (step === "welcome") {
    return (
      <div className="relative w-full max-w-md">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-[#1a1a2e] border-8 border-[#F2F7F7] flex items-center justify-center shadow-lg z-10 overflow-hidden">
          <Image src="/logo.png" alt="Domino Social" width={96} height={96} className="w-full h-full object-cover" />
        </div>

        <div
          className="bg-[#F2F7F7] rounded-3xl border-4 border-[#1a1a2e] p-8 pt-16 shadow-2xl relative overflow-hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(26, 26, 46, 0.03) 2px, rgba(26, 26, 46, 0.03) 4px)",
          }}
        >
          <div className="text-center space-y-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-block px-3 py-1 bg-[#1a1a2e] text-[#F2F7F7] text-xs font-medium rounded-full mb-2">
                Step 1
              </div>
              <h1 className="text-4xl font-bold text-[#1a1a2e]">Welcome</h1>
              <p className="text-[#6b7280] text-sm">Let's get you seated, what option best describes you.</p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                size="lg"
                className="w-full h-14 text-base font-medium bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] shadow-md"
                onClick={() => handleWelcomeChoice(false)}
              >
                • I want to partner up •
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 text-base font-medium bg-[#F2F7F7] hover:bg-[#e0e8e8] text-[#1a1a2e] rounded-2xl border-2 border-[#1a1a2e] shadow-md"
                onClick={() => handleWelcomeChoice(true)}
              >
                • I have a partner •
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === "form") {
    return (
      <div className="relative w-full max-w-md">
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
              <div className="text-sm text-[#6b7280]">Step 2</div>
              <h2 className="text-3xl font-bold text-[#1a1a2e]">Check in</h2>
            </div>

            {errorMessage && (
              <div className="bg-[#8b1c1f] text-[#F2F7F7] p-3 rounded-xl text-sm text-center">{errorMessage}</div>
            )}
            
            {successMessage && (
              <div className="bg-green-600 text-white p-3 rounded-xl text-sm text-center">{successMessage}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Your Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-[#1a1a2e] text-sm font-medium">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      className="h-12 bg-[#F2F7F7] border-2 border-[#1a1a2e] rounded-lg text-[#1a1a2e] focus:ring-[#1a1a2e]"
                    />
                    {errors.firstName && <p className="text-xs text-[#8b1c1f]">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-[#1a1a2e] text-sm font-medium">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      className="h-12 bg-[#F2F7F7] border-2 border-[#1a1a2e] rounded-lg text-[#1a1a2e] focus:ring-[#1a1a2e]"
                    />
                    {errors.lastName && <p className="text-xs text-[#8b1c1f]">{errors.lastName.message}</p>}
                  </div>
                </div>
              </div>

              {playingWithPartner && (
                <div className="space-y-4 pt-4 border-t-2 border-[#e0e8e8]">
                  <h3 className="text-lg font-semibold text-[#1a1a2e]">Partner's Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="partnerFirstName" className="text-[#1a1a2e] text-sm font-medium">
                        First name
                      </Label>
                      <Input
                        id="partnerFirstName"
                        {...register("partnerFirstName" as any)}
                        className="h-12 bg-[#F2F7F7] border-2 border-[#1a1a2e] rounded-lg text-[#1a1a2e] focus:ring-[#1a1a2e]"
                      />
                      {errors.partnerFirstName && (
                        <p className="text-xs text-[#8b1c1f]">{(errors as any).partnerFirstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerLastName" className="text-[#1a1a2e] text-sm font-medium">
                        Last name
                      </Label>
                      <Input
                        id="partnerLastName"
                        {...register("partnerLastName" as any)}
                        className="h-12 bg-[#F2F7F7] border-2 border-[#1a1a2e] rounded-lg text-[#1a1a2e] focus:ring-[#1a1a2e]"
                      />
                      {errors.partnerLastName && (
                        <p className="text-xs text-[#8b1c1f]">{(errors as any).partnerLastName.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 bg-[#F2F7F7] hover:bg-[#e0e8e8] text-[#1a1a2e] rounded-2xl border-2 border-[#1a1a2e] font-medium"
                  onClick={() => setStep("welcome")}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="h-12 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-[#F2F7F7] rounded-2xl border-2 border-[#1a1a2e] font-medium disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Joining..." : `• ${playingWithPartner ? "Join game" : "Join queue"} •`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (step === "confirmation") {
    return null
  }

  return null
}
