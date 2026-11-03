"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { WinnerDialog } from "@/components/wheel/WinnerDialog"
import { NameManager } from "@/components/wheel/NameManager"
import { cn } from "@/lib/utils"

export interface WinnerEntry {
  name: string
  at: number
}

export default function WheelPage() {
  const [names, setNames] = useState<string[]>([])
  const [winners, setWinners] = useState<WinnerEntry[]>([])
  const [winner, setWinner] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [idleSpin, setIdleSpin] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system")
  const [justWon, setJustWon] = useState(false)

  // Persist names and winners
  useEffect(() => {
    const stored = localStorage.getItem("wheel-of-names")
    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (Array.isArray(data.names)) setNames(data.names)
        if (Array.isArray(data.winners)) setWinners(data.winners)
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      "wheel-of-names",
      JSON.stringify({ names, winners: winners.slice(0, 30) })
    )
  }, [names, winners])

  const spin = useCallback(() => {
    if (names.length === 0) return
    const idx = Math.floor(Math.random() * names.length)
    const w = names[idx]
    setWinner(w)
    setDialogOpen(true)
    setJustWon(true) // Flag to trigger confetti
  }, [names])

  const spinAgain = () => {
    setDialogOpen(false)
    // Use setTimeout to ensure dialog closes before next spin
    setTimeout(() => {
      if (names.length > 0) {
        const idx = Math.floor(Math.random() * names.length)
        const w = names[idx]
        setWinner(w)
        setDialogOpen(true)
        setJustWon(true)
      }
    }, 100)
  }

  const removeWinnerAndSpin = () => {
    if (winner) {
      setNames((prev) => prev.filter((n) => n !== winner))
      setWinner(null)
      setDialogOpen(false)
      setJustWon(false)
      // Auto-spin again
      setTimeout(() => {
        if (names.length > 1) {
          const idx = Math.floor(Math.random() * (names.length - 1))
          const filtered = names.filter((n) => n !== winner)
          const w = filtered[idx]
          setWinner(w)
          setDialogOpen(true)
          setJustWon(true)
        }
      }, 100)
    }
  }

  return (
    <div className={cn("min-h-screen flex flex-col", theme === "dark" ? "dark" : "")}>
      <header className="border-b sticky top-0 z-10 backdrop-blur-md bg-background/80">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight">Wheel of Names</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundOn((s) => !s)}
              className="p-2 rounded-lg hover:bg-accent/10"
              aria-label={soundOn ? "Mute sounds" : "Enable sounds"}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : t === "light" ? "system" : "dark"))}
              className="p-2 rounded-lg hover:bg-accent/10"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻"}
            </button>
            <button
              onClick={() => {
                setFullscreen((f) => !f)
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen()
                } else {
                  document.exitFullscreen()
                }
              }}
              className="p-2 rounded-lg hover:bg-accent/10"
              aria-label="Toggle fullscreen"
            >
              ⛶
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Left: Wheel */}
          <section className="flex flex-col items-center">
            <div className="relative mx-auto aspect-square w-full max-w-[560px] select-none cursor-pointer"
              onClick={() => {
                if (names.length > 0 && !spinning) {
                  spin()
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && names.length > 0 && !spinning) {
                  e.preventDefault()
                  spin()
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={names.length === 0 ? "Wheel is empty, add names first" : "Spin the wheel to pick a random name"}
            >
              <canvas
                ref={(el) => { wheelCanvasRef.current = el }}
                className="block h-full w-full"
              />
              {/* pointer at 12 o'clock */}
              <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 drop-shadow-md">
                <svg width="44" height="60" viewBox="0 0 44 60" aria-hidden="true">
                  <defs>
                    <linearGradient id="ptr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fde047" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M22 58 L6 20 A17 17 0 1 1 38 20 Z"
                    fill="url(#ptr)"
                    stroke="rgba(0,0,0,0.25)"
                    strokeWidth="2"
                  />
                  <circle cx="22" cy="19" r="5.5" fill="rgba(255,255,255,0.85)" />
                </svg>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-[560px]">
              <button
                onClick={names.length > 0 && !spinning ? spin : undefined}
                disabled={spinning || names.length === 0}
                className="w-full sm:w-auto px-6 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {spinning ? "Spinning…" : "Spin"}
              </button>
              <button
                onClick={() => setIdleSpin(!idleSpin)}
                className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-accent/5 text-sm"
              >
                {idleSpin ? "Idle spin: ON" : "Idle spin: OFF"}
              </button>
            </div>
          </section>

          {/* Right: Controls */}
          <aside className="flex flex-col gap-6">
            <NameManager names={names} onChange={setNames} />
            
            <section className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">History</h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {winners.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No winners yet</p>
                ) : (
                  winners.map((w, i) => (
                    <div
                      key={`${w.name}-${w.at}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-border"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {winners.length - i}.
                      </span>
                      <span className="font-medium flex-1 truncate">{w.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(w.at).toLocaleTimeString()}
                      </span>
                    </div>
                  )))}
              </div>
            </section>

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <button
                onClick={() => {
                  if (confirm("Clear all names and history?")) {
                    setNames([])
                    setWinners([])
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 text-sm"
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  if (confirm("Clear winners history only?")) {
                    setWinners([])
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-border text-foreground hover:bg-accent/5 text-sm"
              >
                Clear History
              </button>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span aria-hidden="true">·</span>
          <span>Your names stay on this device</span>
        </div>
      </footer>

      <WinnerDialog
        open={dialogOpen}
        winner={winner}
        canRemoveWinner={names.length > 1}
        onSpinAgain={spinAgain}
        onRemoveAndSpin={removeWinnerAndSpin}
        onClose={() => setDialogOpen(false)}
        justWon={justWon}
      />
    </div>
  )
}
