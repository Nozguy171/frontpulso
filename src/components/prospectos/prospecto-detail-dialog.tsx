"use client"

import * as React from "react"
import { useEffect, useState } from "react"
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
  Phone,
  Users,
  CalendarDays,
  Clock3,
  FileText,
  MoreVertical,
} from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import { ProspectoActionsDialog } from "./prospecto-action-dialog"

type ProspectoBase = {
  id: number
  nombre: string
  numero: string
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
  created_at?: string
}

type DetailResponse = {
  prospecto: ProspectoBase
  resumen: {
    recomendado_por?: ProspectoBase | null
    recomendados_count: number
    citas_count: number
    llamadas_count: number
  }
  recomendados: ProspectoBase[]
  citas: Array<{
    id: number
    fecha_hora: string | null
    ubicacion: string | null
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
  onActionCompleted?: () => void
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

export function ProspectoDetailDialog({
  prospecto,
  open,
  onOpenChange,
  onActionCompleted,
}: ProspectoDetailDialogProps) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [openActions, setOpenActions] = useState(false)

  useEffect(() => {
    if (!open || !prospecto?.id) return

    let alive = true

    ;(async () => {
      try {
        setLoading(true)
        setDetail(null)

        const token = localStorage.getItem("pulso_token")
        const actingAs = getActingAsUserId()

        const res = await fetch(`${API_BASE_URL}/prospects/${prospecto.id}/detalle`, {
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
  }, [open, prospecto?.id])

  const p = detail?.prospecto ?? prospecto

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-[820px] p-0 overflow-hidden">
          <div className="border-b bg-background/95 backdrop-blur">
<div className="p-4 pr-16 sm:p-6 sm:pr-20 flex items-start justify-between gap-3">
                  <DialogHeader className="min-w-0">
                <DialogTitle className="text-lg sm:text-2xl truncate">
                  {p?.nombre ?? "Prospecto"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Información completa del prospecto
                </DialogDescription>
              </DialogHeader>

              {p && (
<Button
  type="button"
  variant="outline"
  onClick={() => setOpenActions(true)}
  className="shrink-0 mr-2 sm:mr-3"
>
  <MoreVertical className="h-4 w-4 mr-2" />
  Acciones
</Button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[80vh]">
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
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">Número</div>
                          <div className="font-medium flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4" />
                            {p.numero}
                          </div>
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
                          <div className="text-xs text-muted-foreground">Venta</div>
                          <div className="font-medium mt-1">
                            {p.venta_monto_sin_iva != null
                              ? `$${p.venta_monto_sin_iva} · ${fmtDate(p.venta_fecha)}`
                              : "—"}
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
                        <Users className="h-4 w-4" />
                        Historial
                      </div>

                      <div className="space-y-3">
                        {(detail?.historial ?? []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">Sin historial.</div>
                        ) : (
                          detail!.historial.map((h) => (
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

      {p && (
        <ProspectoActionsDialog
          prospecto={p}
          open={openActions}
          onOpenChange={setOpenActions}
          onActionCompleted={() => {
            setOpenActions(false)
            onOpenChange(false)
            onActionCompleted?.()
          }}
        />
      )}
    </>
  )
}