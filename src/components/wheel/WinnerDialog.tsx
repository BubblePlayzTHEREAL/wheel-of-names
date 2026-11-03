"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, RotateCw, UserMinus, Trophy } from "lucide-react"

const CONFETTI_COLORS = [
  "#e11d48",
  "#ea580c",
  "#d97706",
  "#65a30d",
  "#059669",
  "#db2777",
  "#fbbf24",
]

interface WinnerDialogProps {
  open: boolean
  winner: string | null
  canRemoveWinner: boolean
  onSpinAgain: () => void
  onRemoveAndSpin: () => void
  onClose: () => void
}

export function WinnerDialog({
  open,
  winner,
  canRemoveWinner,
  onSpinAgain,
  onRemoveAndSpin,
  onClose,
}: WinnerDialogProps) {
  useEffect(() => {
    if (!open || !winner) return
    const fire = () => {
      confetti({
        particleCount: 90,
        spread: 80,
        startVelocity: 42,
        origin: { y: 0.55 },
        colors: CONFETTI_COLORS,
      })
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 62,
        origin: { x: 0, y: 0.75 },
        colors: CONFETTI_COLORS,
      })
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 62,
        origin: { x: 1, y: 0.75 },
        colors: CONFETTI_COLORS,
      })
    }
    fire()
    const again = setTimeout(fire, 650)
    return () => clearTimeout(again)
  }, [open, winner])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-500 shadow-lg">
            <Trophy className="size-8 text-white" aria-hidden="true" />
          </div>
          <DialogTitle className="sr-only">Winner picked</DialogTitle>
          <DialogDescription className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            The wheel has chosen
          </DialogDescription>
          <p className="break-all text-4xl font-extrabold leading-tight text-rose-600 dark:text-rose-400 sm:text-5xl">
            {winner}
          </p>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {canRemoveWinner && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onRemoveAndSpin}
            >
              <UserMinus className="size-4" />
              Remove winner &amp; spin again
            </Button>
          )}
          <Button
            className="w-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
            onClick={onSpinAgain}
          >
            <RotateCw className="size-4" />
            Spin again
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            <Check className="size-4" />
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default WinnerDialog
