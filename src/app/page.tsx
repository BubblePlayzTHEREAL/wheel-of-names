"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { Wheel, type WheelHandle } from "@/components/wheel/Wheel"
import NameManager from "@/components/wheel/NameManager"
import WinnerDialog from "@/components/wheel/WinnerDialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { playFanfare } from "@/lib/wheel-sounds"
import {
  Disc3,
  History,
  Loader2,
  Maximize,
  Minimize,
  Moon,
  Play,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react"

const STORAGE_KEY = "wheel-of-names:v1"

interface WinnerEntry {
  name: string
  at: number
}

interface StoredState {
  names?: unknown
  winners?: unknown
  soundOn?: unknown
  idleSpin?: unknown
}

function loadState(): StoredState {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredState) : {}
  } catch {
    return {}
  }
}

export default function Home() {
  const { resolvedTheme, setTheme } = useTheme()
  const { toast } = useToast()

  const [names, setNames] = useState<string[]>([])
  const [winners, setWinners] = useState<WinnerEntry[]>([])
  const [soundOn, setSoundOn] = useState(true)
  const [idleSpin, setIdleSpin] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const wheelApiRef = useRef<WheelHandle | null>(null)
  // Mirror of names for synchronous reads inside callbacks (event handlers
  // run once, so computing here is StrictMode-safe unlike state updaters).
  const namesRef = useRef<string[]>([])
  useEffect(() => {
    namesRef.current = names
  }, [names])

  // ---- persistence -------------------------------------------------------------------
  // Seed React state from localStorage after mount (client-only data source).
  // The seeding runs as a microtask so state updates happen outside the effect
  // body itself, while SSR output stays deterministic (empty wheel).
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      const stored = loadState()
      if (Array.isArray(stored.names)) {
        setNames(
          stored.names.filter(
            (n): n is string => typeof n === "string" && n.trim().length > 0
          )
        )
      }
      if (Array.isArray(stored.winners)) {
        const list = stored.winners.filter(
          (w): w is WinnerEntry =>
            typeof w === "object" &&
            w !== null &&
            typeof (w as WinnerEntry).name === "string" &&
            typeof (w as WinnerEntry).at === "number"
        )
        setWinners(list.slice(0, 50))
      }
      if (typeof stored.soundOn === "boolean") setSoundOn(stored.soundOn)
      if (typeof stored.idleSpin === "boolean") setIdleSpin(stored.idleSpin)
      setHydrated(true)
      setMounted(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          names,
          winners: winners.slice(0, 50),
          soundOn,
          idleSpin,
        })
      )
    } catch {
      // storage full or blocked — keep the app usable anyway
    }
  }, [names, winners, soundOn, idleSpin, hydrated])

  // ---- fullscreen --------------------------------------------------------------------
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement
        .requestFullscreen()
        .catch(() => toast({ description: "Fullscreen is not available." }))
    }
  }

  // ---- name operations -----------------------------------------------------------------
  const addName = useCallback(
    (name: string): boolean => {
      const value = name.trim().slice(0, 60)
      if (!value) return false
      if (
        namesRef.current.some((n) => n.toLowerCase() === value.toLowerCase())
      ) {
        toast({ description: `${value} is already on the wheel.` })
        return false
      }
      namesRef.current = [...namesRef.current, value]
      setNames(namesRef.current)
      toast({ description: `${value} joined the wheel.` })
      return true
    },
    [toast]
  )

  const removeName = useCallback((index: number) => {
    setNames((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const importNames = useCallback(
    (list: string[]): number => {
      const seen = new Set(namesRef.current.map((n) => n.toLowerCase()))
      const additions: string[] = []
      for (const raw of list) {
        const value = raw.trim().slice(0, 60)
        if (!value) continue
        const key = value.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        additions.push(value)
      }
      if (additions.length > 0) {
        namesRef.current = [...namesRef.current, ...additions]
        setNames(namesRef.current)
      }
      toast({
        description:
          additions.length > 0
            ? `Added ${additions.length} name${additions.length === 1 ? "" : "s"} to the wheel.`
            : "No new names found — they're all already on the wheel.",
      })
      return additions.length
    },
    [toast]
  )

  const shuffleNames = useCallback(() => {
    setNames((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[next[i], next[j]] = [next[j], next[i]]
      }
      return next
    })
  }, [])

  const sortNames = useCallback(() => {
    setNames((prev) =>
      [...prev].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    )
  }, [])

  const clearNames = useCallback(() => {
    setNames([])
    toast({ description: "Wheel cleared." })
  }, [toast])

  // ---- spinning -------------------------------------------------------------------------
  const startSpin = useCallback(() => {
    wheelApiRef.current?.spin()
  }, [])

  const handleSpinEnd = useCallback(
    (w: string) => {
      setWinners((prev) => [{ name: w, at: Date.now() }, ...prev].slice(0, 50))
      setWinner(w)
      setDialogOpen(true)
      if (soundOn) playFanfare()
    },
    [soundOn]
  )

  const spinAgain = useCallback(() => {
    setDialogOpen(false)
    window.setTimeout(startSpin, 180)
  }, [startSpin])

  const removeWinnerAndSpin = useCallback(() => {
    const current = namesRef.current
    namesRef.current = current.filter((n) => n !== winner)
    setNames(namesRef.current)
    setDialogOpen(false)
    window.setTimeout(startSpin, 220)
  }, [winner, startSpin])

  // Space to spin (when not typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }
      if (spinning || dialogOpen || names.length === 0) return
      e.preventDefault()
      startSpin()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [spinning, dialogOpen, names.length, startSpin])

  // Removing the winner only makes sense if another distinct name remains.
  const canRemoveWinner = names.some((n) => n !== winner)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-white shadow-md">
              <Disc3 className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight">
                Wheel of Names
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Fair and random picks, every spin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundOn((s) => !s)}
              aria-label={soundOn ? "Mute sounds" : "Unmute sounds"}
              title={soundOn ? "Mute sounds" : "Unmute sounds"}
            >
              {soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="size-5" />
              ) : (
                <Maximize className="size-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* wheel column */}
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="p-4 pb-6 pt-6 sm:p-8">
              <Wheel
                names={names}
                soundOn={soundOn}
                idleSpin={idleSpin && !spinning}
                spinning={spinning}
                onSpinningChange={setSpinning}
                onSpinEnd={handleSpinEnd}
                apiRef={wheelApiRef}
              />
              <div className="mt-8 flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  disabled={spinning || names.length === 0}
                  onClick={startSpin}
                  aria-label="Spin the wheel"
                  className="h-14 rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 px-12 text-base font-extrabold tracking-widest text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:hover:scale-100"
                >
                  {spinning ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Spinning…
                    </>
                  ) : (
                    <>
                      <Play className="size-5" />
                      SPIN
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Click the wheel or press{" "}
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    Space
                  </kbd>{" "}
                  to spin
                </p>
              </div>
            </CardContent>
          </Card>

          {/* side column */}
          <div className="flex min-w-0 flex-col gap-6">
            <Card>
              <CardContent className="p-5">
                <NameManager
                  names={names}
                  onAdd={addName}
                  onRemove={removeName}
                  onImport={importNames}
                  onShuffle={shuffleNames}
                  onSort={sortNames}
                  onClear={clearNames}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="size-4 text-muted-foreground" aria-hidden="true" />
                    Winners
                  </CardTitle>
                  {winners.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWinners([])}
                      className="h-7 px-2 text-xs text-muted-foreground"
                      aria-label="Clear winners history"
                    >
                      <Trash2 className="size-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
                <CardDescription className="sr-only">
                  Recently picked winners
                </CardDescription>
              </CardHeader>
              <CardContent>
                {winners.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No spins yet — hit SPIN to crown a winner.
                  </p>
                ) : (
                  <ScrollArea className="max-h-64">
                    <ul className="space-y-1 pb-1 pr-2.5">
                      {winners.slice(0, 30).map((w, i) => (
                        <li
                          key={`${w.at}-${i}`}
                          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
                              {Math.min(i + 1, 30)}
                            </span>
                            <span className="truncate font-medium">{w.name}</span>
                          </span>
                          <time
                            className="shrink-0 text-xs tabular-nums text-muted-foreground"
                            dateTime={new Date(w.at).toISOString()}
                          >
                            {new Date(w.at).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </time>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <span>Wheel of Names</span>
          <span aria-hidden="true">·</span>
          <span>Every spin is randomly seeded</span>
          <span aria-hidden="true">·</span>
          <span>Your names stay on this device</span>
        </div>
      </footer>

      <WinnerDialog
        open={dialogOpen}
        winner={winner}
        canRemoveWinner={canRemoveWinner}
        onSpinAgain={spinAgain}
        onRemoveAndSpin={removeWinnerAndSpin}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
