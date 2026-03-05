"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE_URL } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

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

type SeguimientoItem = {
  id: number
  nombre: string
  numero: string
  estado: string
  venta_monto_sin_iva: number | null
  venta_fecha: string | null
  observaciones: string | null
  proxima_llamada: string | null
}

type HistItem = {
  id: number
  accion: string
  created_at: string
  detalle: string | null
  user: { id: number; email: string }
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

function normalizeObsDetalle(detalle: string | null) {
  if (!detalle) return ""
  const prefix1 = "Observaciones añadidas:"
  const prefix2 = "Observaciones añadidas: "
  if (detalle.startsWith(prefix2)) return detalle.slice(prefix2.length).trim()
  if (detalle.startsWith(prefix1)) return detalle.slice(prefix1.length).trim()
  return detalle.trim()
}

export function SeguimientoView() {
  const [items, setItems] = useState<SeguimientoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // detalle
  const [openProspectId, setOpenProspectId] = useState<number | null>(null)
  const selected = useMemo(() => items.find((x) => x.id === openProspectId) ?? null, [items, openProspectId])

  // mini-historial SOLO observaciones
  const [obsHist, setObsHist] = useState<HistItem[]>([])
  const [obsLoading, setObsLoading] = useState(false)
  const [obsError, setObsError] = useState<string | null>(null)

  // modales de acciones
  const [modal, setModal] = useState<null | { type: "llamada" | "observacion"; prospect: SeguimientoItem }>(null)
  const [saving, setSaving] = useState(false)

  // forms
  const [formFecha, setFormFecha] = useState("")
  const [formHora, setFormHora] = useState("")
  const [formObs, setFormObs] = useState("")

  const resetForms = () => {
    setFormFecha("")
    setFormHora("")
    setFormObs("")
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
      const onlyObs = historial.filter((h) => h.accion === "observaciones")
      setObsHist(onlyObs)
    } catch (e: any) {
      setObsError(e?.message || "Error cargando observaciones")
      setObsHist([])
    } finally {
      setObsLoading(false)
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
    } else {
      setObsHist([])
      setObsError(null)
      setObsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProspectId])

  const iniciarSeguimiento = async (p: SeguimientoItem) => {
    if (p.proxima_llamada) return
    setSaving(true)
    try {
      await apiPost(`/prospects/${p.id}/acciones`, { accion: "iniciar_seguimiento" })
      await fetchSeguimiento()
    } catch (e: any) {
      alert(e?.message || "No se pudo iniciar seguimiento")
    } finally {
      setSaving(false)
    }
  }

  const openProgramarLlamada = (p: SeguimientoItem) => {
    // ✅ bloquear si ya hay seguimiento activo (proxima_llamada)
    if (p.proxima_llamada) return
    resetForms()
    setModal({ type: "llamada", prospect: p })
  }

  const openObservacion = (p: SeguimientoItem) => {
    resetForms()
    setModal({ type: "observacion", prospect: p })
  }

  const mandarARechazados = async (p: SeguimientoItem) => {
    const motivo = (prompt("Motivo (opcional):") || "").trim()
    setSaving(true)
    try {
      await apiPost(`/prospects/${p.id}/acciones`, { accion: "rechazado", motivo })
      await fetchSeguimiento()
      if (openProspectId === p.id) setOpenProspectId(null)
    } catch (e: any) {
      alert(e?.message || "No se pudo mandar a rechazados")
    } finally {
      setSaving(false)
    }
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

      setModal(null)
      await fetchSeguimiento()
      if (openProspectId === p.id) await fetchObsHistory(p.id)
    } catch (e: any) {
      alert(e?.message || "No se pudo completar la acción")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Seguimiento</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Clientes con ventas realizadas</p>
        </div>

        <Card className="mb-3 sm:mb-4">
          <CardHeader className="py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Clientes en seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs sm:text-sm text-muted-foreground">{loading ? "Cargando..." : `${items.length} clientes`}</div>
              <div className="w-full sm:w-[360px]">
                <Input
                  placeholder="Buscar por nombre o número…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10"
                />
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
          <div className="grid gap-3 sm:gap-4">
            {items.map((p) => {
              const seguimientoYaIniciado = !!p.proxima_llamada

              return (
                <Card
                  key={p.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
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
                            <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{p.nombre}</h3>

                            {/* ✅ solo 2 badges: numero + (activo | sin recordatorios) */}
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="max-w-[220px] truncate">
                                {p.numero}
                              </Badge>

                              {seguimientoYaIniciado ? (
                                <Badge variant="secondary" className="text-[11px] sm:text-xs">
                                  Seguimiento activo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[11px] sm:text-xs">
                                  Sin recordatorios
                                </Badge>
                              )}
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
                                  disabled={seguimientoYaIniciado || saving}
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    iniciarSeguimiento(p)
                                  }}
                                >
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  {seguimientoYaIniciado ? "Seguimiento ya iniciado" : "Iniciar seguimiento (mensual)"}
                                </DropdownMenuItem>

                                {/* ✅ BLOQUEAR PROGRAMAR LLAMADA si ya está activo */}
                                <DropdownMenuItem
                                  disabled={seguimientoYaIniciado || saving}
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    if (seguimientoYaIniciado) return
                                    openProgramarLlamada(p)
                                  }}
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  {seguimientoYaIniciado ? "Llamada ya programada" : "Programar llamada"}
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

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  className="text-red-600"
                                  disabled={saving}
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    mandarARechazados(p)
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Mandar a rechazados
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

              <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={() => setOpenProspectId(null)}>
                <X className="h-5 w-5" />
              </Button>
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
                          <div className="font-semibold text-2xl truncate">{selected.nombre}</div>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="max-w-[320px] truncate">
                              {selected.numero}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {selected.estado}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex items-start gap-3 text-sm rounded-xl border p-4">
                            <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="text-muted-foreground text-xs">Venta (sin IVA)</div>
                              <div className="font-medium truncate">
                                {selected.venta_monto_sin_iva != null
                                  ? `$${Number(selected.venta_monto_sin_iva).toLocaleString()} MXN`
                                  : "—"}
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
                          <StickyNote className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm font-semibold">Observaciones</div>
                        </div>

                        <div className="mt-4">
                          {obsLoading ? (
                            <div className="text-sm text-muted-foreground">Cargando observaciones…</div>
                          ) : obsError ? (
                            <div className="text-sm text-red-500">{obsError}</div>
                          ) : obsHist.length > 0 ? (
                            <div className="space-y-3">
                              {obsHist.map((h) => (
                                <div key={h.id} className="rounded-xl border p-4">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                                      <UserIcon className="h-4 w-4 shrink-0" />
                                      <span className="font-medium text-foreground truncate">{h.user?.email ?? "—"}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="h-4 w-4 shrink-0" />
                                      <span>{formatFechaHoraBonita(h.created_at)}</span>
                                    </div>
                                  </div>

                                  <div className="mt-3 whitespace-pre-wrap break-words text-sm">
                                    {normalizeObsDetalle(h.detalle) || "—"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : selected.observaciones ? (
                            <div className="whitespace-pre-wrap break-words text-sm">{selected.observaciones}</div>
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
                        onClick={() => openProgramarLlamada(selected)}
                        disabled={saving || !!selected.proxima_llamada}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {selected.proxima_llamada ? "Llamada ya programada" : "Programar llamada"}
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
          className="p-0 overflow-hidden w-[min(620px,96vw)] h-[70vh] max-h-[70vh] rounded-xl flex flex-col"
        >
          <div className="shrink-0 border-b p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {modal?.type === "llamada" ? "Programar llamada" : "Agregar observación"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {modal?.prospect?.nombre ?? "—"} • {modal?.prospect?.numero ?? "—"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-5 sm:p-6 grid gap-4">
                {modal?.type === "llamada" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Fecha</div>
                        <Input
                          type="date"
                          value={formFecha}
                          onChange={(e) => setFormFecha(e.target.value)}
                          className="dark:[color-scheme:dark] h-10"
                        />
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Hora</div>
                        <Input
                          type="time"
                          value={formHora}
                          onChange={(e) => setFormHora(e.target.value)}
                          className="dark:[color-scheme:dark] h-10"
                        />
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

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setModal(null)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button onClick={submitModal} disabled={saving}>
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* ayuda extra para scroll de ScrollArea */}
      <style jsx global>{`
        [data-radix-scroll-area-viewport] {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </AppLayout>
  )
}