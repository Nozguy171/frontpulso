"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// shadcn extras
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

import { Calendar as CalendarIcon, Phone, XCircle, Users, FileText, Clock, X } from "lucide-react"

import { API_BASE_URL } from "@/lib/api"

interface ProspectoActionsDialogProps {
  prospecto: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionCompleted?: (updated: any) => void
}

type ProspectoMini = {
  id: number
  nombre: string
  numero: string
  estado?: string | null
}

type AmigosResponse = {
  recomendado_por: ProspectoMini | null
  recomendados: ProspectoMini[]
}

const timeOptions = [
  "08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30",
]

function formatFechaBonita(d?: Date) {
  if (!d) return "Selecciona fecha"
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function toYMD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function getActingAsUserId(): string | null {
  const v = localStorage.getItem("pulso_acting_as_user_id")
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
}

export function ProspectoActionsDialog({
  prospecto,
  open,
  onOpenChange,
  onActionCompleted,
}: ProspectoActionsDialogProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // dialogs internos
  const [openCita, setOpenCita] = useState(false)
  const [openLlamada, setOpenLlamada] = useState(false)
  const [openObs, setOpenObs] = useState(false)

  // ✅ NUEVO: modal motivo rechazo
  const [openRechazo, setOpenRechazo] = useState(false)
  const [rechazoMotivo, setRechazoMotivo] = useState("")

  // ✅ Amigos
  const [openAmigos, setOpenAmigos] = useState(false)
  const [amigosLoading, setAmigosLoading] = useState(false)
  const [amigosData, setAmigosData] = useState<AmigosResponse | null>(null)

  // estado para formularios
  const [citaFecha, setCitaFecha] = useState<Date | undefined>()
  const [citaHora, setCitaHora] = useState("")
  const [citaUbicacion, setCitaUbicacion] = useState("")
  const [citaObs, setCitaObs] = useState("")

  const [llamadaFecha, setLlamadaFecha] = useState<Date | undefined>()
  const [llamadaHora, setLlamadaHora] = useState("")
  const [llamadaObs, setLlamadaObs] = useState("")

  const [obsTexto, setObsTexto] = useState("")

  const disabled = loadingAction !== null

  const callAction = async (accion: string, extra: any = {}) => {
    setLoadingAction(accion)
    try {
      const token = localStorage.getItem("pulso_token")
      const actingAs = getActingAsUserId()

      const res = await fetch(`${API_BASE_URL}/prospects/${prospecto.id}/acciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
        },
        body: JSON.stringify({ accion, ...extra }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error(data)
        alert(data.message ?? "Error al aplicar acción")
        return null
      }

      onActionCompleted?.(data.prospecto)
      onOpenChange(false)
      return data.prospecto
    } catch (err) {
      console.error(err)
      alert("Error de conexión con el servidor")
      return null
    } finally {
      setLoadingAction(null)
    }
  }

  const handleSinRespuesta = () => callAction("sin_respuesta")

  // ✅ antes: const handleRechazado = () => callAction("rechazado")
  // ✅ ahora: abre modal para capturar motivo
  const handleRechazadoClick = () => {
    setRechazoMotivo("")
    setOpenRechazo(true)
  }

  const handleSubmitRechazo = async (e: React.FormEvent) => {
    e.preventDefault()
    const motivo = rechazoMotivo.trim()
    if (!motivo) {
      alert("Escribe el motivo del rechazo")
      return
    }

    const ok = await callAction("rechazado", { motivo })
    if (ok) {
      setOpenRechazo(false)
      setRechazoMotivo("")
    }
  }

  // -------- Agendar cita ----------
  const handleSubmitCita = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!citaFecha || !citaHora || !citaUbicacion.trim()) {
      alert("Fecha, hora y ubicación son obligatorias")
      return
    }

    const ok = await callAction("agendar_cita", {
      fecha: toYMD(citaFecha),
      hora: citaHora,
      ubicacion: citaUbicacion.trim(),
      observaciones: citaObs.trim() || undefined,
    })

    if (ok) {
      setOpenCita(false)
      setCitaObs("")
    }
  }

  // -------- Programar llamada ----------
  const handleSubmitLlamada = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!llamadaFecha || !llamadaHora) {
      alert("Fecha y hora son obligatorias para la llamada")
      return
    }

    const ok = await callAction("programar_llamada", {
      fecha: toYMD(llamadaFecha),
      hora: llamadaHora,
      observaciones: llamadaObs.trim() || undefined,
    })

    if (ok) {
      setOpenLlamada(false)
      setLlamadaObs("")
    }
  }

  // -------- Añadir observaciones ----------
  const handleSubmitObs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!obsTexto.trim()) {
      alert("Las observaciones no pueden estar vacías")
      return
    }

    const ok = await callAction("observaciones", {
      observaciones: obsTexto.trim(),
    })

    if (ok) {
      setOpenObs(false)
      setObsTexto("")
    }
  }

  // ✅ cargar amigos cuando abres el modal
  useEffect(() => {
    if (!openAmigos) return
    if (!prospecto?.id) return

    let alive = true

    ;(async () => {
      try {
        setAmigosLoading(true)
        setAmigosData(null)

        const token = localStorage.getItem("pulso_token")
        const actingAs = getActingAsUserId()

        const res = await fetch(`${API_BASE_URL}/prospects/${prospecto.id}/amigos`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
          },
        })

        const data = (await res.json()) as any
        if (!res.ok) throw new Error(data?.message ?? "Error cargando amigos")

        if (!alive) return
        setAmigosData({
          recomendado_por: data?.recomendado_por ?? null,
          recomendados: data?.recomendados ?? [],
        })
      } catch (e) {
        console.error(e)
        if (!alive) return
        setAmigosData({ recomendado_por: null, recomendados: [] })
      } finally {
        if (!alive) return
        setAmigosLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [openAmigos, prospecto?.id])

  return (
    <>
      {/* Dialog principal de acciones (RESPONSIVE) */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="
            w-[95vw] max-w-none sm:max-w-[420px]
            p-0 overflow-hidden
          "
        >
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
            <div className="flex items-start justify-between gap-3 p-4 sm:p-6">
              <div className="min-w-0">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-lg sm:text-xl truncate">
                    {prospecto?.nombre ?? "Prospecto"}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Acciones rápidas del prospecto
                  </DialogDescription>
                </DialogHeader>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cerrar"
                onClick={() => onOpenChange(false)}
                className="shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[75vh]">
            <div className="grid gap-2 p-4 sm:p-6">
              <Button
                variant="outline"
                className="justify-start gap-3 bg-transparent h-11"
                onClick={handleSinRespuesta}
                disabled={disabled}
              >
                <XCircle className="h-5 w-5" />
                Sin respuesta
              </Button>

              <Button
                variant="outline"
                className="justify-start gap-3 bg-transparent h-11"
                onClick={() => setOpenCita(true)}
                disabled={disabled}
              >
                <CalendarIcon className="h-5 w-5" />
                Agendar cita
              </Button>

              {/* ✅ Rechazado ahora pide motivo */}
              <Button
                variant="outline"
                className="justify-start gap-3 bg-transparent h-11"
                onClick={handleRechazadoClick}
                disabled={disabled}
              >
                <XCircle className="h-5 w-5 text-destructive" />
                Rechazado
              </Button>

              <Button
                variant="outline"
                className="justify-start gap-3 bg-transparent h-11"
                onClick={() => setOpenLlamada(true)}
                disabled={disabled}
              >
                <Phone className="h-5 w-5" />
                Programar llamada
              </Button>

              {/* ✅ Amigos conectado */}
              <Button
                variant="outline"
                className="justify-start gap-3 bg-transparent h-11"
                onClick={() => setOpenAmigos(true)}
                disabled={disabled}
              >
                <Users className="h-5 w-5" />
                Ver amigos
              </Button>

              <Button
                variant="outline"
                className="justify-start gap-3 bg-transparent h-11"
                onClick={() => setOpenObs(true)}
                disabled={disabled}
              >
                <FileText className="h-5 w-5" />
                Añadir observaciones
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ✅ NUEVO: Modal Motivo Rechazo */}
      <Dialog open={openRechazo} onOpenChange={setOpenRechazo}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Motivo de rechazo</DialogTitle>
            <DialogDescription>
              Escribe por qué el prospecto dijo que NO. (Obligatorio)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRechazo} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="rechazo-motivo">Motivo</Label>
              <Textarea
                id="rechazo-motivo"
                rows={4}
                placeholder="Ej: No le interesa / No tiene presupuesto / Ya compró con otra persona..."
                value={rechazoMotivo}
                onChange={(e) => setRechazoMotivo(e.target.value)}
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenRechazo(false)}
                className="w-full sm:w-auto"
                disabled={disabled}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
                {loadingAction === "rechazado" ? "Guardando..." : "Rechazar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal: Amigos */}
      <Dialog open={openAmigos} onOpenChange={setOpenAmigos}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Amigos</DialogTitle>
            <DialogDescription>
              Quién lo recomendó y a quiénes recomendó este prospecto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {amigosLoading ? (
              <div className="text-sm text-muted-foreground">Cargando...</div>
            ) : (
              <>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Recomendado por</div>
                  {amigosData?.recomendado_por ? (
                    <div>
                      <div className="font-medium">{amigosData.recomendado_por.nombre}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {amigosData.recomendado_por.numero} • ID {amigosData.recomendado_por.id}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </div>

                <div className="rounded-md border">
                  <div className="p-3 border-b">
                    <div className="text-xs text-muted-foreground">A quiénes recomendó</div>
                  </div>

                  <ScrollArea className="h-[45vh]">
                    <div className="p-2 grid gap-2">
                      {(amigosData?.recomendados ?? []).length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          No ha recomendado a nadie.
                        </div>
                      ) : (
                        amigosData!.recomendados.map((p) => (
                          <div key={p.id} className="rounded-md border p-3">
                            <div className="font-medium">{p.nombre}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {p.numero} • {p.estado ?? "—"} • ID {p.id}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenAmigos(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Agendar cita (RESPONSIVE) */}
      <Dialog open={openCita} onOpenChange={setOpenCita}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Agendar cita con {prospecto.nombre}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitCita} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-between text-left font-normal h-11",
                        !citaFecha && "text-muted-foreground"
                      )}
                    >
                      <span>{formatFechaBonita(citaFecha)}</span>
                      <CalendarIcon className="h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar mode="single" selected={citaFecha} onSelect={setCitaFecha} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Hora</Label>
                <Select value={citaHora} onValueChange={(value) => setCitaHora(value)}>
                  <SelectTrigger className="w-full justify-between h-11">
                    <SelectValue placeholder="Selecciona hora" />
                    <Clock className="h-4 w-4 opacity-70" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cita-ubicacion">Ubicación</Label>
              <Input
                id="cita-ubicacion"
                placeholder="Consultorio, café, domicilio, etc."
                value={citaUbicacion}
                onChange={(e) => setCitaUbicacion(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cita-obs">Observaciones (opcional)</Label>
              <Textarea
                id="cita-obs"
                rows={3}
                placeholder="Notas adicionales sobre la cita"
                value={citaObs}
                onChange={(e) => setCitaObs(e.target.value)}
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCita(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
                {loadingAction === "agendar_cita" ? "Guardando..." : "Guardar cita"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Programar llamada (RESPONSIVE) */}
      <Dialog open={openLlamada} onOpenChange={setOpenLlamada}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Programar llamada con {prospecto.nombre}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitLlamada} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-between text-left font-normal h-11",
                        !llamadaFecha && "text-muted-foreground"
                      )}
                    >
                      <span>{formatFechaBonita(llamadaFecha)}</span>
                      <CalendarIcon className="h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar mode="single" selected={llamadaFecha} onSelect={setLlamadaFecha} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Hora</Label>
                <Select value={llamadaHora} onValueChange={(value) => setLlamadaHora(value)}>
                  <SelectTrigger className="w-full justify-between h-11">
                    <SelectValue placeholder="Selecciona hora" />
                    <Clock className="h-4 w-4 opacity-70" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llamada-obs">Observaciones (opcional)</Label>
              <Textarea
                id="llamada-obs"
                rows={3}
                placeholder="Notas para recordar contexto de la llamada"
                value={llamadaObs}
                onChange={(e) => setLlamadaObs(e.target.value)}
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenLlamada(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
                {loadingAction === "programar_llamada" ? "Guardando..." : "Guardar llamada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Añadir observaciones (RESPONSIVE) */}
      <Dialog open={openObs} onOpenChange={setOpenObs}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Observaciones adicionales</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitObs} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="obs-texto">Observaciones</Label>
              <Textarea
                id="obs-texto"
                rows={4}
                placeholder="Escribe notas adicionales sobre el prospecto..."
                value={obsTexto}
                onChange={(e) => setObsTexto(e.target.value)}
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenObs(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
                {loadingAction === "observaciones" ? "Guardando..." : "Guardar observaciones"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}