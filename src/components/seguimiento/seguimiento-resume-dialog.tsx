// seguimiento-resume-dialog.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { CalendarIcon, Clock } from "lucide-react"

type ResumeProspect = {
  id: number
  nombre: string
  numero: string
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
  onSubmit: (payload: { fecha: string; hora: string }) => Promise<void> | void
}

function getNowLocalFechaHora() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const hh = String(now.getHours()).padStart(2, "0")
  const mi = String(now.getMinutes()).padStart(2, "0")

  return {
    fecha: `${yyyy}-${mm}-${dd}`,
    hora: `${hh}:${mi}`,
  }
}

function getTodayYMD() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function SeguimientoResumeDialog({
  open,
  onOpenChange,
  prospect,
  loading = false,
  onSubmit,
}: SeguimientoResumeDialogProps) {
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const todayYMD = useMemo(() => getTodayYMD(), [])
const fechaInputRef = useRef<HTMLInputElement | null>(null)
const horaInputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (!open) return
    const nowParts = getNowLocalFechaHora()
    setFecha(nowParts.fecha)
    setHora(nowParts.hora)
  }, [open, prospect?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fecha || !hora) {
      alert("Fecha y hora son obligatorias")
      return
    }

    if (fecha < todayYMD) {
      alert("No puedes elegir una fecha anterior a hoy")
      return
    }

    await onSubmit({ fecha, hora })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,96vw)] rounded-xl">
        <DialogHeader>
          <DialogTitle>Reanudar seguimiento</DialogTitle>
          <DialogDescription>
            {prospect
              ? `Elige desde qué fecha y hora continuará el seguimiento de ${prospect.nombre}.`
              : "Elige la nueva fecha y hora del seguimiento."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="resume-fecha" className="mb-1 block">
                Fecha
              </Label>
<div className="relative">
  <Input
    id="resume-fecha"
    ref={fechaInputRef}
    type="date"
    min={todayYMD}
    value={fecha}
    onChange={(e) => setFecha(e.target.value)}
    className="pr-12 picker-dark-clean h-10"
  />
  <button
    type="button"
    onClick={() => openNativePicker(fechaInputRef)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white"
    aria-label="Seleccionar fecha"
  >
    <CalendarIcon className="h-4 w-4" />
  </button>
</div>
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
              {loading ? "Guardando..." : "Reanudar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}