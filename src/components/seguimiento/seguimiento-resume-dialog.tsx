// seguimiento-resume-dialog.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock } from "lucide-react"

type ResumeProspect = {
  id: number
  nombre: string
  numero: string
  seguimiento_pausado?: boolean
}
function openNativePicker(ref: React.RefObject<HTMLInputElement | null>) {
  const el = ref.current
  if (!el) return
  ;(el as any).showPicker?.()
  el.focus()
}
interface SeguimientoResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospect: ResumeProspect | null
  loading?: boolean
  onSubmit: (payload: { dia: string; hora: string }) => Promise<void> | void
}

function getNowLocalHora() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mi = String(now.getMinutes()).padStart(2, "0")
  return `${hh}:${mi}`
}

export function SeguimientoResumeDialog({
  open,
  onOpenChange,
  prospect,
  loading = false,
  onSubmit,
}: SeguimientoResumeDialogProps) {
  const [dia, setDia] = useState("1")
  const [hora, setHora] = useState("")
const horaInputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (!open) return
    setDia("1")
    setHora(getNowLocalHora())
  }, [open, prospect?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dia || !hora) {
      alert("Día y hora son obligatorios")
      return
    }

    const diaNum = Number(dia)
    if (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31) {
      alert("El día debe estar entre 1 y 31")
      return
    }

    await onSubmit({ dia, hora })
  }

  const actionLabel = prospect?.seguimiento_pausado ? "Reanudar" : "Iniciar"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,96vw)] rounded-xl">
        <DialogHeader>
          <DialogTitle>{actionLabel} seguimiento</DialogTitle>
          <DialogDescription>
            {prospect
              ? `Elige el día y hora base del seguimiento de ${prospect.nombre}. La primera llamada se programará el próximo mes.`
              : "Elige el día y hora base del seguimiento."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="grid gap-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="resume-dia" className="mb-1 block">
                Día del mes
              </Label>
              <select
                id="resume-dia"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                {Array.from({ length: 31 }, (_, index) => String(index + 1)).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="resume-hora" className="mb-1 block">
                Hora
              </Label>
<div className="relative">
  <Input
    id="resume-hora"
    ref={horaInputRef}
    type="time"
    value={hora}
    onChange={(e) => setHora(e.target.value)}
    className="pr-12 picker-dark-clean h-10"
  />
  <button
    type="button"
    onClick={() => openNativePicker(horaInputRef)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white"
    aria-label="Seleccionar hora"
  >
    <Clock className="h-4 w-4" />
  </button>
</div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : actionLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
