"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, MapPin, MoreVertical, Clock, StickyNote, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_BASE_URL } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const AppLayout = dynamic(() => import("@/components/layout/app-layout").then((m) => m.AppLayout), { ssr: false })

type CitaDTO = {
  id: number
  fecha_hora: string
  ubicacion: string
  observaciones?: string | null
  estado: string
  estado_label?: string | null
  estado_detalle?: string | null
  resolved_at?: string | null
prospect?: {
  id: number
  nombre: string
  numero: string
  estado?: string | null
  forma_obtencion_tipo?: "encuesta" | "cita_en_frio" | "otro" | null
  forma_obtencion?: string | null
  venta_monto_sin_iva?: number | null
} | null
}

type DaysResponse = { days: { day: string; count: number }[] }

// ✅ Historial real (backend /history)
type HistoryItemDTO = {
  id: number
  accion: string
  detalle?: string | null
  created_at: string
  actor?: { id: number | null; email: string | null } | null
  effective?: { id: number | null; email: string | null } | null
  user?: { id: number | null; email: string | null } | null
}

function getActingAsUserId(): string | null {
  const v = localStorage.getItem("pulso_acting_user_id")
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
}
function getDiffMs(iso: string) {
  return new Date(iso).getTime() - Date.now()
}

function isUpcomingAppointment(iso: string) {
  return getDiffMs(iso) >= 0
}

function getAppointmentPriority(iso: string): "danger" | "warning" | "safe" {
  const diffMs = getDiffMs(iso)

  if (diffMs <= 60 * 60 * 1000) return "danger" // 1 hora o menos
  if (diffMs <= 3 * 60 * 60 * 1000) return "warning" // 3 horas o menos
  return "safe"
}

function getAppointmentPriorityLabel(iso: string) {
  const diffMs = getDiffMs(iso)

  if (diffMs < 0) return "Vencida"
  if (diffMs <= 60 * 60 * 1000) return "Urgente"
  if (diffMs <= 3 * 60 * 60 * 1000) return "Próxima"
  return "A tiempo"
}

function getAppointmentPriorityClasses(iso: string) {
  const priority = getAppointmentPriority(iso)

  if (priority === "danger") {
    return {
      card: "border-red-500/60 bg-red-500/5",
      badge: "border-red-500/50 text-red-600 dark:text-red-400",
      dot: "bg-red-500",
    }
  }

  if (priority === "warning") {
    return {
      card: "border-yellow-500/60 bg-yellow-500/5",
      badge: "border-yellow-500/50 text-yellow-700 dark:text-yellow-400",
      dot: "bg-yellow-500",
    }
  }

  return {
    card: "border-green-500/60 bg-green-500/5",
    badge: "border-green-500/50 text-green-700 dark:text-green-400",
    dot: "bg-green-500",
  }
}
async function apiGet(path: string) {
  const token = localStorage.getItem("pulso_token")
  const actingAs = getActingAsUserId()

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
    },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiPost(path: string, body: any) {
  const token = localStorage.getItem("pulso_token")
  const actingAs = getActingAsUserId()

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
const MIN_RECHAZO_MOTIVO_LEN = 10
// YYYY-MM-DD LOCAL (sin timezone)
function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDiaLargo(d?: Date) {
  if (!d) return ""
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
}

function formatFechaCorta(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX")
}

function formatFechaHora(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
}

function getCitaStatusVisual(estado?: string | null) {
  switch ((estado || "").toLowerCase()) {
    case "programada":
      return {
        card: "border-yellow-500/60 bg-yellow-500/5",
        badge: "border-yellow-500/50 text-yellow-700 dark:text-yellow-400",
        labelFallback: "Pendiente",
      }
    case "reagendada":
      return {
        card: "border-orange-500/60 bg-orange-500/5",
        badge: "border-orange-500/50 text-orange-700 dark:text-orange-400",
        labelFallback: "Reagendada",
      }
    case "vendida":
      return {
        card: "border-green-500/60 bg-green-500/5",
        badge: "border-green-500/50 text-green-700 dark:text-green-400",
        labelFallback: "Vendida",
      }
    case "rechazada":
      return {
        card: "border-red-500/60 bg-red-500/5",
        badge: "border-red-500/50 text-red-700 dark:text-red-400",
        labelFallback: "Rechazada",
      }
    case "anexada":
      return {
        card: "border-slate-500/60 bg-slate-500/5",
        badge: "border-slate-500/50 text-slate-700 dark:text-slate-400",
        labelFallback: "Anexada",
      }
    case "cancelada":
      return {
        card: "border-slate-500/60 bg-slate-500/5",
        badge: "border-slate-500/50 text-slate-700 dark:text-slate-400",
        labelFallback: "Cancelada",
      }
    default:
      return {
        card: "border-border/50 bg-card",
        badge: "",
        labelFallback: estado || "—",
      }
  }
}

function getAutor(h: HistoryItemDTO) {
  return h.effective?.email || h.user?.email || h.actor?.email || "—"
}
function hasCitaActions(cita: CitaDTO) {
  return (cita.estado || "").toLowerCase() === "programada"
}

function sortCitasActionableFirst(a: CitaDTO, b: CitaDTO) {
  const aHasActions = hasCitaActions(a) ? 0 : 1
  const bHasActions = hasCitaActions(b) ? 0 : 1

  if (aHasActions !== bHasActions) return aHasActions - bHasActions

  return +new Date(a.fecha_hora) - +new Date(b.fecha_hora)
}
function isSoldLikeAppointment(cita: CitaDTO) {
  const estado = (cita.prospect?.estado ?? "").toLowerCase()
  return estado === "seguimiento" || estado === "vendido" || cita.prospect?.venta_monto_sin_iva != null
}

// rango del mes (LOCAL)
function monthRange(base: Date) {
  const from = new Date(base.getFullYear(), base.getMonth(), 1)
  const to = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return { from, to }
}
function CitaActionsMenu({
  onAction,
  allowRejectLike = true,
}: {
  onAction?: (
    action: "reagendar" | "programar_llamada" | "vendido" | "rechazado" | "observaciones"
  ) => void
  allowRejectLike?: boolean
}) {
  return (
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Acciones">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("reagendar")
            }}
          >
            Reagendar cita
          </DropdownMenuItem>


<DropdownMenuItem
  onSelect={(e) => {
    e.preventDefault()
    onAction?.("programar_llamada")
  }}
>
  Programar llamada
</DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("vendido")
            }}
          >
            Marcar vendido
          </DropdownMenuItem>

          {allowRejectLike ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                onAction?.("rechazado")
              }}
            >
              Rechazado
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("observaciones")
            }}
          >
            Agregar observaciones
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type ActionState =
  | null
  | { type: "reagendar"; cita: CitaDTO }
  | { type: "programar_llamada"; cita: CitaDTO }
  | { type: "vendido"; cita: CitaDTO }
  | { type: "rechazado"; cita: CitaDTO }
  | { type: "observaciones"; cita: CitaDTO }

// helper: abre picker nativo si existe (Chrome/Edge), si no, focus.
function openNativePicker(ref: React.RefObject<HTMLInputElement | null>) {
  const el = ref.current
  if (!el) return
  ;(el as any).showPicker?.()
  el.focus()
}

export function CitasView() {
  const [tab, setTab] = useState<"list" | "calendar">("list")

  const [date, setDate] = useState<Date | undefined>(new Date())
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date())

  const [citas, setCitas] = useState<CitaDTO[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [errorList, setErrorList] = useState<string | null>(null)

  const [diasConCitasSet, setDiasConCitasSet] = useState<Set<string>>(new Set())
  const [loadingDays, setLoadingDays] = useState(false)

  const [citasDelDia, setCitasDelDia] = useState<CitaDTO[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [errorDay, setErrorDay] = useState<string | null>(null)

  const [search, setSearch] = useState("")

  const [openCitaId, setOpenCitaId] = useState<number | null>(null)

  const selectedCita = useMemo(
    () => citas.find((c) => c.id === openCitaId) ?? citasDelDia.find((c) => c.id === openCitaId) ?? null,
    [openCitaId, citas, citasDelDia]
  )

  const openCita = (id: number) => setOpenCitaId(id)

  // ✅ Historial de notas del prospecto (desde /history)
  const [prospectNotes, setProspectNotes] = useState<HistoryItemDTO[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [errorNotes, setErrorNotes] = useState<string | null>(null)

  const refreshNotes = async (prospectId: number) => {
    setLoadingNotes(true)
    setErrorNotes(null)
    try {
      const data = await apiGet(`/history/?prospect_id=${encodeURIComponent(String(prospectId))}&limit=200`)
      const items: HistoryItemDTO[] = (data?.historial || []) as any

      const notas = items
        .filter((x) => (x?.accion || "").toLowerCase() === "observaciones")
        .filter((x) => (x?.detalle || "").trim().length > 0)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))

      setProspectNotes(notas)
    } catch (e: any) {
      setErrorNotes(e?.message || "No se pudieron cargar las notas del prospecto")
      setProspectNotes([])
    } finally {
      setLoadingNotes(false)
    }
  }

  // cuando abres el modal detalle, carga notas del prospecto
  useEffect(() => {
    let cancelled = false
    const prospectId = selectedCita?.prospect?.id

    if (!openCitaId || !prospectId) {
      setProspectNotes([])
      setErrorNotes(null)
      setLoadingNotes(false)
      return
    }

    setLoadingNotes(true)
    setErrorNotes(null)

    ;(async () => {
      try {
        const data = await apiGet(`/history/?prospect_id=${encodeURIComponent(String(prospectId))}&limit=200`)
        if (cancelled) return

        const items: HistoryItemDTO[] = (data?.historial || []) as any
        const notas = items
          .filter((x) => (x?.accion || "").toLowerCase() === "observaciones")
          .filter((x) => (x?.detalle || "").trim().length > 0)
          .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))

        setProspectNotes(notas)
      } catch (e: any) {
        if (cancelled) return
        setErrorNotes(e?.message || "No se pudieron cargar las notas del prospecto")
        setProspectNotes([])
      } finally {
        if (!cancelled) setLoadingNotes(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [openCitaId, selectedCita?.prospect?.id])

  // ====== MODAL ACCIONES ======
  const [actionOpen, setActionOpen] = useState<ActionState>(null)
  const [savingAction, setSavingAction] = useState(false)

  const [formFecha, setFormFecha] = useState("")
  const [formHora, setFormHora] = useState("")
  const [formUbicacion, setFormUbicacion] = useState("")
  const [formObs, setFormObs] = useState("")
const [formTipoVenta, setFormTipoVenta] = useState<"" | "contado" | "credito">("")
const [formMontoConIva, setFormMontoConIva] = useState("")
const [formIvaMonto, setFormIvaMonto] = useState("")
  const [formMotivo, setFormMotivo] = useState("")
const motivoRechazoLimpio = formMotivo.trim().replace(/\s+/g, " ")
const motivoRechazoValido = motivoRechazoLimpio.length >= MIN_RECHAZO_MOTIVO_LEN
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const timeInputRef = useRef<HTMLInputElement | null>(null)
const montoConIvaNum = Number(formMontoConIva)
const ivaPorcentajeNum = Number(formIvaMonto)

const montoSinIvaCalculado = useMemo(() => {
  if (!formMontoConIva || !formIvaMonto) return null
  if (!Number.isFinite(montoConIvaNum) || !Number.isFinite(ivaPorcentajeNum)) return null
  if (ivaPorcentajeNum < 0) return null

  const divisor = 1 + ivaPorcentajeNum / 100
  if (!Number.isFinite(divisor) || divisor <= 0) return null

  return montoConIvaNum / divisor
}, [formMontoConIva, formIvaMonto, montoConIvaNum, ivaPorcentajeNum])
const resetActionForms = () => {
  setFormFecha("")
  setFormHora("")
  setFormUbicacion("")
  setFormObs("")
  setFormMotivo("")
  setFormTipoVenta("")
  setFormMontoConIva("")
  setFormIvaMonto("")
}

  const refreshAll = async () => {
    const today = ymd(new Date())
    const base = visibleMonth ?? new Date()
    const { from, to } = monthRange(base)

const [listData, daysData, dayData] = await Promise.all([
  apiGet(`/appointments/?from=${encodeURIComponent(today)}&limit=200`),
  apiGet(`/appointments/days?from=${encodeURIComponent(ymd(from))}&to=${encodeURIComponent(ymd(to))}`),
  date ? apiGet(`/appointments/?day=${encodeURIComponent(ymd(date))}`) : Promise.resolve({ citas: [] }),
])

    setCitas((listData.citas || []) as CitaDTO[])

    const s = new Set<string>()
    for (const d of (daysData.days || []) as any[]) s.add(d.day)
    setDiasConCitasSet(s)

    setCitasDelDia((dayData.citas || []) as CitaDTO[])
  }

const onCitaAction = (
  action: "reagendar" | "programar_llamada" | "vendido" | "rechazado" | "observaciones",
  cita: CitaDTO
) => {
    if (!cita?.prospect?.id) return
    if (cita.estado !== "programada") return

    if (isSoldLikeAppointment(cita) && action === "rechazado") {
      alert("No puedes marcar como rechazado a un prospecto que ya tiene ventas.")
      return
    }

    resetActionForms()

    if (action === "reagendar") {
      // ✅ precargar fecha/hora actual
      const d = new Date(cita.fecha_hora)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const hh = String(d.getHours()).padStart(2, "0")
      const mi = String(d.getMinutes()).padStart(2, "0")

      setFormFecha(`${yyyy}-${mm}-${dd}`)
      setFormHora(`${hh}:${mi}`)
      setFormUbicacion(cita.ubicacion || "")
      setFormObs(cita.observaciones || "")
      setActionOpen({ type: "reagendar", cita })
      return
    }
if (action === "programar_llamada") {
  setFormFecha("")
  setFormHora("")
  setFormObs("")
  setActionOpen({ type: "programar_llamada", cita })
  return
}
    if (action === "observaciones") {
      // ✅ append: nota nueva
      setFormObs("")
      setActionOpen({ type: "observaciones", cita })
      return
    }

    if (action === "vendido") return setActionOpen({ type: "vendido", cita })
    if (action === "rechazado") return setActionOpen({ type: "rechazado", cita })
  }

  const submitAction = async () => {
    if (!actionOpen?.cita?.prospect?.id) return
    const prospectId = actionOpen.cita.prospect.id

    setSavingAction(true)
    try {
      if (actionOpen.type === "reagendar") {
        if (!formFecha || !formHora || !formUbicacion.trim()) {
          alert("Fecha, hora y ubicación son obligatorias")
          return
        }
      await apiPost(`/prospects/${prospectId}/acciones`, {
        accion: "agendar_cita",
        appointment_id: actionOpen.cita.id,
        fecha: formFecha,
        hora: formHora,
        ubicacion: formUbicacion.trim(),
        observaciones: formObs?.trim() || null,
      })
      }
if (actionOpen.type === "programar_llamada") {
  if (!formFecha || !formHora) {
    alert("Fecha y hora son obligatorias para la llamada")
    return
  }

  await apiPost(`/prospects/${prospectId}/acciones`, {
    accion: "programar_llamada",
    fecha: formFecha,
    hora: formHora,
    observaciones: formObs?.trim() || null,
  })
}
if (actionOpen.type === "vendido") {
  if (!formTipoVenta) {
    alert("Debes elegir si la venta fue a contado o a crédito")
    return
  }
const montoConIva = Number(formMontoConIva)
const ivaPorcentaje = Number(formIvaMonto)

if (!Number.isFinite(montoConIva) || montoConIva <= 0) {
  alert("Ingresa un precio con IVA válido")
  return
}

if (!Number.isFinite(ivaPorcentaje) || ivaPorcentaje < 0) {
  alert("Ingresa un IVA válido")
  return
}

const divisor = 1 + ivaPorcentaje / 100

if (!Number.isFinite(divisor) || divisor <= 0) {
  alert("Ingresa un IVA válido")
  return
}

const montoSinIva = montoConIva / divisor
const ivaMontoCalculado = montoConIva - montoSinIva

if (!Number.isFinite(montoSinIva) || montoSinIva <= 0) {
  alert("El precio sin IVA debe ser mayor a 0")
  return
}

if (!Number.isFinite(ivaMontoCalculado) || ivaMontoCalculado < 0) {
  alert("El IVA calculado no es válido")
  return
}

await apiPost(`/prospects/${prospectId}/acciones`, {
  accion: "vendido",
  appointment_id: actionOpen.cita.id,
  tipo_venta: formTipoVenta,
  monto_con_iva: montoConIva,
  iva_monto: Number(ivaMontoCalculado.toFixed(2)),
})
}

if (actionOpen.type === "rechazado") {
  if (!motivoRechazoValido) {
    alert(`Escribe un motivo de al menos ${MIN_RECHAZO_MOTIVO_LEN} caracteres`)
    return
  }

await apiPost(`/prospects/${prospectId}/acciones`, {
  accion: "rechazado",
  appointment_id: actionOpen.cita.id,
  motivo: motivoRechazoLimpio,
})
}

      if (actionOpen.type === "observaciones") {
        const obs = formObs.trim()
        if (!obs) {
          alert("Escribe una observación")
          return
        }
        await apiPost(`/prospects/${prospectId}/acciones`, {
          accion: "observaciones",
          observaciones: obs,
        })

        // ✅ refresca historial si está abierto el modal detalle
        await refreshNotes(prospectId)
      }

      setActionOpen(null)
      await refreshAll()
    } catch (e: any) {
      alert(e?.message || "No se pudo completar la acción")
    } finally {
      setSavingAction(false)
    }
  }

  // ====== Fetch lista/días/día ======
  useEffect(() => {
    let cancelled = false
    setLoadingList(true)
    setErrorList(null)

const today = ymd(new Date())

apiGet(`/appointments/?from=${encodeURIComponent(today)}&limit=200`)
    .then((data) => {
        if (cancelled) return
        setCitas((data.citas || []) as CitaDTO[])
      })
      .catch((e) => {
        if (cancelled) return
        setErrorList(e.message || "Error cargando citas")
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const base = visibleMonth ?? new Date()
    const { from, to } = monthRange(base)

    setLoadingDays(true)

apiGet(`/appointments/days?from=${encodeURIComponent(ymd(from))}&to=${encodeURIComponent(ymd(to))}`)      .then((data: DaysResponse) => {
        if (cancelled) return
        const s = new Set<string>()
        for (const d of data.days || []) s.add(d.day)
        setDiasConCitasSet(s)
      })
      .catch(() => {
        if (cancelled) return
        setDiasConCitasSet(new Set())
      })
      .finally(() => {
        if (!cancelled) setLoadingDays(false)
      })

    return () => {
      cancelled = true
    }
  }, [visibleMonth])

  useEffect(() => {
    let cancelled = false
    if (!date) {
      setCitasDelDia([])
      return
    }

    setLoadingDay(true)
    setErrorDay(null)

apiGet(`/appointments/?day=${encodeURIComponent(ymd(date))}`)      .then((data) => {
        if (cancelled) return
        setCitasDelDia((data.citas || []) as CitaDTO[])
      })
      .catch((e) => {
        if (cancelled) return
        setErrorDay(e.message || "Error cargando citas del día")
      })
      .finally(() => {
        if (!cancelled) setLoadingDay(false)
      })

    return () => {
      cancelled = true
    }
  }, [date])

  // ====== Derived ======
const citasOrdenadas = useMemo(() => {
  return [...citas].sort(sortCitasActionableFirst)
}, [citas])

const citasListFiltradas = useMemo(() => {
  const base = citasOrdenadas

  const q = search.trim().toLowerCase()
  if (!q) return base

  return base.filter((c) => {
    const nombre = c.prospect?.nombre ?? ""
    const numero = c.prospect?.numero ?? ""
    const ubic = c.ubicacion ?? ""
    const estado = c.estado_label ?? c.estado ?? ""
    return `${nombre} ${numero} ${ubic} ${estado}`.toLowerCase().includes(q)
  })
}, [citasOrdenadas, search])

  const modifiers = useMemo(
    () => ({
      booked: (day: Date) => diasConCitasSet.has(ymd(day)),
    }),
    [diasConCitasSet]
  )

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Citas</h1>
          <p className="text-muted-foreground">Gestiona tus citas programadas con vista de lista y calendario</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4 sm:space-y-6">
          <div className="flex justify-start">
            <TabsList className="inline-flex w-fit gap-1 rounded-full bg-muted p-1">
              <TabsTrigger value="list" className="px-4 py-2 rounded-full">
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendar" className="px-4 py-2 rounded-full">
                Calendario
              </TabsTrigger>
            </TabsList>
          </div>

          {/* LISTA */}
          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader className="py-4">
<CardTitle className="text-lg">Todas las citas</CardTitle>              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
<div className="text-sm text-muted-foreground">
  {loadingList ? "Cargando..." : `${citasListFiltradas.length} citas`}
</div>                  <div className="w-full sm:w-[360px]">
                    <Input placeholder="Buscar por nombre, número o ubicación…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                {errorList ? <div className="text-sm text-red-500">{errorList}</div> : null}
              </CardContent>
            </Card>

            {loadingList ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Cargando citas…</CardContent>
              </Card>
            ) : citasListFiltradas.length > 0 ? (
              <div className="grid gap-3 sm:gap-4">
{citasListFiltradas.map((cita) => {
const statusStyles = getCitaStatusVisual(cita.estado)

  return (
<Card
  key={cita.id}
  className={`hover:border-primary/50 transition-colors cursor-pointer ${statusStyles.card}`}
      role="button"
      tabIndex={0}
      onClick={() => openCita(cita.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openCita(cita.id)
      }}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  {cita.prospect?.nombre ?? "—"}
                </h3>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="truncate">
                    {cita.prospect?.numero ?? "—"}
                  </Badge>

<Badge variant="outline" className={`text-xs ${statusStyles.badge}`}>
  {cita.estado_label ?? statusStyles.labelFallback}
</Badge>
                </div>
              </div>

              {cita.estado === "programada" ? (
                <CitaActionsMenu onAction={(a) => onCitaAction(a, cita)} />
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="truncate">
                  {formatFechaCorta(cita.fecha_hora)} • {formatHora(cita.fecha_hora)}
                </span>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{cita.ubicacion}</span>
              </div>
            </div>

            {cita.observaciones ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <StickyNote className="h-4 w-4 mt-0.5" />
                <span className="line-clamp-2">{cita.observaciones}</span>
              </div>
            ) : null}
{cita.prospect?.forma_obtencion ? (
  <div className="text-xs text-muted-foreground">
    <span className="font-medium">Forma de obtención:</span>{" "}
    {cita.prospect.forma_obtencion}
  </div>
) : null}
            {cita.estado_detalle ? (
              <div className="text-xs text-muted-foreground">
                {cita.estado_detalle}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
<p className="text-muted-foreground italic">No hay citas registradas.</p>                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* CALENDARIO */}
          <TabsContent value="calendar">
            <div className="grid lg:grid-cols-[360px_1fr] gap-4 sm:gap-6 items-start">
              <Card className="lg:sticky lg:top-6">
                <CardHeader className="py-4">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Seleccionar fecha</span>
                    {loadingDays ? <span className="text-xs text-muted-foreground">Cargando…</span> : null}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex justify-center pb-6">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    className="rounded-md border w-full"
                    modifiers={modifiers}
                    modifiersClassNames={{
                      booked:
                        "relative font-semibold text-primary after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
                    }}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4 min-h-[520px]">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Clock className="h-5 w-5" />
                      Citas del {formatDiaLargo(date)}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {loadingDay ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">Cargando citas del día…</CardContent>
                  </Card>
                ) : errorDay ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-red-500">{errorDay}</CardContent>
                  </Card>
                ) : citasDelDia.length > 0 ? (
                  <div className="grid gap-3 sm:gap-4">
{citasDelDia
  .slice()
  .sort(sortCitasActionableFirst)
  .map((cita) => (
<Card
  key={cita.id}
  className={`hover:border-primary/50 transition-colors cursor-pointer ${getCitaStatusVisual(cita.estado).card}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => openCita(cita.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openCita(cita.id)
                          }}
                        >
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{cita.prospect?.nombre ?? "—"}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary">{cita.prospect?.numero ?? "—"}</Badge>
<Badge
  variant="outline"
  className={`text-xs ${getCitaStatusVisual(cita.estado).badge}`}
>
  {cita.estado_label ?? getCitaStatusVisual(cita.estado).labelFallback}
</Badge>
                                    </div>
                                  </div>

                                  {cita.estado === "programada" ? <CitaActionsMenu
  allowRejectLike={!isSoldLikeAppointment(cita)}
  onAction={(a) => onCitaAction(a, cita)}
/> : null}
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-semibold text-foreground">{formatHora(cita.fecha_hora)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate">{cita.ubicacion}</span>
                                  </div>
                                </div>

                                {cita.observaciones ? (
                                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <StickyNote className="h-4 w-4 mt-0.5" />
                                    <span className="line-clamp-2">{cita.observaciones}</span>
                                  </div>
                                ) : null}
                                {cita.prospect?.forma_obtencion ? (
  <div className="text-xs text-muted-foreground">
    <span className="font-medium">Forma de obtención:</span>{" "}
    {cita.prospect.forma_obtencion}
  </div>
) : null}
                                {cita.estado_detalle ? (
  <div className="text-xs text-muted-foreground">
    {cita.estado_detalle}
  </div>
) : null}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
<p className="text-muted-foreground italic">No hay citas registradas para esta fecha.</p>                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ✅ MODAL DETALLE (FULL RESPONSIVE + SCROLL + HISTORIAL /history) */}
      <Dialog open={!!openCitaId} onOpenChange={(v) => !v && setOpenCitaId(null)}>
        <DialogContent
          className="
            p-0 overflow-hidden
            w-[96vw] sm:w-full max-w-2xl
            h-[88vh] sm:h-[80vh] lg:h-[78vh]
            rounded-xl
          "
        >
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
            <div className="flex items-center justify-between gap-2 p-4 sm:p-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg sm:text-xl">Detalle de la cita</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">Información del prospecto y la cita programada</DialogDescription>
              </DialogHeader>

              <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={() => setOpenCitaId(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[calc(88vh-88px)] sm:h-[calc(80vh-96px)] lg:h-[calc(78vh-96px)]">
            <div className="p-4 sm:p-6 space-y-4">
              {!selectedCita ? (
                <div className="text-sm text-muted-foreground">Cargando…</div>
              ) : (
                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Prospecto</div>
                      <div className="font-semibold text-lg truncate">{selectedCita.prospect?.nombre ?? "—"}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className="truncate">
                          {selectedCita.prospect?.numero ?? "—"}
                        </Badge>
<Badge
  variant="outline"
  className={`text-xs ${getCitaStatusVisual(selectedCita.estado).badge}`}
>
  {selectedCita.estado_label ?? getCitaStatusVisual(selectedCita.estado).labelFallback}
</Badge>
                      </div>
                      {selectedCita.prospect?.forma_obtencion ? (
  <div className="text-sm text-muted-foreground mt-2">
    <span className="font-medium text-foreground">Forma de obtención:</span>{" "}
    {selectedCita.prospect.forma_obtencion}
  </div>
) : null}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      <div className="flex items-start gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground text-xs">Fecha</div>
                          <div className="font-medium">{formatFechaCorta(selectedCita.fecha_hora)}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground text-xs">Hora</div>
                          <div className="font-medium">{formatHora(selectedCita.fecha_hora)}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-sm sm:col-span-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-muted-foreground text-xs">Ubicación</div>
                          <div className="break-words font-medium">{selectedCita.ubicacion}</div>
                        </div>
                      </div>

                      {selectedCita.observaciones ? (
                        <div className="flex items-start gap-2 text-sm sm:col-span-2">
                          <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="text-muted-foreground text-xs">Observaciones</div>
                            <div className="whitespace-pre-wrap break-words">{selectedCita.observaciones}</div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ✅ HISTORIAL DE NOTAS DEL PROSPECTO (REAL: /history) */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Historial de notas del prospecto</div>

                      {loadingNotes ? (
                        <div className="text-sm text-muted-foreground">Cargando notas…</div>
                      ) : errorNotes ? (
                        <div className="text-sm text-red-500">{errorNotes}</div>
                      ) : prospectNotes.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">No hay notas registradas.</div>
                      ) : (
                        <div className="space-y-2">
                          {prospectNotes.map((n) => (
                            <div key={n.id} className="rounded-md border p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium truncate">{getAutor(n)}</div>
                                <div className="text-xs text-muted-foreground">{formatFechaHora(n.created_at)}</div>
                              </div>
                              <div className="mt-2 text-sm whitespace-pre-wrap break-words">{n.detalle}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button variant="destructive" onClick={() => setOpenCitaId(null)}>
                        Cerrar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* MODAL ACCIONES */}
      <Dialog
        open={!!actionOpen}
        onOpenChange={(v) => {
          if (!v) setActionOpen(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
<DialogTitle>
  {actionOpen?.type === "reagendar"
    ? "Reagendar cita"
    : actionOpen?.type === "programar_llamada"
    ? "Programar llamada"
    : actionOpen?.type === "vendido"
    ? "Marcar vendido"
    : actionOpen?.type === "rechazado"
    ? "Marcar rechazado"
    : "Agregar observaciones"}
</DialogTitle>
            <DialogDescription>
              {actionOpen?.cita?.prospect?.nombre ?? "—"} • {actionOpen?.cita?.prospect?.numero ?? "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
{actionOpen?.type === "reagendar" || actionOpen?.type === "programar_llamada" ? (
  <>
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Fecha</div>
        <div className="relative">
<Input
  ref={dateInputRef}
  type="date"
  value={formFecha}
  onChange={(e) => setFormFecha(e.target.value)}
  className="pr-12 picker-dark-clean h-10"
/>
<button
  type="button"
  onClick={() => openNativePicker(dateInputRef)}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white"
  aria-label="Seleccionar fecha"
>
  <CalendarIcon className="h-4 w-4" />
</button>
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">Hora</div>
        <div className="relative">
<Input
  ref={timeInputRef}
  type="time"
  value={formHora}
  onChange={(e) => setFormHora(e.target.value)}
  className="pr-12 picker-dark-clean h-10"
/>
<button
  type="button"
  onClick={() => openNativePicker(timeInputRef)}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white"
  aria-label="Seleccionar hora"
>
  <Clock className="h-4 w-4" />
</button>
        </div>
      </div>
    </div>

    {actionOpen?.type === "reagendar" ? (
      <div>
        <div className="text-xs text-muted-foreground mb-1">Ubicación</div>
        <Input
          value={formUbicacion}
          onChange={(e) => setFormUbicacion(e.target.value)}
          placeholder="Ej: Casa del prospecto"
        />
      </div>
    ) : null}

    <div>
      <div className="text-xs text-muted-foreground mb-1">
        Observaciones {actionOpen?.type === "programar_llamada" ? "(opcional)" : "(opcional)"}
      </div>
      <Input
        value={formObs}
        onChange={(e) => setFormObs(e.target.value)}
        placeholder={
          actionOpen?.type === "programar_llamada"
            ? "Ej: Confirmar por WhatsApp antes de marcar..."
            : "Ej: Confirmar 1 hora antes..."
        }
      />
    </div>
  </>
) : null}

{actionOpen?.type === "vendido" ? (
  <div className="grid gap-3">
    <div>
      <div className="text-xs text-muted-foreground mb-1">Tipo de venta *</div>
      <Select
        value={formTipoVenta}
        onValueChange={(value) => setFormTipoVenta(value as "contado" | "credito")}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecciona tipo de venta..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="contado">Contado</SelectItem>
          <SelectItem value="credito">Crédito</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <div className="text-xs text-muted-foreground mb-1">Precio con IVA *</div>
      <Input
        inputMode="decimal"
        placeholder="Ej: 12000"
        value={formMontoConIva}
        onChange={(e) => {
          const raw = e.target.value
          const cleaned = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1")
          setFormMontoConIva(cleaned)
        }}
      />
    </div>

    <div>
      <div className="text-xs text-muted-foreground mb-1">IVA (%) *</div>
      <Input
        inputMode="decimal"
        placeholder="Ej: 7.5"
        value={formIvaMonto}
        onChange={(e) => {
          const raw = e.target.value
          const cleaned = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1")
          setFormIvaMonto(cleaned)
        }}
      />
    </div>

    <div className="rounded-md border p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground mb-1">Precio sin IVA</div>
      <div className="text-lg font-semibold">
        {montoSinIvaCalculado == null ? "—" : montoSinIvaCalculado.toFixed(2)}
      </div>
    </div>
  </div>
) : null}

{actionOpen?.type === "rechazado" ? (
  <div>
    <div className="text-xs text-muted-foreground mb-1">Motivo *</div>
    <Input
      value={formMotivo}
      onChange={(e) => setFormMotivo(e.target.value)}
      placeholder="Ej: No le interesa / sin presupuesto / ya compró con otra persona..."
    />
    <div
      className={`text-[11px] mt-1 ${
        formMotivo.length === 0
          ? "text-muted-foreground"
          : motivoRechazoValido
            ? "text-muted-foreground"
            : "text-red-500"
      }`}
    >
      {formMotivo.length === 0
        ? `Escribe al menos ${MIN_RECHAZO_MOTIVO_LEN} caracteres.`
        : motivoRechazoValido
          ? "Motivo válido ✅"
          : `Te faltan ${Math.max(
              0,
              MIN_RECHAZO_MOTIVO_LEN - motivoRechazoLimpio.length
            )} caracteres.`}
    </div>
  </div>
) : null}

            {actionOpen?.type === "observaciones" ? (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Agregar nueva observación</div>
                <Input value={formObs} onChange={(e) => setFormObs(e.target.value)} placeholder="Escribe una nota nueva..." />
                <div className="text-[11px] text-muted-foreground mt-1">Se guarda en el historial del prospecto.</div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setActionOpen(null)} disabled={savingAction}>
                Cancelar
              </Button>
<Button
  onClick={submitAction}
  disabled={
    savingAction ||
    (actionOpen?.type === "rechazado" && !motivoRechazoValido) ||
    (actionOpen?.type === "vendido" && !formTipoVenta)
  }
>
  {savingAction ? "Guardando..." : "Guardar"}
</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}