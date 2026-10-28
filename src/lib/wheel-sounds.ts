"use client"

/**
 * Tiny Web-Audio sound engine for the wheel.
 * All sounds are synthesized — no audio assets needed.
 * The AudioContext is created lazily on first use (must happen
 * after a user gesture for autoplay policies).
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

/** Short wooden "tick" played when the pointer crosses a peg. */
export function playTick() {
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = "square"
  osc.frequency.setValueAtTime(880, t)
  osc.frequency.exponentialRampToValueAtTime(320, t + 0.045)
  gain.gain.setValueAtTime(0.055, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

/** Cheerful ascending fanfare played when a winner is crowned. */
export function playFanfare() {
  const ac = getCtx()
  if (!ac) return
  const t0 = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => {
    const t = t0 + i * 0.09
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.32)
  })
}
