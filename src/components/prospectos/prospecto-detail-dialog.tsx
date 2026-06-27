"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Phone,
  Users,
  CalendarDays,
  Clock3,
  FileText,
  MoreVertical,
  DollarSign,
} from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import { ProspectoActionsDialog } from "./prospecto-action-dialog"
import { ProspectStatusBadge } from "./prospect-status-badge"
import { ProspectDocumentsPanel } from "./prospect-documents-panel"
import { getAppointmentGoogleMapsUrl } from "@/components/citas/appointment-location-picker"

type ProspectoBase = {
  id: number
  nombre: string
  numero: string
  numero_encuesta?: string | null
  observaciones?: string | null
  estado: string
  estado_label?: string | null
  recomendado_por_id?: number | null
  recomendado_por_nombre?: string | null
  forma_obtencion_tipo?: "encuesta" | "cita_en_frio" | "otro" | null
  forma_obtencion?: string | null
  venta_monto_sin_iva?: number | null
  venta_fecha?: string | null
  rechazo_motivo?: string | null
  rechazo_at?: string | null
  rechazo_count?: number
  seguimiento_pausado?: boolean
  seguimiento_pausado_at?: string | null
  seguimiento_fecha_base?: string | null
  created_at?: string
}

type DetailResponse = {
  prospecto: ProspectoBase
  resumen: {
    recomendado_por?: ProspectoBase | null
    recomendados_count: number
    citas_count: number
    llamadas_count: number
    ventas_count: number
    ventas_total_sin_iva: number
    documentos_count?: number
    documentos_total?: number
  }
  recomendados: ProspectoBase[]
  citas: Array<{
    id: number
    fecha_hora: string | null
    ubicacion: string | null
    ubicacion_lat?: number | null
    ubicacion_lng?: number | null
    observaciones: string | null
    estado: string
    estado_label?: string | null
    estado_detalle?: string | null
    resolved_at?: string | null
    created_at?: string | null
    updated_at?: string | null
  }>
  llamadas: Array<{
    id: number
    fecha_hora: string | null
    observaciones: string | null
    estado: string
    estado_label?: string | null
    estado_detalle?: string | null
    resolved_at?: string | null
    created_at?: string | null
    updated_at?: string | null
  }>
    ventas: Array<{
    id: number
    tipo_venta: string
    tipo_venta_label?: string | null
    monto_con_iva: number
    iva_monto: number
    monto_sin_iva: number
    appointment_id?: number | null
    call_id?: number | null
    created_at: string | null
  }>
  documentos?: Array<{
    type: string
    label: string
    uploaded: boolean
  }>
  historial: Array<{
    id: number
    accion: string
    accion_label?: string | null
    created_at: string
    de_estado?: string | null
    de_estado_label?: string | null
    a_estado?: string | null
    a_estado_label?: string | null
    detalle?: string | null
    actor?: {
      id: number
      email?: string | null
    }
    effective?: {
      id: number
      email?: string | null
    }
  }>
}

interface ProspectoDetailDialogProps {
  prospecto: ProspectoBase | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionCompleted?: (updated?: ProspectoBase) => void
  showActions?: boolean
}

function getActingAsUserId(): string | null {
  const v = localStorage.getItem("pulso_acting_user_id")
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
}

function fmtDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
function isHistoryNoteLike(item: DetailResponse["historial"][number]) {
  const accion = (item.accion || "").toLowerCase()
  const detalle = (item.detalle || "").trim()
  if (!detalle) return false

  if (accion === "observaciones") return true
  if (accion === "rechazado") return true
  return false
}

function getHistoryNoteSource(item: DetailResponse["historial"][number]) {
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

function getHistoryNoteText(item: DetailResponse["historial"][number]) {
  return (item.detalle || "")
    .replace(/^Observaciones añadidas:\s*/i, "")
    .replace(/^\[(creacion|manual|cita|llamada|rechazo)\]\s*/i, "")
    .trim()
}

function getHistoryNoteAuthor(item: DetailResponse["historial"][number]) {
  return item.effective?.email || item.actor?.email || "—"
}

function isProspectCreated(item: Pick<DetailResponse["historial"][number], "accion">) {
  return item.accion === "crear_prospecto"
}

export function ProspectoDetailDialog({
  prospecto,
  open,
  onOpenChange,
  onActionCompleted,
  showActions = true,
}: ProspectoDetailDialogProps) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [openActions, setOpenActions] = useState(false)
  const [activeProspecto, setActiveProspecto] = useState<ProspectoBase | null>(prospecto)
  const [prospectStack, setProspectStack] = useState<ProspectoBase[]>([])
  const [oldestNotesFirst, setOldestNotesFirst] = useState(false)
  const [oldestHistoryFirst, setOldestHistoryFirst] = useState(false)

  useEffect(() => {
    if (!open) return
    setActiveProspecto(prospecto)
    setProspectStack([])
  }, [open, prospecto?.id])

  useEffect(() => {
    if (!open || !activeProspecto?.id) return

    let alive = true

    ;(async () => {
      try {
        setLoading(true)
        setDetail(null)

        const token = localStorage.getItem("pulso_token")
        const actingAs = getActingAsUserId()

        const res = await fetch(`${API_BASE_URL}/prospects/${activeProspecto.id}/detalle`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
          },
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.message ?? "Error cargando detalle")
        }

        if (!alive) return
        setDetail(data)
      } catch (e) {
        console.error(e)
        if (!alive) return
        setDetail(null)
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [open, activeProspecto?.id])

  const p = detail?.prospecto ?? activeProspecto
  const noteHistory = useMemo(() => {
    return (detail?.historial ?? [])
      .filter(isHistoryNoteLike)
      .slice()
      .sort((a, b) => {
        const diff = +new Date(a.created_at) - +new Date(b.created_at)
        return oldestNotesFirst ? diff : -diff
      })
  }, [detail?.historial, oldestNotesFirst])
  const history = useMemo(() => {
    return (detail?.historial ?? []).slice().sort((a, b) => {
      const diff = +new Date(a.created_at) - +new Date(b.created_at)
      if (diff !== 0) return oldestHistoryFirst ? diff : -diff
      if (!oldestHistoryFirst) return 0
      return Number(isProspectCreated(b)) - Number(isProspectCreated(a))
    })
  }, [detail?.historial, oldestHistoryFirst])
  const previousProspecto = prospectStack.length ? prospectStack[prospectStack.length - 1] : null
  const openRelatedProspecto = (next: ProspectoBase) => {
    if (p) setProspectStack((prev) => [...prev, p])
    setActiveProspecto(next)
  }
  const goBackProspecto = () => {
    const previous = prospectStack.at(-1)
    if (!previous) return
    setProspectStack((prev) => prev.slice(0, -1))
    setActiveProspecto(previous)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-[820px] p-0 overflow-hidden">
          <div className="border-b bg-background/95 backdrop-blur">
            <div className="flex flex-col gap-3 p-4 pr-14 sm:p-6 sm:pr-16">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <DialogHeader className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <DialogTitle className="min-w-0 truncate text-lg sm:text-2xl">
                      {p?.nombre ?? "Prospecto"}
                    </DialogTitle>
                    {previousProspecto ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={goBackProspecto}
                        className="shrink-0"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Volver</span>
                      </Button>
                    ) : null}
                  </div>
                  <DialogDescription className="text-xs sm:text-sm">
                    Información completa del prospecto
                  </DialogDescription>
                </DialogHeader>

                {p && showActions && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenActions(true)}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Acciones
                  </Button>
                )}
              </div>
            </div>
          </div>

          <ScrollArea key={activeProspecto?.id} className="max-h-[80vh]">
            <div className="p-4 sm:p-6 grid gap-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Cargando detalle...</div>
              ) : !p ? (
                <div className="text-sm text-muted-foreground">
                  No se pudo cargar el prospecto.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Estado</div>
<Badge variant="secondary" className="mt-1">
  {p.estado_label ?? p.estado}
</Badge>
<div className="mt-2">
  <ProspectStatusBadge prospect={p} />
</div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Número</div>
                          <div className="font-medium flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4" />
                            {p.numero}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Número de encuesta</div>
                          <div className="font-medium mt-1">{p.numero_encuesta ?? "—"}</div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Forma de obtención</div>
                          <div className="font-medium mt-1">{p.forma_obtencion ?? "—"}</div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Recomendado por</div>
                          <div className="font-medium mt-1">
                            {detail?.resumen?.recomendado_por?.nombre ??
                              p.recomendado_por_nombre ??
                              "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Creado</div>
                          <div className="font-medium mt-1">{fmtDate(p.created_at)}</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Total vendido (sin IVA)</div>
                          <div className="font-medium mt-1">
                            {p.venta_monto_sin_iva != null
                              ? `$${Number(p.venta_monto_sin_iva).toLocaleString("es-MX")} MXN`
                              : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {detail?.resumen?.ventas_count
                              ? `${detail.resumen.ventas_count} venta${detail.resumen.ventas_count === 1 ? "" : "s"} registradas`
                              : "Sin ventas registradas"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Última venta</div>
                          <div className="font-medium mt-1">
                            {p.venta_fecha ? fmtDate(p.venta_fecha) : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Rechazo</div>
                          <div className="font-medium mt-1">
                            {p.rechazo_motivo
                              ? `${p.rechazo_motivo} · ${fmtDate(p.rechazo_at)}`
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Seguimiento</div>
                          <div className="font-medium mt-1">
                            {p.seguimiento_pausado ? "Pausado" : "Activo / no pausado"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Resumen</div>
                          <div className="mt-1 text-sm">
                            {detail?.resumen?.citas_count ?? 0} citas ·{" "}
                            {detail?.resumen?.llamadas_count ?? 0} llamadas ·{" "}
                            {detail?.resumen?.recomendados_count ?? 0} recomendados
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Observaciones
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {p.observaciones?.trim() || "—"}
                      </div>
                    </CardContent>
                  </Card>

                  {p.venta_monto_sin_iva != null ? <ProspectDocumentsPanel prospectId={p.id} /> : null}

                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Recomendaciones
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Recomendado por</div>
                        {detail?.resumen?.recomendado_por ? (
                          <button
                            type="button"
                            onClick={() => openRelatedProspecto(detail.resumen.recomendado_por!)}
                            className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{detail.resumen.recomendado_por.nombre}</div>
                                <div className="text-xs text-muted-foreground">
                                  {detail.resumen.recomendado_por.numero} · Encuesta: {detail.resumen.recomendado_por.numero_encuesta ?? "—"}
                                </div>
                              </div>
                              <Badge variant="secondary" className="w-fit">
                                {detail.resumen.recomendado_por.estado_label ?? detail.resumen.recomendado_por.estado}
                              </Badge>
                            </div>
                          </button>
                        ) : (
                          <div className="text-sm text-muted-foreground">—</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          A quiénes recomendó ({detail?.recomendados?.length ?? 0})
                        </div>
                        {(detail?.recomendados ?? []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">No ha recomendado a nadie.</div>
                        ) : (
                          <div className="grid gap-2">
                            {detail!.recomendados.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => openRelatedProspecto(r)}
                                className="rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{r.nombre}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {r.numero} · Encuesta: {r.numero_encuesta ?? "—"}
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="w-fit">
                                    {r.estado_label ?? r.estado}
                                  </Badge>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm font-medium mb-3 flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          Citas
                        </div>

                        <div className="space-y-3">
                          {(detail?.citas ?? []).length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              Sin citas registradas.
                            </div>
                          ) : (
                            detail!.citas.map((cita) => (
                              <div key={cita.id} className="rounded-md border p-3">
                                <div className="font-medium">{fmtDate(cita.fecha_hora)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {cita.ubicacion || "Sin ubicación"}
                                </div>
                                {cita.ubicacion ? (
                                  <Button type="button" variant="outline" size="sm" className="mt-2" asChild>
                                    <a
                                      href={getAppointmentGoogleMapsUrl({
                                        ubicacion: cita.ubicacion,
                                        ubicacion_lat: cita.ubicacion_lat ?? null,
                                        ubicacion_lng: cita.ubicacion_lng ?? null,
                                      })}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Abrir en Google Maps
                                    </a>
                                  </Button>
                                ) : null}
<div className="text-xs mt-1">
  Estado: {cita.estado_label ?? cita.estado}
</div>
                                {cita.estado_detalle && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {cita.estado_detalle}
                                  </div>
                                )}
                                {cita.observaciones && (
                                  <div className="text-sm mt-2 whitespace-pre-wrap">
                                    {cita.observaciones}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          Llamadas
                        </div>

                        <div className="space-y-3">
                          {(detail?.llamadas ?? []).length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              Sin llamadas registradas.
                            </div>
                          ) : (
                            detail!.llamadas.map((llamada) => (
                              <div key={llamada.id} className="rounded-md border p-3">
                                <div className="font-medium">{fmtDate(llamada.fecha_hora)}</div>
                                <div className="text-xs mt-1">
  Estado: {llamada.estado_label ?? llamada.estado}
</div>
                                {llamada.estado_detalle && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {llamada.estado_detalle}
                                  </div>
                                )}
                                {llamada.observaciones && (
                                  <div className="text-sm mt-2 whitespace-pre-wrap">
                                    {llamada.observaciones}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Ventas
                      </div>

                      <div className="space-y-3">
                        {(detail?.ventas ?? []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">Sin ventas registradas.</div>
                        ) : (
                          detail!.ventas.map((venta, idx) => (
                            <div key={venta.id} className="rounded-md border p-3">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div className="font-medium">
                                  Venta #{(detail?.ventas?.length ?? 0) - idx} · {venta.tipo_venta_label ?? venta.tipo_venta}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {fmtDate(venta.created_at)}
                                </div>
                              </div>

                              <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
                                <div>
                                  <div className="text-xs text-muted-foreground">Con IVA</div>
                                  <div className="font-medium">
                                    ${Number(venta.monto_con_iva).toLocaleString("es-MX")} MXN
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs text-muted-foreground">IVA</div>
                                  <div className="font-medium">
                                    ${Number(venta.iva_monto).toLocaleString("es-MX")} MXN
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs text-muted-foreground">Sin IVA</div>
                                  <div className="font-medium">
                                    ${Number(venta.monto_sin_iva).toLocaleString("es-MX")} MXN
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
  <CardContent className="p-4">
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-medium flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Historial de observaciones
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

    <div className="space-y-3">
      {noteHistory.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sin observaciones.</div>
      ) : (
        noteHistory.map((h) => (
            <div key={h.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {getHistoryNoteAuthor(h)}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {getHistoryNoteSource(h)}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground">
                  {fmtDate(h.created_at)}
                </div>
              </div>

              <div className="text-sm mt-2 whitespace-pre-wrap break-words">
                {getHistoryNoteText(h)}
              </div>
            </div>
          ))
      )}
    </div>
  </CardContent>
</Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Historial
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setOldestHistoryFirst((v) => !v)}
                          className="h-8 w-fit text-xs"
                        >
                          {oldestHistoryFirst ? "Más nuevo arriba" : "Más viejo arriba"}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {history.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Sin historial.</div>
                        ) : (
                          history.map((h) => (
                            <div key={h.id} className="rounded-md border p-3">
                              <div className="font-medium">{h.accion_label ?? h.accion}</div>
                              <div className="text-xs text-muted-foreground">
                                {fmtDate(h.created_at)}
                              </div>

                              {h.detalle && <div className="text-sm mt-2">{h.detalle}</div>}

{(h.de_estado || h.a_estado) && (
  <div className="text-xs mt-2 text-muted-foreground">
    {(h.de_estado_label ?? h.de_estado ?? "—")} → {(h.a_estado_label ?? h.a_estado ?? "—")}
  </div>
)}

                              {h.effective?.email && (
                                <div className="text-xs mt-1 text-muted-foreground">
                                  Usuario: {h.effective.email}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

{p && showActions && (
  <ProspectoActionsDialog
    prospecto={p}
    open={openActions}
    onOpenChange={setOpenActions}
    onActionCompleted={(updated) => {
      setOpenActions(false)
      if (updated) {
        setActiveProspecto(updated)
        setDetail((prev) => prev ? { ...prev, prospecto: { ...prev.prospecto, ...updated } } : prev)
      }
      onActionCompleted?.(updated)
    }}
  />
)}
    </>
  )
}
