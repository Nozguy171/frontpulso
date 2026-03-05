"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MoreVertical, Phone, StickyNote, X } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { API_BASE_URL } from "@/lib/api"

const AppLayout = dynamic(() => import("@/components/layout/app-layout").then((m) => m.AppLayout), { ssr: false })

type ProspectDTO = {
  id: number
  nombre: string
  numero: string
  observaciones?: string | null
  estado: string
  created_at?: string

  // ✅ NUEVO (del backend)
  rechazo_motivo?: string | null
  rechazo_at?: string | null
  rechazo_count?: number
}

// ✅ acting-as-user header (si existe)
function getAuthAndActingHeaders() {
  const token = localStorage.getItem("pulso_token")

  // IMPORTANTE: usa el mismo key que tu app ya guarda
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
  if (!res.ok) throw new Error(await res.text())
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
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function formatFechaCorta(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX")
}

function RechazadoActionsMenu({ onAction }: { onAction?: (action: string) => void }) {
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
              onAction?.("recuperar")
            }}
          >
            Recuperar prospecto
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("programar_llamada")
            }}
          >
            Agendar llamada
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function RechazadosView() {
  const [items, setItems] = useState<ProspectDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const [openId, setOpenId] = useState<number | null>(null)

  // modal agendar llamada
  const [openAgendar, setOpenAgendar] = useState(false)
  const [agendarId, setAgendarId] = useState<number | null>(null)
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const [obs, setObs] = useState("")
  const [saving, setSaving] = useState(false)

  const selected = useMemo(() => items.find((p) => p.id === openId) ?? null, [items, openId])
  const selectedAgendar = useMemo(() => items.find((p) => p.id === agendarId) ?? null, [items, agendarId])

  const fetchList = () => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const q = search.trim()
    const qs = new URLSearchParams()
    qs.set("estado", "rechazado")
    if (q) qs.set("q", q)

    apiGet(`/prospects/?${qs.toString()}`)
      .then((data) => {
        if (cancelled) return
        setItems((data.prospectos || []) as ProspectDTO[])
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message || "Error cargando rechazados")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }

  useEffect(() => {
    const cleanup = fetchList()
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // debounce mini para búsqueda
  useEffect(() => {
    const t = setTimeout(() => fetchList(), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleAction = async (action: string, prospectId: number) => {
    if (action === "recuperar") {
      try {
        await apiPost(`/prospects/${prospectId}/acciones`, { accion: "recuperar" })
        setItems((prev) => prev.filter((p) => p.id !== prospectId))
      } catch (e: any) {
        alert(e?.message || "No se pudo recuperar")
      }
      return
    }

    if (action === "programar_llamada") {
      setAgendarId(prospectId)
      setFecha("")
      setHora("")
      setObs("")
      setOpenAgendar(true)
      return
    }
  }

  const submitAgendar = async () => {
    if (!agendarId) return
    if (!fecha || !hora) {
      alert("Fecha y hora son obligatorias")
      return
    }
    setSaving(true)
    try {
      await apiPost(`/prospects/${agendarId}/acciones`, {
        accion: "programar_llamada",
        fecha,
        hora,
        observaciones: obs || null,
      })
      // si tu backend pone estado con_llamada, ya no debe estar en rechazados
      setItems((prev) => prev.filter((p) => p.id !== agendarId))
      setOpenAgendar(false)
      setAgendarId(null)
    } catch (e: any) {
      alert(e?.message || "No se pudo agendar")
    } finally {
      setSaving(false)
    }
  }

  const ordenados = useMemo(() => {
    // ✅ mejor orden: por rechazo_at si existe, si no por created_at
    return [...items].sort((a, b) => {
      const ta = +new Date(a.rechazo_at || a.created_at || 0)
      const tb = +new Date(b.rechazo_at || b.created_at || 0)
      return tb - ta
    })
  }, [items])

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Rechazados</h1>
          <p className="text-muted-foreground">Prospectos que dijeron NO en cualquier fase</p>
        </div>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Lista</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">{loading ? "Cargando..." : `${ordenados.length} rechazados`}</div>
              <div className="w-full sm:w-[360px]">
                <Input placeholder="Buscar por nombre o número…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            {error ? <div className="text-sm text-red-500">{error}</div> : null}
          </CardContent>
        </Card>

        <div className="mt-4 grid gap-3 sm:gap-4">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Cargando rechazados…</CardContent>
            </Card>
          ) : ordenados.length > 0 ? (
            ordenados.map((p) => (
              <Card
                key={p.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setOpenId(p.id)
                }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{p.nombre}</h3>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="secondary" className="truncate">
                              {p.numero}
                            </Badge>

                            <Badge variant="outline" className="text-xs">
                              {p.estado}
                            </Badge>

                            {/* ✅ fecha del rechazo (si existe), si no created_at */}
                            <Badge variant="outline" className="text-xs">
                              {formatFechaCorta(p.rechazo_at || p.created_at)}
                            </Badge>

                            {/* ✅ cuántas veces lo rechazaron */}
                            {typeof p.rechazo_count === "number" && p.rechazo_count > 1 ? (
                              <Badge variant="outline" className="text-xs">
                                {p.rechazo_count} rechazos
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <RechazadoActionsMenu onAction={(a) => handleAction(a, p.id)} />
                      </div>

                      {/* ✅ motivo de rechazo */}
                      {p.rechazo_motivo ? (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <StickyNote className="h-4 w-4 mt-0.5" />
                          <span className="line-clamp-2">{p.rechazo_motivo}</span>
                        </div>
                      ) : null}

                      {/* opcional: observaciones generales del prospecto */}
                      {p.observaciones ? (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Obs:</span> <span className="line-clamp-1">{p.observaciones}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground italic">No hay prospectos rechazados.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* MODAL DETALLE */}
      <Dialog open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="p-0 overflow-hidden w-[96vw] max-w-2xl h-[88vh] sm:h-auto sm:rounded-xl">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
            <div className="flex items-center justify-between gap-2 p-4 sm:p-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg sm:text-xl">Detalle del prospecto</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">Información del prospecto rechazado</DialogDescription>
              </DialogHeader>

              <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={() => setOpenId(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[calc(88vh-72px)] sm:h-auto">
            <div className="p-4 sm:p-6 space-y-4">
              {!selected ? (
                <div className="text-sm text-muted-foreground">Cargando…</div>
              ) : (
                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Prospecto</div>
                      <div className="font-semibold text-lg truncate">{selected.nombre}</div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className="truncate">
                          {selected.numero}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {selected.estado}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Rechazo: {formatFechaCorta(selected.rechazo_at || selected.created_at)}
                        </Badge>
                        {typeof selected.rechazo_count === "number" && selected.rechazo_count > 1 ? (
                          <Badge variant="outline" className="text-xs">
                            {selected.rechazo_count} rechazos
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {/* ✅ motivo */}
                    {selected.rechazo_motivo ? (
                      <div className="flex items-start gap-2 text-sm sm:col-span-2">
                        <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-muted-foreground text-xs">Motivo de rechazo</div>
                          <div className="whitespace-pre-wrap break-words">{selected.rechazo_motivo}</div>
                        </div>
                      </div>
                    ) : null}

                    {/* observaciones generales */}
                    {selected.observaciones ? (
                      <div className="flex items-start gap-2 text-sm sm:col-span-2">
                        <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-muted-foreground text-xs">Observaciones</div>
                          <div className="whitespace-pre-wrap break-words">{selected.observaciones}</div>
                        </div>
                      </div>
                    ) : null}

                    <div className="pt-3 flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setOpenId(null)
                          handleAction("programar_llamada", selected.id)
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Agendar llamada
                      </Button>

                      <Button
                        variant="default"
                        onClick={() => {
                          setOpenId(null)
                          handleAction("recuperar", selected.id)
                        }}
                      >
                        Recuperar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* MODAL AGENDAR LLAMADA */}
      <Dialog
        open={openAgendar}
        onOpenChange={(v) => {
          setOpenAgendar(v)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar llamada</DialogTitle>
            <DialogDescription>
              {selectedAgendar ? `${selectedAgendar.nombre} • ${selectedAgendar.numero}` : "Selecciona fecha y hora"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Fecha</div>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Hora</div>
                <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Observaciones (opcional)</div>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej: Confirmar horario / recordatorio..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpenAgendar(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={submitAgendar} disabled={saving}>
                {saving ? "Guardando..." : "Agendar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}