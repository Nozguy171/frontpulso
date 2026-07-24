"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE_URL } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SeguimientoResumeDialog } from "./seguimiento-resume-dialog"
import { ProspectStatusBadge } from "@/components/prospectos/prospect-status-badge"
import { ProspectTreatmentBadge } from "@/components/prospectos/prospect-treatment-badge"
import { ProspectoDetailDialog } from "@/components/prospectos/prospecto-detail-dialog"
import { ProspectDocumentsPanel } from "@/components/prospectos/prospect-documents-panel"
import { formatProspectPhone, isSurveyProspect } from "@/lib/prospect"



import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  DollarSign,
  MoreVertical,
  Phone,
  StickyNote,
  XCircle,
  PlayCircle,
  X,
  CalendarIcon,
  Clock,
  User as UserIcon,
} from "lucide-react"
function openNativePicker(ref: React.RefObject<HTMLInputElement | null>) {
  const el = ref.current
  if (!el) return
  ;(el as any).showPicker?.()
  el.focus()
}

type SeguimientoItem = {
  id: number
  nombre: string
  numero: string
  lada?: string | null
  numero_formateado?: string | null
  numero_encuesta?: string | null
  trato_prospecto?: "enojado" | "feliz" | "neutral" | null
  forma_obtencion_tipo?: "encuesta" | "referido" | "cita_en_frio" | "otro" | null
forma_obtencion?: string | null
  estado: string
  venta_monto_sin_iva: number | null
  venta_fecha: string | null
  observaciones: string | null
  proxima_llamada: string | null
  proxima_llamada_seguimiento: string | null
  seguimiento_activo: boolean
  seguimiento_pausado: boolean
  seguimiento_pausado_at: string | null
  seguimiento_fecha_base?: string | null
}

type HistItem = {
  id: number
  accion: string
  created_at: string
  detalle: string | null
  user?: { id: number; email: string } | null
  actor?: { id: number | null; email: string | null } | null
  effective?: { id: number | null; email: string | null } | null
}

type SeguimientoSaleItem = {
  id: number
  tipo_venta: string
  tipo_venta_label?: string | null
  monto_con_iva: number
  iva_monto: number
  monto_sin_iva: number
  appointment_id?: number | null
  call_id?: number | null
  created_at: string | null
}

type SeguimientoDetailResponse = {
  prospecto: {
    id: number
    nombre: string
    numero: string
    lada?: string | null
    numero_formateado?: string | null
    numero_encuesta?: string | null
    trato_prospecto?: "enojado" | "feliz" | "neutral" | null
    observaciones?: string | null
    estado: string
    estado_label?: string | null
    forma_obtencion?: string | null
    venta_monto_sin_iva?: number | null
    venta_fecha?: string | null
    venta_tipo?: string | null
    venta_tipo_label?: string | null
    created_at?: string | null
  }
  resumen: {
    ventas_count: number
    ventas_total_sin_iva: number
  }
  ventas: SeguimientoSaleItem[]
}

// ✅ acting-as-user header (si existe)
function getAuthAndActingHeaders() {
  const token = localStorage.getItem("pulso_token")

  // IMPORTANT: cambia SOLO este key si tu app lo guarda con otro nombre
const acting = localStorage.getItem("pulso_acting_user_id")
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(acting ? { "X-Acting-As-User": acting } : {}),
  } as Record<string, string>
}

async function apiGet(path: string) {
  const headers = getAuthAndActingHeaders()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    cache: "no-store",
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt || "Error")
  }
  return res.json()
}

function getTodayYMD() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

async function apiPost(path: string, body: any) {
  const headers = getAuthAndActingHeaders()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt || "Error")
  }
  return res.json()
}

function formatFechaCorta(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX")
}

function formatHora(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
}

function formatFechaHoraBonita(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  const fecha = d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" })
  const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
  return `${fecha} • ${hora}`
}

function isoDayFromDateInput(dateStr: string) {
  return dateStr.trim()
}

function isObsHistoryItem(item: HistItem) {
  const accion = (item.accion || "").toLowerCase()
  const detalle = (item.detalle || "").trim()
  if (!detalle) return false

  if (accion === "observaciones") return true
  if (accion === "rechazado") return true
  return false
}

function getObsHistorySource(item: HistItem) {
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

function getObsHistoryText(detalle: string | null) {
  if (!detalle) return ""
  return detalle
    .replace(/^Observaciones añadidas:\s*/i, "")
    .replace(/^\[(creacion|manual|cita|llamada|rechazo)\]\s*/i, "")
    .trim()
}

function getObsHistoryAuthor(item: HistItem) {
  return item.effective?.email || item.user?.email || item.actor?.email || "—"
}

function getSeguimientoStatusUI(
  item: Pick<SeguimientoItem, "seguimiento_activo" | "seguimiento_pausado">
) {
  if (item.seguimiento_activo) {
    return {
      key: "activo" as const,
      label: "Seguimiento activo",
      shortLabel: "Activo",
      badgeClass: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
      cardClass: "border-green-500/30 bg-green-500/5",
      dotClass: "bg-green-500",
    }
  }

  if (item.seguimiento_pausado) {
    return {
      key: "pausado" as const,
      label: "Seguimiento pausado",
      shortLabel: "Pausado",
      badgeClass: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
      cardClass: "border-red-500/30 bg-red-500/5",
      dotClass: "bg-red-500",
    }
  }

  return {
    key: "pendiente" as const,
    label: "Pendiente de iniciar",
    shortLabel: "Pendiente",
    badgeClass: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    cardClass: "border-yellow-500/30 bg-yellow-500/5",
    dotClass: "bg-yellow-500",
  }
}

export function SeguimientoView() {
  const [items, setItems] = useState<SeguimientoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todos" | "activo" | "pendiente" | "pausado">("todos")
  const [resumeProspect, setResumeProspect] = useState<SeguimientoItem | null>(null)
  const todayYMD = useMemo(() => getTodayYMD(), [])
  // detalle
  const [openProspectId, setOpenProspectId] = useState<number | null>(null)
  const [detailProspecto, setDetailProspecto] = useState<any | null>(null)
  const selected = useMemo(() => items.find((x) => x.id === openProspectId) ?? null, [items, openProspectId])
const activos = useMemo(() => items.filter((p) => !!p.seguimiento_activo), [items])

const pendientesInicio = useMemo(
  () => items.filter((p) => !p.seguimiento_activo && !p.seguimiento_pausado),
  [items]
)

const pausados = useMemo(
  () => items.filter((p) => !p.seguimiento_activo && !!p.seguimiento_pausado),
  [items]
)

const selectedSeguimientoUi = useMemo(
  () => (selected ? getSeguimientoStatusUI(selected) : null),
  [selected]
)

const visibleCount = useMemo(() => {
  if (statusFilter === "activo") return activos.length
  if (statusFilter === "pendiente") return pendientesInicio.length
  if (statusFilter === "pausado") return pausados.length
  return items.length
}, [statusFilter, activos.length, pendientesInicio.length, pausados.length, items.length])

const showActivosSection = statusFilter === "todos" || statusFilter === "activo"
const showPendientesSection = statusFilter === "todos" || statusFilter === "pendiente"
const showPausadosSection = statusFilter === "todos" || statusFilter === "pausado"

  // mini-historial SOLO observaciones
  const [obsHist, setObsHist] = useState<HistItem[]>([])
  const [obsLoading, setObsLoading] = useState(false)
  const [obsError, setObsError] = useState<string | null>(null)
  const [oldestNotesFirst, setOldestNotesFirst] = useState(false)
  const [detailData, setDetailData] = useState<SeguimientoDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  // modales de acciones
  const [modal, setModal] = useState<null | { type: "llamada" | "observacion" | "venta"; prospect: SeguimientoItem }>(null)
  const [saving, setSaving] = useState(false)
const llamadaFechaInputRef = useRef<HTMLInputElement | null>(null)
const llamadaHoraInputRef = useRef<HTMLInputElement | null>(null)
  // forms
  const [formFecha, setFormFecha] = useState("")
  const [formHora, setFormHora] = useState("")
  const [formObs, setFormObs] = useState("")
  const [formTipoVenta, setFormTipoVenta] = useState<"" | "contado" | "credito">("")
  const [formMontoConIva, setFormMontoConIva] = useState("")
  const [formIvaPorcentaje, setFormIvaPorcentaje] = useState("")
const selectedDetailProspect = detailData?.prospecto ?? null
const montoConIvaNum = Number(formMontoConIva)
const ivaPorcentajeNum = Number(formIvaPorcentaje)
const montoSinIvaCalculado = useMemo(() => {
  if (!formMontoConIva || !formIvaPorcentaje) return null
  if (!Number.isFinite(montoConIvaNum) || !Number.isFinite(ivaPorcentajeNum) || ivaPorcentajeNum < 0) return null
  const divisor = 1 + ivaPorcentajeNum / 100
  if (!Number.isFinite(divisor) || divisor <= 0) return null
  return montoConIvaNum / divisor
}, [formMontoConIva, formIvaPorcentaje, montoConIvaNum, ivaPorcentajeNum])
const orderedObsHist = useMemo(() => {
  return obsHist.slice().sort((a, b) => {
    const diff = +new Date(a.created_at) - +new Date(b.created_at)
    return oldestNotesFirst ? diff : -diff
  })
}, [obsHist, oldestNotesFirst])
const selectedVentas = detailData?.ventas ?? []
const selectedVentasCount = detailData?.resumen?.ventas_count ?? 0
const selectedVentasTotal = detailData?.resumen?.ventas_total_sin_iva ?? selected?.venta_monto_sin_iva ?? 0
const selectedHasVenta = selectedVentasCount > 0 || selected?.venta_monto_sin_iva != null || selectedDetailProspect?.venta_monto_sin_iva != null
  const resetForms = () => {
    setFormFecha("")
    setFormHora("")
    setFormObs("")
    setFormTipoVenta("")
    setFormMontoConIva("")
    setFormIvaPorcentaje("")
  }

  const fetchSeguimiento = async (qOverride?: string) => {
    const q = (qOverride ?? search).trim()
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/prospects/seguimiento?limit=200&q=${encodeURIComponent(q)}`)
      setItems((data.seguimiento || []) as SeguimientoItem[])
    } catch (e: any) {
      setError(e?.message || "Error cargando seguimiento")
    } finally {
      setLoading(false)
    }
  }

  const fetchObsHistory = async (prospectId: number) => {
    setObsLoading(true)
    setObsError(null)
    try {
      const data = await apiGet(`/prospects/${prospectId}/historial`)
      const historial = (data?.historial || []) as HistItem[]
      const onlyObs = historial
        .filter(isObsHistoryItem)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))

      setObsHist(onlyObs)
    } catch (e: any) {
      setObsError(e?.message || "Error cargando observaciones")
      setObsHist([])
    } finally {
      setObsLoading(false)
    }
  }

  const fetchProspectDetail = async (prospectId: number) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const data = await apiGet(`/prospects/${prospectId}/detalle`)
      setDetailData(data as SeguimientoDetailResponse)
    } catch (e: any) {
      setDetailError(e?.message || "Error cargando detalle del cliente")
      setDetailData(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchSeguimiento("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchSeguimiento(), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    if (openProspectId) {
      fetchObsHistory(openProspectId)
      fetchProspectDetail(openProspectId)
    } else {
      setObsHist([])
      setObsError(null)
      setObsLoading(false)
      setDetailData(null)
      setDetailError(null)
      setDetailLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProspectId])
const iniciarSeguimiento = async (p: SeguimientoItem) => {
  if (p.seguimiento_activo) return
  setResumeProspect(p)
}
const pausarSeguimiento = async (p: SeguimientoItem) => {
  setSaving(true)
  try {
    await apiPost(`/prospects/${p.id}/acciones`, { accion: "pausar_seguimiento" })
    await fetchSeguimiento()
    if (openProspectId === p.id) {
      await fetchObsHistory(p.id)
    }
  } catch (e: any) {
    alert(e?.message || "No se pudo pausar seguimiento")
  } finally {
    setSaving(false)
  }
}
const reanudarSeguimiento = async (payload: { dia: string; hora: string }) => {
  if (!resumeProspect) return

  const p = resumeProspect

  setSaving(true)
  try {
    await apiPost(`/prospects/${p.id}/acciones`, {
      accion: "iniciar_seguimiento",
      dia: payload.dia,
      hora: payload.hora,
    })

    setResumeProspect(null)
    await fetchSeguimiento()

    if (openProspectId === p.id) {
      await fetchObsHistory(p.id)
    }
  } catch (e: any) {
    alert(e?.message || `No se pudo ${p.seguimiento_pausado ? "reanudar" : "iniciar"} seguimiento`)
  } finally {
    setSaving(false)
  }
}

const openProgramarLlamada = (p: SeguimientoItem) => {
  resetForms()
  setModal({ type: "llamada", prospect: p })
}

  const openObservacion = (p: SeguimientoItem) => {
    resetForms()
    setModal({ type: "observacion", prospect: p })
  }

  const openVenta = (p: SeguimientoItem) => {
    resetForms()
    setFormFecha(todayYMD)
    setModal({ type: "venta", prospect: p })
  }



  const submitModal = async () => {
    if (!modal) return
    const p = modal.prospect

    setSaving(true)
    try {
if (modal.type === "llamada") {
  if (!formFecha || !formHora) {
    alert("Fecha y hora son obligatorias")
    return
  }

  if (formFecha < todayYMD) {
    alert("No puedes elegir un día anterior a hoy")
    return
  }

  await apiPost(`/prospects/${p.id}/acciones`, {
    accion: "programar_llamada",
    fecha: isoDayFromDateInput(formFecha),
    hora: formHora,
    observaciones: (formObs || "").trim() || "Seguimiento (manual)",
  })
}

      if (modal.type === "observacion") {
        if (!formObs.trim()) {
          alert("Escribe una observación")
          return
        }
        await apiPost(`/prospects/${p.id}/acciones`, { accion: "observaciones", observaciones: formObs.trim() })
      }

      if (modal.type === "venta") {
        if (!formTipoVenta) {
          alert("Debes elegir si la venta fue a contado o a crédito")
          return
        }
        if (!formFecha || !formHora) {
          alert("Debes elegir la fecha y hora de la llamada postventa")
          return
        }

        const montoConIva = Number(formMontoConIva)
        const ivaPorcentaje = Number(formIvaPorcentaje)
        const divisor = 1 + ivaPorcentaje / 100
        const montoSinIva = montoConIva / divisor
        const ivaMontoCalculado = montoConIva - montoSinIva

        if (!Number.isFinite(montoConIva) || montoConIva <= 0 || !Number.isFinite(ivaPorcentaje) || ivaPorcentaje < 0 || !Number.isFinite(montoSinIva) || montoSinIva <= 0) {
          alert("Ingresa monto e IVA válidos")
          return
        }

        await apiPost(`/prospects/${p.id}/acciones`, {
          accion: "vendido",
          tipo_venta: formTipoVenta,
          monto_con_iva: montoConIva,
          iva_monto: Number(ivaMontoCalculado.toFixed(2)),
          fecha: isoDayFromDateInput(formFecha),
          hora: formHora,
        })
      }

      setModal(null)
      await fetchSeguimiento()
      if (openProspectId === p.id) {
        await fetchObsHistory(p.id)
        await fetchProspectDetail(p.id)
      }
    } catch (e: any) {
      alert(e?.message || "No se pudo completar la acción")
    } finally {
      setSaving(false)
    }
  }
const renderSeguimientoSection = (
  title: string,
  description: string,
  tone: "green" | "yellow" | "red",
  sectionItems: SeguimientoItem[]
) => {
  const tones =
    tone === "green"
      ? {
          wrap: "border-green-500/30 bg-green-500/5",
          badge: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
          dot: "bg-green-500",
        }
      : tone === "yellow"
        ? {
            wrap: "border-yellow-500/30 bg-yellow-500/5",
            badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
            dot: "bg-yellow-500",
          }
        : {
            wrap: "border-red-500/30 bg-red-500/5",
            badge: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
            dot: "bg-red-500",
          }

  return (
    <section className="space-y-3">
      <div className={`rounded-xl border px-3 py-3 sm:px-4 ${tones.wrap}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tones.dot}`} />
              <h2 className="text-sm sm:text-base font-semibold text-foreground">{title}</h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{description}</p>
          </div>

          <Badge variant="outline" className={`w-fit ${tones.badge}`}>
            {sectionItems.length} {sectionItems.length === 1 ? "cliente" : "clientes"}
          </Badge>
        </div>
      </div>

      {sectionItems.length > 0 ? (
        <div className="grid gap-3 sm:gap-4">
          {sectionItems.map((p) => {
            const seguimientoActivo = !!p.seguimiento_activo
            const seguimientoPausado = !!p.seguimiento_pausado
            const statusUi = getSeguimientoStatusUI(p)

            return (
              <Card
                key={p.id}
                className={`hover:border-primary/50 transition-colors cursor-pointer ${statusUi.cardClass}`}
                role="button"
                tabIndex={0}
                onClick={() => setOpenProspectId(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setOpenProspectId(p.id)
                }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                            {p.nombre}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="max-w-[220px] truncate">
                              {formatProspectPhone(p)}
                            </Badge>
                            {isSurveyProspect(p) ? (
                              <Badge variant="outline" className="text-[11px] sm:text-xs">
                                Encuesta: {p.numero_encuesta ?? "—"}
                              </Badge>
                            ) : null}
                            <ProspectStatusBadge prospect={p} />
                            <ProspectTreatmentBadge prospect={p} />

                            <Badge variant="outline" className={`text-[11px] sm:text-xs ${statusUi.badgeClass}`}>
                              {statusUi.shortLabel}
                            </Badge>
                          </div>
                        </div>

                        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Acciones" className="h-9 w-9">
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                disabled={seguimientoActivo || saving}
                                onSelect={(e) => {
                                  e.preventDefault()
                                  if (seguimientoActivo) return
                                  iniciarSeguimiento(p)
                                }}
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                {seguimientoPausado ? "Reanudar seguimiento" : "Iniciar seguimiento"}
                              </DropdownMenuItem>

<DropdownMenuItem
  disabled={saving}
  onSelect={(e) => {
    e.preventDefault()
    openProgramarLlamada(p)
  }}
>
                                <Phone className="h-4 w-4 mr-2" />
                                Programar llamada
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={!seguimientoActivo || seguimientoPausado || saving}
                                onSelect={(e) => {
                                  e.preventDefault()
                                  if (!seguimientoActivo || seguimientoPausado) return
                                  pausarSeguimiento(p)
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Pausar seguimiento
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={saving}
                                onSelect={(e) => {
                                  e.preventDefault()
                                  openObservacion(p)
                                }}
                              >
                                <StickyNote className="h-4 w-4 mr-2" />
                                Agregar observación
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 shrink-0" />
                          <span className="font-medium truncate">
                            {p.venta_monto_sin_iva != null
                              ? `$${Number(p.venta_monto_sin_iva).toLocaleString()} MXN (sin IVA)`
                              : "—"}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground sm:text-right">
                          Próxima llamada: {formatFechaCorta(p.proxima_llamada)}{" "}
                          {p.proxima_llamada ? `• ${formatHora(p.proxima_llamada)}` : ""}
                        </p>
                      </div>

                      {p.observaciones ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          <span className="font-medium text-foreground">Notas:</span> {p.observaciones}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Sin observaciones</p>
                      )}

                      {p.forma_obtencion ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Forma de obtención:</span>{" "}
                          {p.forma_obtencion}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            No hay clientes en esta sección.
          </CardContent>
        </Card>
      )}
    </section>
  )
}
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Seguimiento</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Clientes con ventas realizadas</p>
        </div>

        <Card className="mb-3 sm:mb-4">
          <CardHeader className="py-3 sm:py-4">
<CardTitle className="text-base sm:text-lg">Estado del seguimiento</CardTitle>          </CardHeader>
          <CardContent className="pt-0 space-y-3">
<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
  <div className="text-xs sm:text-sm text-muted-foreground">
    {loading ? "Cargando..." : `${visibleCount} cliente${visibleCount === 1 ? "" : "s"}`}
  </div>

  <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={statusFilter === "todos" ? "default" : "outline"}
        onClick={() => setStatusFilter("todos")}
        className="h-9"
      >
        Todos
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setStatusFilter("activo")}
        className={`h-9 ${
          statusFilter === "activo"
            ? "border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/15 dark:text-green-400"
            : ""
        }`}
      >
        Activo
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setStatusFilter("pendiente")}
        className={`h-9 ${
          statusFilter === "pendiente"
            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/15 dark:text-yellow-400"
            : ""
        }`}
      >
        Pendiente
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setStatusFilter("pausado")}
        className={`h-9 ${
          statusFilter === "pausado"
            ? "border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-400"
            : ""
        }`}
      >
        Pausado
      </Button>
    </div>

    <div className="w-full sm:w-[360px]">
      <Input
        placeholder="Buscar por nombre o número…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-10"
      />
    </div>
  </div>
</div>
            {error ? <div className="text-xs sm:text-sm text-red-500">{error}</div> : null}
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-4 sm:p-6 text-sm text-muted-foreground">Cargando seguimiento…</CardContent>
          </Card>
          ) : items.length > 0 ? (
<div className="space-y-6">
  {showActivosSection ? (
    renderSeguimientoSection(
      "Seguimiento activo",
      "Clientes que actualmente tienen seguimiento corriendo.",
      "green",
      activos
    )
  ) : null}

  {showPendientesSection ? (
    renderSeguimientoSection(
      "Pendiente de iniciar",
      "Clientes a los que todavía nunca se les ha iniciado el seguimiento.",
      "yellow",
      pendientesInicio
    )
  ) : null}

  {showPausadosSection ? (
    renderSeguimientoSection(
      "Seguimiento inactivo",
      "Clientes cuyo seguimiento ya fue iniciado antes, pero actualmente está pausado.",
      "red",
      pausados
    )
  ) : null}
</div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground italic">No hay prospectos en seguimiento.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ✅ MODAL DETALLE (PC scroll real: altura fija SIEMPRE) */}
      <Dialog open={!!openProspectId} onOpenChange={(v) => !v && setOpenProspectId(null)}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="p-0 overflow-hidden w-[min(980px,96vw)] h-[85vh] max-h-[85vh] rounded-xl flex flex-col"
        >
          {/* header */}
          <div className="shrink-0 bg-background/95 backdrop-blur border-b">
            <div className="flex items-start sm:items-center justify-between gap-3 p-5 sm:p-6">
              <DialogHeader className="space-y-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl truncate">Detalle del cliente</DialogTitle>
                <DialogDescription className="text-sm">Observaciones y seguimiento</DialogDescription>
              </DialogHeader>


            </div>
          </div>

          {/* body scrolls */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-5 sm:p-6">
                {!selected ? (
                  <div className="text-sm text-muted-foreground">Cargando…</div>
                ) : (
                  <div className="space-y-5">
                    <Card>
                      <CardContent className="p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-muted-foreground">Cliente</div>
                          <div className="font-semibold text-2xl truncate">
  {selectedDetailProspect?.nombre ?? selected.nombre}
</div>

<div className="mt-1 flex flex-wrap items-center gap-2">
  <Badge variant="secondary" className="max-w-[320px] truncate">
    {formatProspectPhone(selectedDetailProspect ?? selected)}
  </Badge>
  {isSurveyProspect(selectedDetailProspect ?? selected) ? (
    <Badge variant="outline" className="text-xs">
      Encuesta: {selectedDetailProspect?.numero_encuesta ?? selected.numero_encuesta ?? "—"}
    </Badge>
  ) : null}
  <ProspectStatusBadge prospect={selectedDetailProspect ?? selected} />
  <ProspectTreatmentBadge prospect={selectedDetailProspect ?? selected} />
  <Badge variant="outline" className="text-xs">
    {selected.estado}
  </Badge>
</div>
                          {selectedSeguimientoUi ? (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="outline" className={`text-xs ${selectedSeguimientoUi.badgeClass}`}>
      {selectedSeguimientoUi.label}
    </Badge>
  </div>
) : null}
{(selectedDetailProspect?.forma_obtencion ?? selected.forma_obtencion) ? (
  <div className="text-sm text-muted-foreground">
    <span className="font-medium text-foreground">Forma de obtención:</span>{" "}
    {selectedDetailProspect?.forma_obtencion ?? selected.forma_obtencion}
  </div>
) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-fit"
                            onClick={() => setDetailProspecto(selectedDetailProspect ?? selected)}
                          >
                            Ver prospecto
                          </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
<div className="flex items-start gap-3 text-sm rounded-xl border p-4">
  <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
  <div className="min-w-0">
    <div className="text-muted-foreground text-xs">Total vendido (sin IVA)</div>
    <div className="font-medium truncate">
      {selectedVentasTotal
        ? `$${Number(selectedVentasTotal).toLocaleString("es-MX")} MXN`
        : "—"}
    </div>
    <div className="text-xs text-muted-foreground mt-1">
      {selectedVentasCount
        ? `${selectedVentasCount} venta${selectedVentasCount === 1 ? "" : "s"} registradas`
        : "Sin ventas registradas"}
    </div>
  </div>
</div>

                          <div className="flex items-start gap-3 text-sm rounded-xl border p-4">
                            <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="text-muted-foreground text-xs">Próxima llamada</div>
                              <div className="font-medium">
                                {formatFechaCorta(selected.proxima_llamada)}{" "}
                                {selected.proxima_llamada ? `• ${formatHora(selected.proxima_llamada)}` : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
<Card>
  <CardContent className="p-5 sm:p-6">
    <div className="flex items-center gap-2">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <div className="text-sm font-semibold">Ventas</div>
    </div>

    <div className="mt-4">
      {detailLoading ? (
        <div className="text-sm text-muted-foreground">Cargando ventas…</div>
      ) : detailError ? (
        <div className="text-sm text-red-500">{detailError}</div>
      ) : selectedVentas.length > 0 ? (
        <div className="space-y-3">
          {selectedVentas.map((venta, idx) => (
            <div key={venta.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium text-sm">
                  Venta #{selectedVentas.length - idx} · {venta.tipo_venta_label ?? venta.tipo_venta}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFechaHoraBonita(venta.created_at)}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Con IVA</div>
                  <div className="font-medium mt-1">
                    ${Number(venta.monto_con_iva).toLocaleString("es-MX")} MXN
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">IVA</div>
                  <div className="font-medium mt-1">
                    ${Number(venta.iva_monto).toLocaleString("es-MX")} MXN
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Sin IVA</div>
                  <div className="font-medium mt-1">
                    ${Number(venta.monto_sin_iva).toLocaleString("es-MX")} MXN
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic">Sin ventas registradas</div>
      )}
    </div>
  </CardContent>
</Card>
{selectedHasVenta && selected ? <ProspectDocumentsPanel prospectId={selected.id} /> : null}
                    <Card>
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <StickyNote className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm font-semibold">Observaciones</div>
                          </div>
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

                        <div className="mt-4">
                          {obsLoading ? (
                            <div className="text-sm text-muted-foreground">Cargando observaciones…</div>
                          ) : obsError ? (
                            <div className="text-sm text-red-500">{obsError}</div>
                          ) : orderedObsHist.length > 0 ? (
                            <div className="space-y-3">
                              {orderedObsHist.map((h) => (
                                <div key={h.id} className="rounded-xl border p-4">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                                      <UserIcon className="h-4 w-4 shrink-0" />
                                      <span className="font-medium text-foreground truncate">
                                        {getObsHistoryAuthor(h)}
                                      </span>
                                      <Badge variant="outline" className="text-[10px]">
                                        {getObsHistorySource(h)}
                                      </Badge>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="h-4 w-4 shrink-0" />
                                      <span>{formatFechaHoraBonita(h.created_at)}</span>
                                    </div>
                                  </div>

                                  <div className="mt-3 whitespace-pre-wrap break-words text-sm">
                                    {getObsHistoryText(h.detalle) || "—"}
                                  </div>
                                </div>
                              ))}
                            </div>
                            ) : (
                            <div className="text-sm text-muted-foreground italic">Sin observaciones</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* ✅ acciones + bloquear programar si seguimiento activo */}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
  variant="outline"
  onClick={() => iniciarSeguimiento(selected)}
disabled={saving || selected.seguimiento_activo}>
  <PlayCircle className="h-4 w-4 mr-2" />
  {selected.seguimiento_pausado ? "Reanudar seguimiento" : "Iniciar seguimiento"}
</Button>
<Button
  variant="outline"
  onClick={() => openProgramarLlamada(selected)}
  disabled={saving}>
  <Phone className="h-4 w-4 mr-2" />
  Programar llamada
</Button>
<Button
  variant="outline"
  onClick={() => openVenta(selected)}
  disabled={saving}>
  <DollarSign className="h-4 w-4 mr-2" />
  Registrar venta
</Button>
<Button
  variant="outline"
  onClick={() => pausarSeguimiento(selected)}
disabled={saving || !selected.seguimiento_activo || selected.seguimiento_pausado}>
  <XCircle className="h-4 w-4 mr-2" />
  Pausar seguimiento
</Button>

                      <Button variant="outline" onClick={() => openObservacion(selected)} disabled={saving}>
                        <StickyNote className="h-4 w-4 mr-2" />
                        Agregar observación
                      </Button>

                      <Button variant="destructive" onClick={() => setOpenProspectId(null)}>
                        Cerrar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ MODAL PROGRAMAR LLAMADA / OBSERVACIÓN (altura fija para scroll en PC) */}
<Dialog open={!!modal} onOpenChange={(v) => !v && setModal(null)}>
  <DialogContent
    onOpenAutoFocus={(e) => e.preventDefault()}
    className="flex h-[calc(100dvh-1rem)] max-h-[44rem] w-[min(620px,96vw)] flex-col overflow-hidden rounded-xl p-0"
  >
    <div className="shrink-0 border-b p-5 sm:p-6">
      <DialogHeader>
        <DialogTitle className="text-lg">
          {modal?.type === "llamada" ? "Programar llamada" : modal?.type === "venta" ? "Registrar venta" : "Agregar observación"}
        </DialogTitle>
        <DialogDescription className="text-sm">
          {modal?.prospect?.nombre ?? "—"} • {formatProspectPhone(modal?.prospect)}
        </DialogDescription>
        <ProspectTreatmentBadge prospect={modal?.prospect} />
      </DialogHeader>
    </div>

    <div className="scrollbar-thin grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-5 sm:p-6">
                {modal?.type === "llamada" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Fecha</div>
<div className="relative">
  <Input
    ref={llamadaFechaInputRef}
    type="date"
    min={todayYMD}
    value={formFecha}
    onChange={(e) => setFormFecha(e.target.value)}
    className="pr-12 picker-dark-clean h-10"
  />
  <button
    type="button"
    onClick={() => openNativePicker(llamadaFechaInputRef)}
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
    ref={llamadaHoraInputRef}
    type="time"
    value={formHora}
    onChange={(e) => setFormHora(e.target.value)}
    className="pr-12 picker-dark-clean h-10"
  />
  <button
    type="button"
    onClick={() => openNativePicker(llamadaHoraInputRef)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white"
    aria-label="Seleccionar hora"
  >
    <Clock className="h-4 w-4" />
  </button>
</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Observaciones (opcional)</div>
                      <Input
                        value={formObs}
                        onChange={(e) => setFormObs(e.target.value)}
                        placeholder="Ej: confirmar 1 hora antes…"
                        className="h-10"
                      />
                    </div>
                  </>
                ) : null}

                {modal?.type === "observacion" ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Observación</div>
                    <Input
                      value={formObs}
                      onChange={(e) => setFormObs(e.target.value)}
                      placeholder="Escribe la observación…"
                      className="h-10"
                    />
                  </div>
                ) : null}

                {modal?.type === "venta" ? (
                  <div className="grid gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Tipo de venta *</div>
                      <Select value={formTipoVenta} onValueChange={(value) => setFormTipoVenta(value as "contado" | "credito")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo de venta..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contado">Contado</SelectItem>
                          <SelectItem value="credito">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Precio con IVA *</div>
                        <Input
                          inputMode="decimal"
                          placeholder="Ej: 12000"
                          value={formMontoConIva}
                          onChange={(e) => setFormMontoConIva(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">IVA (%) *</div>
                        <Input
                          inputMode="decimal"
                          placeholder="Ej: 16"
                          value={formIvaPorcentaje}
                          onChange={(e) => setFormIvaPorcentaje(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
                        />
                      </div>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground mb-1">Precio sin IVA</div>
                      <div className="text-lg font-semibold">
                        {montoSinIvaCalculado == null ? "—" : montoSinIvaCalculado.toFixed(2)}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Fecha de llamada postventa *</div>
                        <Input type="date" min={todayYMD} value={formFecha} onChange={(e) => setFormFecha(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Hora de llamada postventa *</div>
                        <Input type="time" value={formHora} onChange={(e) => setFormHora(e.target.value)} />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button variant="ghost" onClick={() => setModal(null)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button onClick={submitModal} disabled={saving || (modal?.type === "venta" && !formTipoVenta)}>
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
          </div>
        </DialogContent>
      </Dialog>

<SeguimientoResumeDialog
  open={!!resumeProspect}
  prospect={resumeProspect}
  loading={saving}
  onOpenChange={(open) => {
    if (!open) setResumeProspect(null)
  }}
  onSubmit={reanudarSeguimiento}
/>

<ProspectoDetailDialog
  prospecto={detailProspecto}
  open={!!detailProspecto}
  onOpenChange={(open) => !open && setDetailProspecto(null)}
  onActionCompleted={() => fetchSeguimiento()}
  showActions={false}
/>

    </>
  )
}
