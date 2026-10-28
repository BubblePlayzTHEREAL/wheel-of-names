"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowDownAZ,
  ListPlus,
  Plus,
  Shuffle,
  Trash2,
  X,
} from "lucide-react"
import { WHEEL_PALETTE } from "./Wheel"

interface NameManagerProps {
  names: string[]
  onAdd: (name: string) => boolean
  onRemove: (index: number) => void
  onImport: (list: string[]) => number
  onShuffle: () => void
  onSort: () => void
  onClear: () => void
}

export function NameManager({
  names,
  onAdd,
  onRemove,
  onImport,
  onShuffle,
  onSort,
  onClear,
}: NameManagerProps) {
  const [draft, setDraft] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")

  const submitDraft = () => {
    const value = draft.trim()
    if (!value) return
    onAdd(value)
    setDraft("")
  }

  const runImport = () => {
    const parsed = importText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    setImportText("")
    setImportOpen(false)
    if (parsed.length > 0) onImport(parsed)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Names</h2>
        <Badge variant="secondary" className="tabular-nums">
          {names.length} on wheel
        </Badge>
      </div>

      {/* add row */}
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              submitDraft()
            }
          }}
          placeholder="Add a name…"
          maxLength={60}
          aria-label="Add a name"
          enterKeyHint="done"
        />
        <Button
          onClick={submitDraft}
          disabled={!draft.trim()}
          aria-label="Add name to wheel"
          className="shrink-0"
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {/* toolbar */}
      <div className="mt-3 flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onShuffle}
              disabled={names.length < 2}
            >
              <Shuffle className="size-3.5" />
              Shuffle
            </Button>
          </TooltipTrigger>
          <TooltipContent>Randomly reorder segments</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onSort}
              disabled={names.length < 2}
            >
              <ArrowDownAZ className="size-3.5" />
              Sort
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sort names A to Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <ListPlus className="size-3.5" />
              Import
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paste a whole list at once</TooltipContent>
        </Tooltip>
        <span className="flex-1" />
        <AlertDialog>
          <Tooltip>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={names.length === 0}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            </AlertDialogTrigger>
            <TooltipContent>Remove every name</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove all names?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears all {names.length} name
                {names.length === 1 ? "" : "s"} from the wheel. You can add
                them again afterwards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep names</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClear}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Remove all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* list */}
      {names.length === 0 ? (
        <p className="flex-1 py-10 text-center text-sm text-muted-foreground">
          No names yet.
          <br />
          Add one above or import a list.
        </p>
      ) : (
        <ScrollArea className="mt-3 min-h-0 flex-1">
          <ul className="space-y-1 pb-2 pr-2.5">
            {names.map((name, i) => (
              <li
                key={`${i}-${name}`}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted/70"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: WHEEL_PALETTE[i % WHEEL_PALETTE.length],
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  #{i + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove ${name}`}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}

      {/* import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import names</DialogTitle>
            <DialogDescription>
              Paste names separated by new lines, commas, or semicolons.
              Duplicates are skipped automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Alice\nBob\nCharlie, Dana"}
            className="min-h-40 font-mono text-sm"
            aria-label="Names to import"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={runImport}
              disabled={
                importText.trim().length === 0 ||
                importText.split(/[\n,;]+/).every((s) => !s.trim())
              }
            >
              <ListPlus className="size-4" />
              Add to wheel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NameManager
