"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Phone, MoreVertical, Clock, StickyNote, X } from "lucide-react"
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
import { ProspectStatusBadge } from "@/components/prospectos/prospect-status-badge"
import { ProspectTreatmentBadge } from "@/components/prospectos/prospect-treatment-badge"
import { ProspectoDetailDialog } from "@/components/prospectos/prospecto-detail-dialog"
import { ProspectDocumentsDialog } from "@/components/prospectos/prospect-documents-panel"
import { AppointmentLocationPicker } from "@/components/citas/appointment-location-picker"
import {
  canStartOrResumeFollowup,
  formatProspectPhone,
  getLastAppointmentLocation,
  isSurveyProspect,
} from "@/lib/prospect"

type LlamadaDTO = {
  id: number
  fecha_hora: string
  observaciones?: string | null
  estado: string
  estado_label?: string | null
  estado_detalle?: string | null
  resolved_at?: string | null
prospect?: {
  id: number
  nombre: string
  numero: string
  lada?: string | null
  numero_formateado?: string | null
  numero_encuesta?: string | null
  trato_prospecto?: "enojado" | "feliz" | "neutral" | null
  forma_obtencion_tipo?: "encuesta" | "referido" | "cita_en_frio" | "otro" | null
  forma_obtencion?: string | null
  created_at?: string | null
  seguimiento_pausado?: boolean | null
  seguimiento_fecha_base?: string | null
  ultima_ubicacion_cita?: string | null
  ultima_ubicacion_cita_lat?: number | null
  ultima_ubicacion_cita_lng?: number | null
  estado?: string | null
  venta_monto_sin_iva?: number | null
} | null}
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

type AmigosResponse = {
  recomendado_por: any | null
  recomendados: any[]
}

function getActingAsUserId(): string | null {
  const v = localStorage.getItem("pulso_acting_user_id")
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
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

// YYYY-MM-DD LOCAL (sin timezone)
function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function currentHM() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function normalizeYmdRange(a: string, b: string) {
  if (a <= b) return { from: a, to: b }
  return { from: b, to: a }
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

function localDateTimeParam(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${ymd(d)}T${hh}:${mm}:${ss}`
}

function isHistoryNoteLike(item: HistoryItemDTO) {
  const accion = (item.accion || "").toLowerCase()
  const detalle = (item.detalle || "").trim()
  if (!detalle) return false

  if (accion === "observaciones") return true
  if (accion === "rechazado") return true
  return false
}

function getHistoryNoteSource(item: HistoryItemDTO) {
  const accion = (item.accion || "").toLowerCase()
  const detalle = (item.detalle || "").trim().toLowerCase()

  if (detalle.startsWith("[creacion]")) return "Creación"
  if (detalle.startsWith("[manual]")) return "Manual"
  if (detalle.startsWith("[cita]")) return "Cita"
  if (detalle.startsWith("[llamada]")) return "Llamada"
  if (detalle.startsWith("[rechazo]")) return "Rechazo"

  if (accion === "rechazado") return "Rechazo"
  if (accion === "observaciones") return "Nota"

  return "Nota"
}

function getHistoryNoteText(item: HistoryItemDTO) {
  return (item.detalle || "")
    .replace(/^\[(creacion|manual|cita|llamada|rechazo)\]\s*/i, "")
    .trim()
}

function getDiffMs(iso: string) {
  return new Date(iso).getTime() - Date.now()
}

function isUpcomingCall(iso: string) {
  return getDiffMs(iso) >= 0
}

function getCallPriority(iso: string): "danger" | "warning" | "safe" {
  const diffMs = getDiffMs(iso)

  if (diffMs <= 60 * 60 * 1000) return "danger"   // 1 hora o menos
  if (diffMs <= 3 * 60 * 60 * 1000) return "warning" // 3 horas o menos
  return "safe"
}

function getCallPriorityLabel(iso: string) {
  const diffMs = getDiffMs(iso)

  if (diffMs < 0) return "Vencida"
  if (diffMs <= 60 * 60 * 1000) return "Urgente"
  if (diffMs <= 3 * 60 * 60 * 1000) return "Próxima"
  return "A tiempo"
}

function getCallPriorityClasses(iso: string) {
  const priority = getCallPriority(iso)

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

function getCallStatusVisual(estado?: string | null) {
  switch ((estado || "").toLowerCase()) {
    case "pendiente":
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

    case "con_cita":
      return {
        card: "border-blue-500/60 bg-blue-500/5",
        badge: "border-blue-500/50 text-blue-700 dark:text-blue-400",
        labelFallback: "Cita agendada",
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

    case "sin_respuesta":
      return {
        card: "border-slate-500/60 bg-slate-500/5",
        badge: "border-slate-500/50 text-slate-700 dark:text-slate-400",
        labelFallback: "Sin respuesta",
      }

    case "cancelada":
      return {
        card: "border-slate-500/60 bg-slate-500/5",
        badge: "border-slate-500/50 text-slate-700 dark:text-slate-400",
        labelFallback: "Cancelada",
      }

    case "hecha":
      return {
        card: "border-cyan-500/60 bg-cyan-500/5",
        badge: "border-cyan-500/50 text-cyan-700 dark:text-cyan-400",
        labelFallback: "Hecha",
      }

    case "anexada":
      return {
        card: "border-slate-500/60 bg-slate-500/5",
        badge: "border-slate-500/50 text-slate-700 dark:text-slate-400",
        labelFallback: "Anexada",
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
function hasLlamadaActions(llamada: LlamadaDTO) {
  return (llamada.estado || "").toLowerCase() === "pendiente"
}

function sortLlamadasActionableFirst(a: LlamadaDTO, b: LlamadaDTO) {
  const aHasActions = hasLlamadaActions(a) ? 0 : 1
  const bHasActions = hasLlamadaActions(b) ? 0 : 1

  if (aHasActions !== bHasActions) return aHasActions - bHasActions

  return +new Date(a.fecha_hora) - +new Date(b.fecha_hora)
}
// rango del mes (LOCAL)
function monthRange(base: Date) {
  const from = new Date(base.getFullYear(), base.getMonth(), 1)
  const to = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return { from, to }
}

// helper: abre picker nativo si existe (Chrome/Edge), si no, focus.
function openNativePicker(ref: React.RefObject<HTMLInputElement | null>) {
  const el = ref.current
  if (!el) return
  ;(el as any).showPicker?.()
  el.focus()
}
const MONTHLY_FOLLOWUP_OBS = "Seguimiento mensual (mantenimiento / nuevas citas)"

function isMonthlyFollowupCall(llamada: LlamadaDTO) {
  return (llamada.observaciones ?? "").trim() === MONTHLY_FOLLOWUP_OBS
}

function isSoldLikeCall(llamada: LlamadaDTO) {
  const estado = (llamada.prospect?.estado ?? "").toLowerCase()
  return estado === "seguimiento" || estado === "vendido" || llamada.prospect?.venta_monto_sin_iva != null
}

function shouldHideCallManagementActions(llamada: LlamadaDTO) {
  return isMonthlyFollowupCall(llamada)
}

function shouldHideCallRejectLikeActions(llamada: LlamadaDTO) {
  return isMonthlyFollowupCall(llamada) || isSoldLikeCall(llamada)
}

function canMarkCallDone(llamada: LlamadaDTO) {
  return (llamada.prospect?.estado ?? "").toLowerCase() !== "pendiente"
}

function LlamadaActionsMenu({
  onAction,
  allowRejectLike = true,
  allowManagementActions = true,
  allowSaleAction = true,
  allowDoneAction = true,
}: {
  onAction?: (
    action:
      | "marcar_hecha"
      | "reagendar"
      | "agendar_cita"
      | "vendido"
      | "rechazado"
      | "sin_respuesta"
      | "observaciones"
      | "ver_amigos"
  ) => void
  allowRejectLike?: boolean
  allowManagementActions?: boolean
  allowSaleAction?: boolean
  allowDoneAction?: boolean
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

          {allowDoneAction ? <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("marcar_hecha")
            }}
          >
            Marcar realizada
          </DropdownMenuItem> : null}
{allowManagementActions ? (
  <>
    <DropdownMenuSeparator />

    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault()
        onAction?.("reagendar")
      }}
    >
      Reagendar llamada
    </DropdownMenuItem>

    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault()
        onAction?.("agendar_cita")
      }}
    >
      Agendar cita
    </DropdownMenuItem>

    {allowSaleAction ? (
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          onAction?.("vendido")
        }}
      >
        Marcar vendido
      </DropdownMenuItem>
    ) : null}
  </>
) : null}

{allowRejectLike ? (
  <>
    {!allowManagementActions ? <DropdownMenuSeparator /> : null}

    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault()
        onAction?.("rechazado")
      }}
    >
      Rechazado
    </DropdownMenuItem>

    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault()
        onAction?.("sin_respuesta")
      }}
    >
      Marcar sin respuesta
    </DropdownMenuItem>
  </>
) : null}

{allowManagementActions || allowRejectLike ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("ver_amigos")
            }}
          >
            Ver amigos
          </DropdownMenuItem>

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
const MIN_RECHAZO_MOTIVO_LEN = 10
type ActionState =
  | null
  | { type: "marcar_hecha"; llamada: LlamadaDTO }
  | { type: "reagendar"; llamada: LlamadaDTO }
  | { type: "agendar_cita"; llamada: LlamadaDTO }
  | { type: "vendido"; llamada: LlamadaDTO }
  | { type: "rechazado"; llamada: LlamadaDTO }
  | { type: "observaciones"; llamada: LlamadaDTO }
  | { type: "ver_amigos"; llamada: LlamadaDTO }

export function LlamadasView() {
  const [tab, setTab] = useState<"list" | "calendar">("list")

  const [date, setDate] = useState<Date | undefined>(new Date())
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date())

  const [llamadas, setLlamadas] = useState<LlamadaDTO[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [errorList, setErrorList] = useState<string | null>(null)

  const [diasConLlamadasSet, setDiasConLlamadasSet] = useState<Set<string>>(new Set())
  const [diasConLlamadasVencidasSet, setDiasConLlamadasVencidasSet] = useState<Set<string>>(new Set())
  const [loadingDays, setLoadingDays] = useState(false)

  const [llamadasDelDia, setLlamadasDelDia] = useState<LlamadaDTO[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [errorDay, setErrorDay] = useState<string | null>(null)

const [search, setSearch] = useState("")
const todayYMD = useMemo(() => ymd(startOfToday()), [])
const [listFromDate, setListFromDate] = useState(todayYMD)
const [listToDate, setListToDate] = useState(todayYMD)
const [openLlamadaId, setOpenLlamadaId] = useState<number | null>(null)
const [detailProspecto, setDetailProspecto] = useState<any | null>(null)
const [documentsProspecto, setDocumentsProspecto] = useState<any | null>(null)

  const selectedLlamada = useMemo(
    () => llamadas.find((c) => c.id === openLlamadaId) ?? llamadasDelDia.find((c) => c.id === openLlamadaId) ?? null,
    [openLlamadaId, llamadas, llamadasDelDia]
  )

const openLlamada = (id: number) => setOpenLlamadaId(id)

const normalizedListRange = useMemo(
  () => normalizeYmdRange(listFromDate || todayYMD, listToDate || todayYMD),
  [listFromDate, listToDate, todayYMD]
)

  // ✅ amigos
  const [amigosData, setAmigosData] = useState<AmigosResponse | null>(null)
  const [loadingAmigos, setLoadingAmigos] = useState(false)
  const [errorAmigos, setErrorAmigos] = useState<string | null>(null)

  const refreshAmigos = async (prospectId: number) => {
    setLoadingAmigos(true)
    setErrorAmigos(null)
    try {
      const data = (await apiGet(`/prospects/${prospectId}/amigos`)) as AmigosResponse
      setAmigosData({
        recomendado_por: data?.recomendado_por ?? null,
        recomendados: (data?.recomendados ?? []) as any[],
      })
    } catch (e: any) {
      setErrorAmigos(e?.message || "No se pudieron cargar los amigos")
      setAmigosData(null)
    } finally {
      setLoadingAmigos(false)
    }
  }

  // ✅ Historial de notas del prospecto (desde /history)
  const [prospectNotes, setProspectNotes] = useState<HistoryItemDTO[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [errorNotes, setErrorNotes] = useState<string | null>(null)
  const [oldestNotesFirst, setOldestNotesFirst] = useState(false)

  const prospectNoteRows = useMemo(() => {
    const rows = [
      ...prospectNotes.map((note) => ({
        key: `note-${note.id}`,
        at: note.created_at,
        note,
        creation: false,
      })),
      ...(selectedLlamada?.prospect?.created_at
        ? [{
            key: "creation",
            at: selectedLlamada.prospect.created_at,
            note: null,
            creation: true,
          }]
        : []),
    ]

    return rows.sort((a, b) => {
      const diff = +new Date(a.at) - +new Date(b.at)
      if (diff !== 0) return oldestNotesFirst ? diff : -diff
      if (!oldestNotesFirst) return 0
      return Number(b.creation) - Number(a.creation)
    })
  }, [prospectNotes, selectedLlamada?.prospect?.created_at, oldestNotesFirst])

  const refreshNotes = async (prospectId: number) => {
    setLoadingNotes(true)
    setErrorNotes(null)
    try {
      const data = await apiGet(`/history/?prospect_id=${encodeURIComponent(String(prospectId))}&limit=200`)
      const items: HistoryItemDTO[] = (data?.historial || []) as any

      const notas = items
        .filter(isHistoryNoteLike)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

      setProspectNotes(notas)
    } catch (e: any) {
      setErrorNotes(e?.message || "No se pudieron cargar las notas del prospecto")
      setProspectNotes([])
    } finally {
      setLoadingNotes(false)
    }
  }

  // cuando abres el modal, carga notas del prospecto
  useEffect(() => {
    let cancelled = false

    const prospectId = selectedLlamada?.prospect?.id
    if (!openLlamadaId || !prospectId) {
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
          .filter(isHistoryNoteLike)
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

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
  }, [openLlamadaId, selectedLlamada?.prospect?.id])

  // ====== MODAL ACCIONES ======
  const [actionOpen, setActionOpen] = useState<ActionState>(null)
  const [savingAction, setSavingAction] = useState(false)

  const [formFecha, setFormFecha] = useState("")
  const [formHora, setFormHora] = useState("")
  const [formUbicacion, setFormUbicacion] = useState("")
  const [formUbicacionLat, setFormUbicacionLat] = useState<number | null>(null)
  const [formUbicacionLng, setFormUbicacionLng] = useState<number | null>(null)
  const [formObs, setFormObs] = useState("")
  const [formTipoVenta, setFormTipoVenta] = useState<"" | "contado" | "credito">("")
  const [formMontoConIva, setFormMontoConIva] = useState("")
  const [formIvaMonto, setFormIvaMonto] = useState("")
  const [formMotivo, setFormMotivo] = useState("")
  const [formSeguimiento, setFormSeguimiento] = useState(false)
  const [formSeguimientoDia, setFormSeguimientoDia] = useState("1")
  const [formSeguimientoHora, setFormSeguimientoHora] = useState("")
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

const motivoRechazoLimpio = formMotivo.trim().replace(/\s+/g, " ")
const motivoRechazoValido = motivoRechazoLimpio.length >= MIN_RECHAZO_MOTIVO_LEN

  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const timeInputRef = useRef<HTMLInputElement | null>(null)

  const resetActionForms = () => {
    setFormFecha("")
    setFormHora("")
    setFormUbicacion("")
    setFormUbicacionLat(null)
    setFormUbicacionLng(null)
    setFormObs("")
    setFormTipoVenta("")
    setFormMontoConIva("")
    setFormIvaMonto("")
    setFormMotivo("")
    setFormSeguimiento(false)
    setFormSeguimientoDia("1")
    setFormSeguimientoHora("")
  }
const refreshAll = async () => {
  const base = visibleMonth ?? new Date()
  const { from, to } = monthRange(base)
  const nowLocal = localDateTimeParam()

  const [rangeData, daysData, overdueDaysData, dayData] = await Promise.all([
    apiGet(
      `/calls/?from=${encodeURIComponent(normalizedListRange.from)}&to=${encodeURIComponent(
        normalizedListRange.to
      )}&estado=pendiente&limit=200`
    ),
    apiGet(`/calls/days?from=${encodeURIComponent(ymd(from))}&to=${encodeURIComponent(ymd(to))}`),
    apiGet(
      `/calls/days?from=${encodeURIComponent(ymd(from))}&to=${encodeURIComponent(
        ymd(to)
      )}&estado=pendiente&before=${encodeURIComponent(nowLocal)}`
    ),
    date ? apiGet(`/calls/?day=${encodeURIComponent(ymd(date))}`) : Promise.resolve({ llamadas: [] }),
  ])

  setLlamadas((rangeData.llamadas || []) as LlamadaDTO[])

  const days = (daysData as DaysResponse).days || []
  const s = new Set<string>()
  for (const d of days) s.add(d.day)
  setDiasConLlamadasSet(s)

  const overdueDays = (overdueDaysData as DaysResponse).days || []
  const vencidas = new Set<string>()
  for (const d of overdueDays) vencidas.add(d.day)
  setDiasConLlamadasVencidasSet(vencidas)

  setLlamadasDelDia((dayData.llamadas || []) as LlamadaDTO[])
}

const onLlamadaAction = (
  action: "marcar_hecha" | "reagendar" | "agendar_cita" | "vendido" | "rechazado" | "sin_respuesta" | "observaciones" | "ver_amigos",
  llamada: LlamadaDTO
) => {
    const estadoLlamada = (llamada.estado || "").toLowerCase()
    if (estadoLlamada !== "pendiente" && !(estadoLlamada === "hecha" && ["vendido", "observaciones"].includes(action))) return
    if (action === "marcar_hecha" && !canMarkCallDone(llamada)) return

    resetActionForms()

    if (action === "reagendar") {
      const d = new Date(llamada.fecha_hora)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const hh = String(d.getHours()).padStart(2, "0")
      const mi = String(d.getMinutes()).padStart(2, "0")
      setFormFecha(`${yyyy}-${mm}-${dd}`)
      setFormHora(`${hh}:${mi}`)
      setFormObs(llamada.observaciones || "")
      setActionOpen({ type: "reagendar", llamada })
      return
    }

    if (action === "observaciones") {
      setFormObs("")
      setActionOpen({ type: "observaciones", llamada })
      return
    }

    if (action === "marcar_hecha") {
      setFormObs(llamada.observaciones || "")
      setFormSeguimiento(canStartOrResumeFollowup(llamada.prospect))
      setFormSeguimientoHora(currentHM())
      setActionOpen({ type: "marcar_hecha", llamada })
      return
    }

    if (!llamada?.prospect?.id) {
      alert("Esta llamada no tiene prospecto asociado. No se puede ejecutar esta acción.")
      return
    }

        if (isSoldLikeCall(llamada) && (action === "rechazado" || action === "sin_respuesta" || action === "vendido")) {
      alert("Este prospecto ya tiene una venta registrada.")
      return
    }

    if (action === "agendar_cita") {
      const last = getLastAppointmentLocation(llamada.prospect)
      setFormUbicacion(last.ubicacion)
      setFormUbicacionLat(last.ubicacion_lat)
      setFormUbicacionLng(last.ubicacion_lng)
      setActionOpen({ type: "agendar_cita", llamada })
      return
    }
    if (action === "vendido") {
      setActionOpen({ type: "vendido", llamada })
      return
    }
if (action === "rechazado") {
  setActionOpen({ type: "rechazado", llamada })
  return
}
if (action === "sin_respuesta") {
  void (async () => {
    try {
      if (!llamada.prospect?.id) {
        alert("Esta llamada no tiene prospecto asociado.")
        return
      }

      await apiPost(`/prospects/${llamada.prospect.id}/acciones`, {
        accion: "sin_respuesta",
        call_id: llamada.id,
      })

      await refreshAll()
    } catch (e: any) {
      alert(e?.message || "No se pudo marcar como sin respuesta")
    }
  })()

  return
}
if (action === "ver_amigos") {
  setActionOpen({ type: "ver_amigos", llamada })
  refreshAmigos(llamada.prospect.id)
  return
}
  }
  const submitAction = async () => {
    if (!actionOpen) return

    setSavingAction(true)
    try {
      if (actionOpen.type === "reagendar") {
        if (!formFecha || !formHora) {
          alert("Fecha y hora son obligatorias")
          return
        }
        await apiPost(`/calls/${actionOpen.llamada.id}/reagendar`, {
          fecha: formFecha,
          hora: formHora,
          observaciones: formObs?.trim() || null,
        })
      }

      if (actionOpen.type === "marcar_hecha") {
        if (formSeguimiento && (!formSeguimientoDia || !formSeguimientoHora)) {
          alert("Día y hora son obligatorios para iniciar/reanudar seguimiento")
          return
        }
        await apiPost(`/calls/${actionOpen.llamada.id}/marcar-hecha`, {
          observaciones: formObs?.trim() || null,
        })
        const prospectId = actionOpen.llamada.prospect?.id
        if (formSeguimiento && prospectId) {
          await apiPost(`/prospects/${prospectId}/acciones`, {
            accion: "iniciar_seguimiento",
            dia: formSeguimientoDia,
            hora: formSeguimientoHora,
          })
        }
      }

      // ✅ Observaciones: POST y luego refresca /history
      if (actionOpen.type === "observaciones") {
        const obs = formObs.trim()
        if (!obs) {
          alert("Escribe una observación")
          return
        }
        const prospectId = actionOpen.llamada.prospect?.id
        if (!prospectId) {
          alert("Esta llamada no tiene prospecto asociado.")
          return
        }

        await apiPost(`/prospects/${prospectId}/acciones`, {
          accion: "observaciones",
          observaciones: obs,
        })

        await refreshNotes(prospectId)

        // opcional si quieres que agregar obs cierre la llamada:
        // await closeCallAsDone(actionOpen.llamada.id, "Agregó observaciones desde llamada")
      }

      const prospectId = actionOpen.llamada.prospect?.id

      if (actionOpen.type === "agendar_cita") {
        if (!prospectId) {
          alert("Esta llamada no tiene prospecto asociado.")
          return
        }
        if (!formFecha || !formHora || !formUbicacion.trim()) {
          alert("Fecha, hora y ubicación son obligatorias")
          return
        }

        await apiPost(`/prospects/${prospectId}/acciones`, {
          accion: "agendar_cita",
          call_id: actionOpen.llamada.id,
          fecha: formFecha,
          hora: formHora,
          ubicacion: formUbicacion.trim(),
          ubicacion_lat: formUbicacionLat,
          ubicacion_lng: formUbicacionLng,
          observaciones: formObs?.trim() || null,
        })
      }

      if (actionOpen.type === "vendido") {
        if (!prospectId) {
          alert("Esta llamada no tiene prospecto asociado.")
          return
        }

        if (!formTipoVenta) {
          alert("Debes elegir si la venta fue a contado o a crédito")
          return
        }
          if (!formFecha || !formHora) {
    alert("Debes elegir la fecha y hora de la llamada postventa")
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

const sold = await apiPost(`/prospects/${prospectId}/acciones`, {
  accion: "vendido",
  call_id: actionOpen.llamada.id,
  tipo_venta: formTipoVenta,
  monto_con_iva: montoConIva,
  iva_monto: Number(ivaMontoCalculado.toFixed(2)),
  fecha: formFecha,
  hora: formHora,
})
setDocumentsProspecto(sold?.prospecto ?? actionOpen.llamada.prospect ?? { id: prospectId })
      }

if (actionOpen.type === "rechazado") {
  if (!prospectId) {
    alert("Esta llamada no tiene prospecto asociado.")
    return
  }

  if (!motivoRechazoValido) {
    alert(`Escribe un motivo de al menos ${MIN_RECHAZO_MOTIVO_LEN} caracteres`)
    return
  }
  await apiPost(`/prospects/${prospectId}/acciones`, {
    accion: "rechazado",
    call_id: actionOpen.llamada.id,
    motivo: motivoRechazoLimpio,
  })
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

  apiGet(
    `/calls/?from=${encodeURIComponent(normalizedListRange.from)}&to=${encodeURIComponent(
      normalizedListRange.to
    )}&estado=pendiente&limit=200`
  )
    .then((rangeData) => {
      if (cancelled) return

      setLlamadas((rangeData.llamadas || []) as LlamadaDTO[])
    })
    .catch((e) => {
      if (cancelled) return
      setErrorList(e.message || "Error cargando llamadas")
    })
    .finally(() => {
      if (!cancelled) setLoadingList(false)
    })

  return () => {
    cancelled = true
  }
}, [normalizedListRange.from, normalizedListRange.to])

  useEffect(() => {
    let cancelled = false
    const base = visibleMonth ?? new Date()
    const { from, to } = monthRange(base)
    const nowLocal = localDateTimeParam()

    setLoadingDays(true)

Promise.all([
  apiGet(`/calls/days?from=${encodeURIComponent(ymd(from))}&to=${encodeURIComponent(ymd(to))}`),
  apiGet(
    `/calls/days?from=${encodeURIComponent(ymd(from))}&to=${encodeURIComponent(
      ymd(to)
    )}&estado=pendiente&before=${encodeURIComponent(nowLocal)}`
  ),
])
      .then(([data, overdueData]: [DaysResponse, DaysResponse]) => {
        if (cancelled) return
        const s = new Set<string>()
        for (const d of data.days || []) s.add(d.day)
        setDiasConLlamadasSet(s)

        const vencidas = new Set<string>()
        for (const d of overdueData.days || []) vencidas.add(d.day)
        setDiasConLlamadasVencidasSet(vencidas)
      })
      .catch(() => {
        if (cancelled) return
        setDiasConLlamadasSet(new Set())
        setDiasConLlamadasVencidasSet(new Set())
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
      setLlamadasDelDia([])
      return
    }

    setLoadingDay(true)
    setErrorDay(null)

apiGet(`/calls/?day=${encodeURIComponent(ymd(date))}`)      .then((data) => {
        if (cancelled) return
        setLlamadasDelDia((data.llamadas || []) as LlamadaDTO[])
      })
      .catch((e) => {
        if (cancelled) return
        setErrorDay(e.message || "Error cargando llamadas del día")
      })
      .finally(() => {
        if (!cancelled) setLoadingDay(false)
      })

    return () => {
      cancelled = true
    }
  }, [date])

  // ====== Derived ======
const llamadasOrdenadas = useMemo(() => {
  return [...llamadas].sort(sortLlamadasActionableFirst)
}, [llamadas])

const llamadasListFiltradas = useMemo(() => {
  const base = llamadasOrdenadas

  const q = search.trim().toLowerCase()
  if (!q) return base

  return base.filter((c) => {
    const nombre = c.prospect?.nombre ?? ""
    const numero = formatProspectPhone(c.prospect)
    const obs = c.observaciones ?? ""
    return `${nombre} ${numero} ${obs}`.toLowerCase().includes(q)
  })
}, [llamadasOrdenadas, search])

  const modifiers = useMemo(
    () => ({
      overdue: (day: Date) => diasConLlamadasVencidasSet.has(ymd(day)),
      scheduled: (day: Date) => {
        const dayKey = ymd(day)
        return diasConLlamadasSet.has(dayKey) && !diasConLlamadasVencidasSet.has(dayKey)
      },
    }),
    [diasConLlamadasSet, diasConLlamadasVencidasSet]
  )

  return (
    <>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Llamadas</h1>
          <p className="text-muted-foreground">Gestiona tus llamadas programadas con vista de lista y calendario</p>
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
<CardTitle className="text-lg">Llamadas pendientes por rango</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
<div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
  <div className="text-sm text-muted-foreground">
{loadingList ? "Cargando..." : `${llamadasListFiltradas.length} llamadas pendientes visibles`}
  </div>

  <div className="flex w-full flex-col gap-3 xl:w-auto">
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="w-full">
        <div className="text-[11px] text-muted-foreground mb-1">Desde</div>
        <Input
          type="date"
          value={listFromDate}
          onChange={(e) => setListFromDate(e.target.value || todayYMD)}
          className="dark:[color-scheme:dark]"
        />
      </div>

      <div className="w-full">
        <div className="text-[11px] text-muted-foreground mb-1">Hasta</div>
        <Input
          type="date"
          value={listToDate}
          onChange={(e) => setListToDate(e.target.value || todayYMD)}
          className="dark:[color-scheme:dark]"
        />
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            setListFromDate(todayYMD)
            setListToDate(todayYMD)
          }}
        >
          Solo hoy
        </Button>
      </div>
    </div>

    <div className="text-[11px] text-muted-foreground">
      El listado respeta solo el rango seleccionado. Las pendientes vencidas fuera del rango se marcan en rojo en el calendario.
    </div>

    <div className="w-full xl:w-[360px]">
      <Input
        placeholder="Buscar por nombre, número u observaciones…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  </div>
</div>
                {errorList ? <div className="text-sm text-red-500">{errorList}</div> : null}
              </CardContent>
            </Card>

            {loadingList ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Cargando llamadas…</CardContent>
              </Card>
            ) : llamadasListFiltradas.length > 0 ? (
              <div className="grid gap-3 sm:gap-4">
 {llamadasListFiltradas.map((llamada) => {
  const priorityStyles = getCallPriorityClasses(llamada.fecha_hora)
  const priorityLabel = getCallPriorityLabel(llamada.fecha_hora)

  return (
    <Card
      key={llamada.id}
      className={`min-w-0 hover:border-primary/50 transition-colors cursor-pointer ${priorityStyles.card}`}
      role="button"
      tabIndex={0}
      onClick={() => openLlamada(llamada.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openLlamada(llamada.id)
      }}
    >
      <CardContent className="min-w-0 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  {llamada.prospect?.nombre ?? "—"}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="truncate">
                    {formatProspectPhone(llamada.prospect)}
                  </Badge>
                  {isSurveyProspect(llamada.prospect) ? (
                    <Badge variant="outline" className="text-xs">
                      Encuesta: {llamada.prospect?.numero_encuesta ?? "—"}
                    </Badge>
                  ) : null}
                  <ProspectStatusBadge prospect={llamada.prospect} />
                  <ProspectTreatmentBadge prospect={llamada.prospect} />
<Badge variant="outline" className="text-xs">
  {llamada.estado_label ?? "Pendiente"}
</Badge>

                  <Badge variant="outline" className={`text-xs ${priorityStyles.badge}`}>
                    {priorityLabel}
                  </Badge>
                </div>
              </div>

              {["pendiente", "hecha"].includes((llamada.estado || "").toLowerCase()) ? (
<LlamadaActionsMenu
  allowDoneAction={llamada.estado === "pendiente" && canMarkCallDone(llamada)}
  allowManagementActions={llamada.estado === "pendiente"}
  allowSaleAction={!isMonthlyFollowupCall(llamada) && !isSoldLikeCall(llamada)}
  allowRejectLike={llamada.estado === "pendiente" && !shouldHideCallRejectLikeActions(llamada)}
  onAction={(a) => onLlamadaAction(a, llamada)}
/>            ) : null}
            </div>

            <div className="flex min-w-0 flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityStyles.dot}`} />
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">
                  {formatFechaCorta(llamada.fecha_hora)} • {formatHora(llamada.fecha_hora)}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-2 sm:flex-1">
                <Phone className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">Llamada programada</span>
              </div>
            </div>
            {llamada.prospect?.forma_obtencion ? (
              <div className="break-words text-xs text-muted-foreground">
                <span className="font-medium">Forma de obtención:</span>{" "}
                {llamada.prospect.forma_obtencion}
              </div>
            ) : null}
            {llamada.estado_detalle ? (
              <div className="break-words text-xs text-muted-foreground">
                {llamada.estado_detalle}
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
                  <p className="text-muted-foreground italic">No hay llamadas en ese rango.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* CALENDARIO */}
          <TabsContent value="calendar">
            <div className="grid min-w-0 gap-4 sm:gap-6 items-start [grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr))]">
              <Card className="w-full min-w-0">
                <CardHeader className="py-4">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Seleccionar fecha</span>
                    {loadingDays ? <span className="text-xs text-muted-foreground">Cargando…</span> : null}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex justify-center px-3 pb-6 sm:px-6">
                  <div className="w-full max-w-[520px] space-y-3">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      month={visibleMonth}
                      onMonthChange={setVisibleMonth}
                      className="mx-auto w-full rounded-md border [--cell-size:clamp(2.35rem,4.2vw,3.15rem)]"
                      classNames={{
                        root: "w-full",
                      }}
                      modifiers={modifiers}
                      modifiersClassNames={{
                        overdue:
                          "relative font-bold !bg-red-600 !text-white shadow-[0_0_0_2px_rgba(239,68,68,0.35)] hover:!bg-red-700 after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-white",
                        scheduled:
                          "relative font-semibold text-primary after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        Con llamadas
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                        Pendiente vencida
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="min-h-[520px] min-w-0 space-y-4">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Phone className="h-5 w-5" />
                      Llamadas del {formatDiaLargo(date)}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {loadingDay ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">Cargando llamadas del día…</CardContent>
                  </Card>
                ) : errorDay ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-red-500">{errorDay}</CardContent>
                  </Card>
                ) : llamadasDelDia.length > 0 ? (
                  <div className="grid gap-3 sm:gap-4">
{llamadasDelDia
  .slice()
  .sort(sortLlamadasActionableFirst)
  .map((llamada) => (
<Card
  key={llamada.id}
  className={`min-w-0 hover:border-primary/50 transition-colors cursor-pointer ${getCallStatusVisual(llamada.estado).card}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => openLlamada(llamada.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openLlamada(llamada.id)
                          }}
                        >
                          <CardContent className="min-w-0 p-4 sm:p-6">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                                      {llamada.prospect?.nombre ?? "—"}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <Badge variant="secondary">{formatProspectPhone(llamada.prospect)}</Badge>
                                      {isSurveyProspect(llamada.prospect) ? (
                                        <Badge variant="outline" className="text-xs">
                                          Encuesta: {llamada.prospect?.numero_encuesta ?? "—"}
                                        </Badge>
                                      ) : null}
                                      <ProspectStatusBadge prospect={llamada.prospect} />
                                      <ProspectTreatmentBadge prospect={llamada.prospect} />
<Badge
  variant="outline"
  className={`text-xs ${getCallStatusVisual(llamada.estado).badge}`}
>
  {llamada.estado_label ?? getCallStatusVisual(llamada.estado).labelFallback}
</Badge>
                                    </div>
                                  </div>

                                  {["pendiente", "hecha"].includes((llamada.estado || "").toLowerCase()) ? (
<LlamadaActionsMenu
  allowDoneAction={llamada.estado === "pendiente" && canMarkCallDone(llamada)}
  allowManagementActions={llamada.estado === "pendiente"}
  allowSaleAction={!isMonthlyFollowupCall(llamada) && !isSoldLikeCall(llamada)}
  allowRejectLike={llamada.estado === "pendiente" && !shouldHideCallRejectLikeActions(llamada)}
  onAction={(a) => onLlamadaAction(a, llamada)}
/>                                ) : null}
                                </div>

                                <div className="flex min-w-0 flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 text-sm text-muted-foreground">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <Clock className="h-4 w-4 shrink-0" />
                                    <span className="font-semibold text-foreground">{formatHora(llamada.fecha_hora)}</span>
                                  </div>
                                  <div className="flex min-w-0 items-center gap-2 sm:flex-1">
                                    <Phone className="h-4 w-4 shrink-0" />
                                    <span className="min-w-0 truncate">Llamada programada</span>
                                  </div>
                                </div>

                                {llamada.observaciones ? (
                                  <div className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
                                    <StickyNote className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2 min-w-0 break-words">{llamada.observaciones}</span>
                                  </div>
                                ) : null}
                                {llamada.prospect?.forma_obtencion ? (
  <div className="break-words text-xs text-muted-foreground">
    <span className="font-medium">Forma de obtención:</span>{" "}
    {llamada.prospect.forma_obtencion}
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
                      <p className="text-muted-foreground italic">No hay llamadas programadas para esta fecha.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ✅ MODAL DETALLE (SCROLL SIEMPRE) */}
      <Dialog open={!!openLlamadaId} onOpenChange={(v) => !v && setOpenLlamadaId(null)}>
        <DialogContent
          showCloseButton={false}
          className="
            pulso-detail-dialog flex h-[88dvh] w-[96vw] max-w-none flex-col
            overflow-hidden p-0 sm:h-[80dvh] sm:w-[calc(100vw-2rem)] sm:max-w-[760px] lg:h-[78dvh]
            rounded-xl
          "
        >
          {/* header fijo */}
          <div className="sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between gap-2 p-4 sm:p-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg sm:text-xl">Detalle de la llamada</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Información del prospecto y la llamada programada
                </DialogDescription>
              </DialogHeader>

              <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={() => setOpenLlamadaId(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* cuerpo con scroll: height = total - header */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4 sm:p-6 space-y-4">
              {!selectedLlamada ? (
                <div className="text-sm text-muted-foreground">Cargando…</div>
              ) : (
                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Prospecto</div>
                      <div className="font-semibold text-lg truncate">{selectedLlamada.prospect?.nombre ?? "—"}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className="truncate">
                          {formatProspectPhone(selectedLlamada.prospect)}
                        </Badge>
                        {isSurveyProspect(selectedLlamada.prospect) ? (
                          <Badge variant="outline" className="text-xs">
                            Encuesta: {selectedLlamada.prospect?.numero_encuesta ?? "—"}
                          </Badge>
                        ) : null}
                        <ProspectStatusBadge prospect={selectedLlamada.prospect} />
                        <ProspectTreatmentBadge prospect={selectedLlamada.prospect} />
<Badge
  variant="outline"
  className={`text-xs ${getCallStatusVisual(selectedLlamada.estado).badge}`}
>
  {selectedLlamada.estado_label ?? getCallStatusVisual(selectedLlamada.estado).labelFallback}
</Badge>
                      </div>
                      {selectedLlamada.prospect?.forma_obtencion ? (
  <div className="text-sm text-muted-foreground mt-2">
    <span className="font-medium text-foreground">Forma de obtención:</span>{" "}
    {selectedLlamada.prospect.forma_obtencion}
  </div>
) : null}
                      {selectedLlamada.prospect ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setDetailProspecto(selectedLlamada.prospect)}
                        >
                          Ver prospecto
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      <div className="flex items-start gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground text-xs">Fecha de la llamada</div>
                          <div className="font-medium">{formatFechaCorta(selectedLlamada.fecha_hora)}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground text-xs">Hora</div>
                          <div className="font-medium">{formatHora(selectedLlamada.fecha_hora)}</div>
                        </div>
                      </div>

                      {selectedLlamada.observaciones ? (
                        <div className="flex items-start gap-2 text-sm sm:col-span-2">
                          <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="text-muted-foreground text-xs">Observaciones de la llamada</div>
                            <div className="whitespace-pre-wrap break-words">{selectedLlamada.observaciones}</div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ✅ HISTORIAL DE NOTAS DEL PROSPECTO (REAL: /history) */}
                    <div>
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground">Historial de notas del prospecto</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setOldestNotesFirst((v) => !v)}
                          className="h-8 w-fit text-xs"
                        >
                          {oldestNotesFirst ? "Más nuevo arriba" : "Más viejo arriba"}
                        </Button>
                      </div>

                      {loadingNotes ? (
                        <div className="text-sm text-muted-foreground">Cargando notas…</div>
                      ) : errorNotes ? (
                        <div className="text-sm text-red-500">{errorNotes}</div>
                      ) : prospectNoteRows.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">No hay notas registradas.</div>
                      ) : (
                        <div className="space-y-2">
                          {prospectNoteRows.map((row) => row.creation ? (
                            <div key={row.key} className="rounded-md border p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="text-sm font-medium truncate">Prospecto obtenido</div>
                                  <Badge variant="outline" className="text-[10px]">Creación</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">{formatFechaHora(row.at)}</div>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">Fecha de obtención del prospecto.</div>
                            </div>
                          ) : (
                            <div key={row.key} className="rounded-md border p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="text-sm font-medium truncate">{getAutor(row.note!)}</div>
                                  <Badge variant="outline" className="text-[10px]">
                                    {getHistoryNoteSource(row.note!)}
                                  </Badge>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                  {formatFechaHora(row.note!.created_at)}
                                </div>
                              </div>

                              <div className="mt-2 text-sm whitespace-pre-wrap break-words">
                                {getHistoryNoteText(row.note!)}
                              </div>
                            </div>
                          ))}
                          {prospectNotes.length === 0 ? (
                            <div className="text-sm text-muted-foreground italic">No hay notas registradas.</div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button variant="destructive" onClick={() => setOpenLlamadaId(null)}>
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
    ? "Reagendar llamada"
    : actionOpen?.type === "marcar_hecha"
    ? "Marcar llamada realizada"
    : actionOpen?.type === "agendar_cita"
    ? "Agendar cita"
    : actionOpen?.type === "vendido"
    ? "Marcar vendido"
    : actionOpen?.type === "rechazado"
    ? "Marcar rechazado"
    : actionOpen?.type === "ver_amigos"
    ? "Ver amigos"
    : "Agregar observaciones"}
</DialogTitle>
            <DialogDescription>
              {actionOpen?.llamada?.prospect?.nombre ?? "—"} • {formatProspectPhone(actionOpen?.llamada?.prospect)}
            </DialogDescription>
            <ProspectTreatmentBadge prospect={actionOpen?.llamada?.prospect} />
          </DialogHeader>

          <div className="grid gap-3">
            {actionOpen?.type === "observaciones" ? (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Agregar nueva observación</div>
                <Input value={formObs} onChange={(e) => setFormObs(e.target.value)} placeholder="Escribe una nota nueva..." />
                <div className="text-[11px] text-muted-foreground mt-1">Se guarda en el historial del prospecto.</div>
              </div>
            ) : null}
            {actionOpen?.type === "marcar_hecha" ? (
              <>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Observaciones (opcional)</div>
                  <Input value={formObs} onChange={(e) => setFormObs(e.target.value)} placeholder="Ej: Se llamó y se confirmó seguimiento..." />
                  <div className="text-[11px] text-muted-foreground mt-1">La llamada deja de aparecer como pendiente y se guarda en historial.</div>
                </div>
                {canStartOrResumeFollowup(actionOpen.llamada.prospect) ? (
                  <div className="rounded-md border p-3">
                    <label className="flex items-start gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={formSeguimiento}
                        onChange={(event) => setFormSeguimiento(event.target.checked)}
                        className="mt-1"
                      />
                      {actionOpen.llamada.prospect?.seguimiento_pausado ? "Reanudar seguimiento mensual" : "Iniciar seguimiento mensual"}
                    </label>
                    {formSeguimiento ? (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Día del mes</div>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={formSeguimientoDia}
                            onChange={(e) => setFormSeguimientoDia(e.target.value)}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Hora</div>
                          <Input
                            type="time"
                            value={formSeguimientoHora}
                            onChange={(e) => setFormSeguimientoHora(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
            {(actionOpen?.type === "reagendar" || actionOpen?.type === "agendar_cita") ? (
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
                        className="pr-10 dark:[color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => openNativePicker(dateInputRef)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        className="pr-10 dark:[color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => openNativePicker(timeInputRef)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Seleccionar hora"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {actionOpen?.type === "agendar_cita" ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ubicación</div>
                    <AppointmentLocationPicker
                      value={{
                        ubicacion: formUbicacion,
                        ubicacion_lat: formUbicacionLat,
                        ubicacion_lng: formUbicacionLng,
                      }}
                      onChange={(next) => {
                        setFormUbicacion(next.ubicacion)
                        setFormUbicacionLat(next.ubicacion_lat)
                        setFormUbicacionLng(next.ubicacion_lng)
                      }}
                    />
                  </div>
                ) : null}

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Observaciones (opcional)</div>
                  <Input value={formObs} onChange={(e) => setFormObs(e.target.value)} placeholder="Ej: Confirmar 1 hora antes..." />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Fecha de llamada postventa *</div>
        <div className="relative">
          <Input
            ref={dateInputRef}
            type="date"
            min={ymd(new Date())}
            value={formFecha}
            onChange={(e) => setFormFecha(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => openNativePicker(dateInputRef)}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">Hora de llamada postventa *</div>
        <div className="relative">
          <Input
            ref={timeInputRef}
            type="time"
            value={formHora}
            onChange={(e) => setFormHora(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => openNativePicker(timeInputRef)}
          >
            <Clock className="h-4 w-4" />
          </Button>
        </div>
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

            {/* ✅ VER AMIGOS (REAL) */}
            {actionOpen?.type === "ver_amigos" ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  {loadingAmigos ? (
                    <div className="text-sm text-muted-foreground">Cargando…</div>
                  ) : errorAmigos ? (
                    <div className="text-sm text-red-500">{errorAmigos}</div>
                  ) : !amigosData ? (
                    <div className="text-sm text-muted-foreground">Sin datos.</div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Recomendado por</div>
                        {amigosData.recomendado_por ? (
                          <button
                            type="button"
                            onClick={() => setDetailProspecto(amigosData.recomendado_por)}
                            className="w-full rounded-md border p-2 text-left text-sm hover:bg-muted/40"
                          >
                            <div className="font-medium">{amigosData.recomendado_por.nombre}</div>
                            <div className="text-muted-foreground">
                              {formatProspectPhone(amigosData.recomendado_por)} · {amigosData.recomendado_por.estado_label ?? amigosData.recomendado_por.estado ?? "—"}
                            </div>
                            <ProspectTreatmentBadge prospect={amigosData.recomendado_por} className="mt-2" />
                          </button>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">Nadie</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Recomendados ({amigosData.recomendados.length})
                        </div>
                        {amigosData.recomendados.length === 0 ? (
                          <div className="text-sm text-muted-foreground italic">No ha recomendado a nadie.</div>
                        ) : (
                          <div className="space-y-2">
                            {amigosData.recomendados.map((r: any) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => setDetailProspecto(r)}
                                className="w-full rounded-md border p-2 text-left text-sm hover:bg-muted/40"
                              >
                                <div className="font-medium">{r.nombre}</div>
                                <div className="text-muted-foreground">
                                  {formatProspectPhone(r)} · {r.estado_label ?? r.estado ?? "—"}
                                </div>
                                <ProspectTreatmentBadge prospect={r} className="mt-2" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* ✅ FOOTER: si es ver_amigos, solo cerrar */}
            {actionOpen?.type === "ver_amigos" ? (
              <div className="flex justify-end pt-2">
                <Button variant="ghost" onClick={() => setActionOpen(null)}>
                  Cerrar
                </Button>
              </div>
            ) : (
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
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ProspectoDetailDialog
        prospecto={detailProspecto}
        open={!!detailProspecto}
        onOpenChange={(open) => !open && setDetailProspecto(null)}
        onActionCompleted={refreshAll}
        showActions={false}
      />
      <ProspectDocumentsDialog
        prospecto={documentsProspecto}
        open={!!documentsProspecto}
        onOpenChange={(open) => !open && setDocumentsProspecto(null)}
      />
    </>
  )
}
