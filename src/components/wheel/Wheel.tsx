"use client"

import { useCallback, useEffect, useImperativeHandle, useRef } from "react"
import { playTick } from "@/lib/wheel-sounds"
import { cn } from "@/lib/utils"

/** Carnival palette (no blues/indigos by design). */
export const WHEEL_PALETTE = [
  "#e11d48", // rose
  "#ea580c", // orange
  "#d97706", // amber
  "#65a30d", // lime
  "#059669", // emerald
  "#0d9488", // teal
  "#db2777", // pink
  "#9333ea", // purple
] as const

export interface WheelHandle {
  spin: () => void
}

interface WheelProps {
  names: string[]
  soundOn: boolean
  idleSpin: boolean
  spinning: boolean
  onSpinningChange: (spinning: boolean) => void
  onSpinEnd: (winner: string) => void
  apiRef?: React.RefObject<WheelHandle | null>
  className?: string
}

const TAU = Math.PI * 2

/** Which segment index sits under the top pointer for a given rotation. */
function pointerSegment(rotation: number, count: number): number {
  if (count <= 0) return -1
  const segAngle = TAU / count
  let local = (Math.PI * 1.5 - rotation) % TAU
  if (local < 0) local += TAU
  return Math.floor(local / segAngle) % count
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

export function Wheel({
  names,
  soundOn,
  idleSpin,
  spinning,
  onSpinningChange,
  onSpinEnd,
  apiRef,
  className,
}: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const sizeRef = useRef(0)
  const rotationRef = useRef(0)
  const spinningRef = useRef(false)
  const lastSegRef = useRef(-1)
  const spinAnimRef = useRef<{
    start: number
    from: number
    delta: number
    duration: number
  } | null>(null)

  // Keep latest props in refs so the rAF loop never goes stale.
  const namesRef = useRef(names)
  const soundRef = useRef(soundOn)
  const idleRef = useRef(idleSpin)
  const onSpinEndRef = useRef(onSpinEnd)
  const onSpinningChangeRef = useRef(onSpinningChange)
  useEffect(() => {
    namesRef.current = names
    soundRef.current = soundOn
    idleRef.current = idleSpin
    onSpinEndRef.current = onSpinEnd
    onSpinningChangeRef.current = onSpinningChange
  })

  const spin = useCallback(() => {
    if (spinningRef.current || namesRef.current.length === 0) return
    spinningRef.current = true
    onSpinningChangeRef.current(true)
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const turns = reduceMotion ? 1 : 5 + Math.random() * 3
    const duration = reduceMotion ? 900 : 4200 + Math.random() * 1400
    spinAnimRef.current = {
      start: performance.now(),
      from: rotationRef.current,
      delta: turns * TAU,
      duration,
    }
  }, [])

  useImperativeHandle(apiRef, () => ({ spin }), [apiRef, spin])

  // ---- canvas sizing (responsive + HiDPI) -------------------------------------------
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const resize = (width: number) => {
      const canvas = canvasRef.current
      if (!canvas || width <= 0) return
      const dpr = Math.min(2.5, window.devicePixelRatio || 1)
      sizeRef.current = width
      // Only size the drawing buffer here — the CSS class (h-full w-full)
      // controls display size. Setting an explicit style width would feed
      // back into min-content sizing and blow out narrow layouts.
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(width * dpr)
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctxRef.current = ctx
      }
    }
    resize(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      resize(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- render loop -------------------------------------------------------------------
  useEffect(() => {
    let raf = 0

    const draw = (now: number) => {
      const ctx = ctxRef.current
      const size = sizeRef.current
      if (!ctx || size === 0) return
      const currentNames = namesRef.current
      const rot = rotationRef.current
      const count = currentNames.length
      const dark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")

      ctx.clearRect(0, 0, size, size)
      const cx = size / 2
      const cy = size / 2
      const outer = size / 2 - 6
      const rimW = Math.max(12, size * 0.03)
      const r = outer - rimW

      // --- rim + twinkling bulbs ---
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, outer, 0, TAU)
      ctx.arc(cx, cy, r, 0, TAU, true)
      ctx.fillStyle = dark ? "#111827" : "#1f2937"
      ctx.fill()
      const bulbs = 28
      const rimMid = (outer + r) / 2
      for (let i = 0; i < bulbs; i++) {
        const a = (i / bulbs) * TAU
        const tw = 0.5 + 0.5 * Math.sin(now / 320 + i * 1.7)
        ctx.beginPath()
        ctx.arc(
          cx + Math.cos(a) * rimMid,
          cy + Math.sin(a) * rimMid,
          Math.max(2, rimW * 0.17),
          0,
          TAU
        )
        ctx.fillStyle =
          i % 2 === 0
            ? `rgba(253, 224, 71, ${0.5 + tw * 0.5})`
            : `rgba(255, 255, 255, ${0.3 + tw * 0.35})`
        ctx.fill()
      }
      ctx.restore()

      // --- segments ---
      if (count === 0) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, TAU)
        ctx.fillStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"
        ctx.fill()
        ctx.fillStyle = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.font = `600 ${Math.max(15, size * 0.034)}px system-ui, sans-serif`
        ctx.fillText("The wheel is empty", cx, cy - size * 0.02)
        ctx.font = `400 ${Math.max(12, size * 0.024)}px system-ui, sans-serif`
        ctx.fillText("Add names to get started", cx, cy + size * 0.035)
      } else {
        const segAngle = TAU / count
        for (let i = 0; i < count; i++) {
          const a0 = rot + i * segAngle
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.arc(cx, cy, r, a0, a0 + segAngle)
          ctx.closePath()
          ctx.fillStyle = WHEEL_PALETTE[i % WHEEL_PALETTE.length]
          ctx.fill()
          if (count > 1) {
            ctx.strokeStyle = "rgba(255,255,255,0.28)"
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }

        // --- name labels (radial, outer-aligned) ---
        const tangential = (TAU * r * 0.62) / count
        const fontSize = Math.max(
          10,
          Math.min(r * 0.115, tangential * 0.72, 30)
        )
        const maxW = r * 0.68
        const textR = r - Math.max(14, r * 0.075)
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`
        ctx.fillStyle = "#ffffff"
        ctx.textAlign = "right"
        ctx.textBaseline = "middle"
        for (let i = 0; i < count; i++) {
          const mid = rot + (i + 0.5) * segAngle
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(mid)
          let label = currentNames[i] ?? ""
          if (ctx.measureText(label).width > maxW) {
            while (
              label.length > 1 &&
              ctx.measureText(`${label}…`).width > maxW
            ) {
              label = label.slice(0, -1)
            }
            label += "…"
          }
          ctx.fillText(label, textR, 0)
          ctx.restore()
        }
      }

      // --- hub ---
      const hubR = Math.max(14, r * 0.13)
      ctx.beginPath()
      ctx.arc(cx, cy, hubR, 0, TAU)
      ctx.fillStyle = dark ? "#111827" : "#1f2937"
      ctx.fill()
      ctx.lineWidth = Math.max(2, hubR * 0.14)
      ctx.strokeStyle = "#fbbf24"
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy, hubR * 0.42, 0, TAU)
      ctx.fillStyle = "#fbbf24"
      ctx.fill()
    }

    const frame = (now: number) => {
      const currentNames = namesRef.current
      const anim = spinAnimRef.current
      if (anim) {
        const t = Math.min(1, (now - anim.start) / anim.duration)
        rotationRef.current = anim.from + anim.delta * easeOutQuart(t)
        const seg = pointerSegment(rotationRef.current, currentNames.length)
        if (seg !== lastSegRef.current) {
          lastSegRef.current = seg
          if (soundRef.current && currentNames.length > 1) playTick()
        }
        if (t >= 1) {
          const winnerIndex = pointerSegment(
            rotationRef.current,
            currentNames.length
          )
          spinAnimRef.current = null
          spinningRef.current = false
          onSpinningChangeRef.current(false)
          const winner = currentNames[winnerIndex]
          if (winner) onSpinEndRef.current(winner)
        }
      } else if (idleRef.current && currentNames.length > 0) {
        rotationRef.current += 0.0022
      }
      draw(now)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const canSpin = names.length > 0 && !spinning

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[560px] select-none",
        canSpin && "cursor-pointer",
        className
      )}
      onClick={() => canSpin && spin()}
      role="button"
      tabIndex={0}
      aria-label={
        names.length === 0
          ? "Wheel is empty, add names first"
          : "Spin the wheel to pick a random name"
      }
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && canSpin) {
          e.preventDefault()
          spin()
        }
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

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
  )
}

export default Wheel
