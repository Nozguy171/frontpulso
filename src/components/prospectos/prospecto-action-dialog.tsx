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
import { AppointmentLocationPicker } from "@/components/citas/appointment-location-picker"
import { formatProspectPhone, getLastAppointmentLocation } from "@/lib/prospect"
import { ProspectTreatmentBadge } from "@/components/prospectos/prospect-treatment-badge"

import { Calendar as CalendarIcon, Phone, XCircle, Users, FileText, Clock, X } from "lucide-react"

import { API_BASE_URL } from "@/lib/api"

interface ProspectoActionsDialogProps {
  prospecto: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionCompleted?: (updated: any) => void
  mode?: "full" | "search"
}

type ProspectoMini = {
  id: number
  nombre: string
  numero: string
  lada?: string | null
  numero_formateado?: string | null
  numero_encuesta?: string | null
  trato_prospecto?: "enojado" | "feliz" | "neutral" | null
  estado?: string | null
}

type AmigosResponse = {
  recomendado_por: ProspectoMini | null
  recomendados: ProspectoMini[]
}

const MIN_RECHAZO_MOTIVO_LEN = 10
function formatFechaBonita(d?: Date) {
  if (!d) return "Selecciona fecha"
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
function openNativePicker(ref: React.RefObject<HTMLInputElement | null>) {
  const el = ref.current
  if (!el) return
  ;(el as any).showPicker?.()
  el.focus()
}
function toYMD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function getActingAsUserId(): string | null {
  const v = localStorage.getItem("pulso_acting_user_id")
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
  mode = "full",
}: ProspectoActionsDialogProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // dialogs internos
  const [openCita, setOpenCita] = useState(false)
  const [openLlamada, setOpenLlamada] = useState(false)
  const [openObs, setOpenObs] = useState(false)

const [targetAmigo, setTargetAmigo] = useState<ProspectoMini | null>(null)
const [openLlamadaAmigo, setOpenLlamadaAmigo] = useState(false)

  // ✅ NUEVO: modal motivo rechazo
  const [openRechazo, setOpenRechazo] = useState(false)
  const [rechazoMotivo, setRechazoMotivo] = useState("")
const rechazoMotivoLimpio = rechazoMotivo.trim().replace(/\s+/g, " ")
const rechazoMotivoValido = rechazoMotivoLimpio.length >= MIN_RECHAZO_MOTIVO_LEN
  // ✅ Amigos
  const [openAmigos, setOpenAmigos] = useState(false)
  const [amigosLoading, setAmigosLoading] = useState(false)
  const [amigosData, setAmigosData] = useState<AmigosResponse | null>(null)

  // estado para formularios
  const [citaFecha, setCitaFecha] = useState<Date | undefined>()
  const [citaHora, setCitaHora] = useState("")
  const [citaUbicacion, setCitaUbicacion] = useState("")
  const [citaUbicacionLat, setCitaUbicacionLat] = useState<number | null>(null)
  const [citaUbicacionLng, setCitaUbicacionLng] = useState<number | null>(null)
  const [citaObs, setCitaObs] = useState("")
const citaTimeInputRef = React.useRef<HTMLInputElement | null>(null)
const llamadaTimeInputRef = React.useRef<HTMLInputElement | null>(null)
const llamadaAmigoTimeInputRef = React.useRef<HTMLInputElement | null>(null)
  const [llamadaFecha, setLlamadaFecha] = useState<Date | undefined>()
  const [llamadaHora, setLlamadaHora] = useState("")
  const [llamadaObs, setLlamadaObs] = useState("")

  const [obsTexto, setObsTexto] = useState("")

  const disabled = loadingAction !== null
  const hasVenta = Number(prospecto?.venta_monto_sin_iva ?? 0) > 0
  const openCitaModal = () => {
    const last = getLastAppointmentLocation(prospecto)
    setCitaFecha(undefined)
    setCitaHora("")
    setCitaUbicacion(last.ubicacion)
    setCitaUbicacionLat(last.ubicacion_lat)
    setCitaUbicacionLng(last.ubicacion_lng)
    setCitaObs("")
    setOpenCita(true)
  }
  const openProgramarLlamadaPara = (p: ProspectoMini) => {
  setTargetAmigo(p)
  setLlamadaFecha(undefined)
  setLlamadaHora("")
  setLlamadaObs("")
  setOpenLlamadaAmigo(true)
}
const callAction = async (
  accion: string,
  extra: any = {},
  targetProspectId?: number
) => {
  setLoadingAction(accion)
  try {
    const token = localStorage.getItem("pulso_token")
    const actingAs = getActingAsUserId()

    const finalProspectId = targetProspectId ?? prospecto.id

    const res = await fetch(`${API_BASE_URL}/prospects/${finalProspectId}/acciones`, {
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
const handleAnexar = async () => {
    if (hasVenta) {
    alert("No puedes anexar un prospecto que ya tiene ventas registradas.")
    return
  }
  const ok = window.confirm(`¿Seguro que quieres anexar a ${prospecto?.nombre ?? "este prospecto"}?`)
  if (!ok) return

  await callAction("anexar")
}
  const handleSinRespuesta = () => callAction("sin_respuesta")

  // ✅ antes: const handleRechazado = () => callAction("rechazado")
  // ✅ ahora: abre modal para capturar motivo
  const handleRechazadoClick = () => {
      if (hasVenta) {
    alert("No puedes rechazar un prospecto que ya tiene ventas registradas.")
    return
  }
    setRechazoMotivo("")
    setOpenRechazo(true)
  }

const handleSubmitRechazo = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!rechazoMotivoValido) {
    alert(`Escribe un motivo de al menos ${MIN_RECHAZO_MOTIVO_LEN} caracteres`)
    return
  }

  const ok = await callAction("rechazado", { motivo: rechazoMotivoLimpio })
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
      ubicacion_lat: citaUbicacionLat,
      ubicacion_lng: citaUbicacionLng,
      observaciones: citaObs.trim() || undefined,
    })

    if (ok) {
      setOpenCita(false)
      setCitaUbicacion("")
      setCitaUbicacionLat(null)
      setCitaUbicacionLng(null)
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

const handleSubmitLlamadaAmigo = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!targetAmigo) {
    alert("No se seleccionó ningún amigo")
    return
  }

  if (!llamadaFecha || !llamadaHora) {
    alert("Fecha y hora son obligatorias para la llamada")
    return
  }

  const ok = await callAction(
    "programar_llamada",
    {
      fecha: toYMD(llamadaFecha),
      hora: llamadaHora,
      observaciones: llamadaObs.trim() || undefined,
    },
    targetAmigo.id
  )

  if (ok) {
    setOpenLlamadaAmigo(false)
    setTargetAmigo(null)
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
            flex h-[calc(100dvh-1rem)] max-h-[36rem] w-[95vw] max-w-none flex-col
            overflow-hidden p-0 sm:max-w-[420px]
          "
        >
          <div className="sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur">
            <div className="flex items-start justify-between gap-3 p-4 sm:p-6">
              <div className="min-w-0">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-lg sm:text-xl truncate">
                    {prospecto?.nombre ?? "Prospecto"}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Acciones rápidas del prospecto
                  </DialogDescription>
                  <ProspectTreatmentBadge prospect={prospecto} />
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

          <ScrollArea className="min-h-0 flex-1">
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
                onClick={openCitaModal}
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
  disabled={disabled || hasVenta}
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

<Button
  variant="outline"
  className="justify-start gap-3 bg-transparent h-11 text-destructive"
  onClick={handleAnexar}
  disabled={disabled || hasVenta}
>
    <XCircle className="h-5 w-5" />
    Anexar
  </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ✅ NUEVO: Modal Motivo Rechazo */}
{/* ✅ NUEVO: Modal Motivo Rechazo */}
<Dialog open={openRechazo} onOpenChange={setOpenRechazo}>
  <DialogContent className="w-[95vw] max-w-none sm:max-w-[520px]">
    <DialogHeader>
      <DialogTitle className="text-lg sm:text-xl">Motivo de rechazo</DialogTitle>
      <DialogDescription>
        Escribe por qué el prospecto dijo que no. Este campo es obligatorio.
      </DialogDescription>
      <ProspectTreatmentBadge prospect={prospecto} />
    </DialogHeader>

    <form onSubmit={handleSubmitRechazo} autoComplete="off" className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="rechazo-motivo">Motivo</Label>
        <Textarea
          id="rechazo-motivo"
          rows={4}
          placeholder="Ej: No le interesa en este momento / No tiene presupuesto / Ya compró con otra persona..."
          value={rechazoMotivo}
          onChange={(e) => setRechazoMotivo(e.target.value)}
        />

        <p
          className={`text-xs ${
            rechazoMotivo.length === 0
              ? "text-muted-foreground"
              : rechazoMotivoValido
                ? "text-muted-foreground"
                : "text-destructive"
          }`}
        >
          {rechazoMotivo.length === 0
            ? `Escribe al menos ${MIN_RECHAZO_MOTIVO_LEN} caracteres.`
            : rechazoMotivoValido
              ? "Motivo válido ✅"
              : `Te faltan ${Math.max(
                  0,
                  MIN_RECHAZO_MOTIVO_LEN - rechazoMotivoLimpio.length
                )} caracteres.`}
        </p>
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
        <Button
          type="submit"
          disabled={disabled || !rechazoMotivoValido}
          className="w-full sm:w-auto"
        >
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
            <ProspectTreatmentBadge prospect={prospecto} />
          </DialogHeader>

          <div className="space-y-4">
            {amigosLoading ? (
              <div className="text-sm text-muted-foreground">Cargando...</div>
            ) : (
              <>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Recomendado por</div>
{amigosData?.recomendado_por ? (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="font-medium">{amigosData.recomendado_por.nombre}</div>
      <div className="text-xs text-muted-foreground font-mono">
        {formatProspectPhone(amigosData.recomendado_por)} • Encuesta: {amigosData.recomendado_por.numero_encuesta ?? "—"} • ID {amigosData.recomendado_por.id}
      </div>
      <ProspectTreatmentBadge prospect={amigosData.recomendado_por} className="mt-2" />
    </div>

    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => openProgramarLlamadaPara(amigosData.recomendado_por!)}
    >
      <Phone className="h-4 w-4 mr-2" />
      Agendar llamada
    </Button>
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
  <div key={p.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="font-medium">{p.nombre}</div>
      <div className="text-xs text-muted-foreground font-mono">
        {formatProspectPhone(p)} • Encuesta: {p.numero_encuesta ?? "—"} • {p.estado ?? "—"} • ID {p.id}
      </div>
      <ProspectTreatmentBadge prospect={p} className="mt-2" />
    </div>

    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => openProgramarLlamadaPara(p)}
    >
      <Phone className="h-4 w-4 mr-2" />
      Agendar llamada
    </Button>
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

<Dialog open={openLlamadaAmigo} onOpenChange={setOpenLlamadaAmigo}>
  <DialogContent className="w-[95vw] max-w-none sm:max-w-[520px]">
    <DialogHeader>
      <DialogTitle className="text-lg sm:text-xl">
        Programar llamada con {targetAmigo?.nombre ?? "amigo"}
      </DialogTitle>
      <DialogDescription>
        Esta llamada se agendará para el prospecto relacionado en Amigos.
      </DialogDescription>
      <ProspectTreatmentBadge prospect={targetAmigo} />
    </DialogHeader>

    <form onSubmit={handleSubmitLlamadaAmigo} autoComplete="off" className="space-y-4 pt-2">
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
  <div className="relative">
    <Input
      ref={llamadaAmigoTimeInputRef}
      type="time"
      value={llamadaHora}
      onChange={(e) => setLlamadaHora(e.target.value)}
      className="pr-10 h-11 dark:[color-scheme:dark]"
    />
    <button
      type="button"
      onClick={() => openNativePicker(llamadaAmigoTimeInputRef)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label="Seleccionar hora"
    >
      <Clock className="h-4 w-4" />
    </button>
  </div>
</div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="llamada-amigo-obs">Observaciones (opcional)</Label>
        <Textarea
          id="llamada-amigo-obs"
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
          onClick={() => {
            setOpenLlamadaAmigo(false)
            setTargetAmigo(null)
          }}
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

      {/* Modal: Agendar cita (RESPONSIVE) */}
      <Dialog open={openCita} onOpenChange={setOpenCita}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Agendar cita con {prospecto.nombre}
            </DialogTitle>
            <ProspectTreatmentBadge prospect={prospecto} />
          </DialogHeader>

          <form onSubmit={handleSubmitCita} autoComplete="off" className="space-y-4 pt-2">
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
  <div className="relative">
    <Input
      ref={citaTimeInputRef}
      type="time"
      value={citaHora}
      onChange={(e) => setCitaHora(e.target.value)}
      className="pr-10 h-11 dark:[color-scheme:dark]"
    />
    <button
      type="button"
      onClick={() => openNativePicker(citaTimeInputRef)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label="Seleccionar hora"
    >
      <Clock className="h-4 w-4" />
    </button>
  </div>
</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cita-ubicacion">Ubicación</Label>
              <AppointmentLocationPicker
                inputId="cita-ubicacion"
                value={{
                  ubicacion: citaUbicacion,
                  ubicacion_lat: citaUbicacionLat,
                  ubicacion_lng: citaUbicacionLng,
                }}
                onChange={(next) => {
                  setCitaUbicacion(next.ubicacion)
                  setCitaUbicacionLat(next.ubicacion_lat)
                  setCitaUbicacionLng(next.ubicacion_lng)
                }}
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
            <ProspectTreatmentBadge prospect={prospecto} />
          </DialogHeader>

          <form onSubmit={handleSubmitLlamada} autoComplete="off" className="space-y-4 pt-2">
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
  <div className="relative">
    <Input
      ref={llamadaTimeInputRef}
      type="time"
      value={llamadaHora}
      onChange={(e) => setLlamadaHora(e.target.value)}
      className="pr-10 h-11 dark:[color-scheme:dark]"
    />
    <button
      type="button"
      onClick={() => openNativePicker(llamadaTimeInputRef)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label="Seleccionar hora"
    >
      <Clock className="h-4 w-4" />
    </button>
  </div>
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
            <ProspectTreatmentBadge prospect={prospecto} />
          </DialogHeader>

          <form onSubmit={handleSubmitObs} autoComplete="off" className="space-y-4 pt-2">
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
