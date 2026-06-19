"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { HistoryIcon, Search, User } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_BASE_URL } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

type ProspectDTO = {
  id: number
  nombre: string
  numero: string
  numero_encuesta?: string | null
  forma_obtencion_tipo?: "encuesta" | "cita_en_frio" | "otro" | null
forma_obtencion?: string | null
  observaciones?: string | null
  estado: string
  created_at: string
}

type ProspectLite = {
  id: number
  nombre: string
  numero: string
  numero_encuesta?: string | null
  forma_obtencion_tipo?: "encuesta" | "cita_en_frio" | "otro" | null
forma_obtencion?: string | null
  estado: string
  observaciones?: string | null
}

type UserDTO = {
  id: number
  email: string
  role?: string
}

type ProspectHistResponse = {
  prospect: ProspectDTO
  historial: HistItem[]
}

type HistItem = {
  id: number
  accion: string
  de_estado?: string | null
  a_estado?: string | null
  detalle?: string | null
  created_at: string
  prospect?: { id: number; nombre: string } | null
  user?: { id: number; email: string } | null
  actor?: { id: number; email: string } | null
  effective?: { id: number; email: string } | null
  tipo?: string | null
  monto?: number | null
}

const tipoColors: Record<string, string> = {
  creacion: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cita: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  venta: "bg-green-500/10 text-green-500 border-green-500/20",
  rechazo: "bg-red-500/10 text-red-500 border-red-500/20",
  cambio: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  llamada: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
}

function mapTipo(accion: string) {
  if (accion === "crear_prospecto") return "creacion"
  if (accion === "agendar_cita") return "cita"
  if (accion === "programar_llamada") return "llamada"
  if (accion === "rechazado") return "rechazo"
  if (accion === "vendido") return "venta"
  if (accion === "sin_respuesta") return "cambio"
  return "cambio"
}

function prettyAccion(accion: string) {
  const m: Record<string, string> = {
    crear_prospecto: "Prospecto agregado",
    agendar_cita: "Cita agendada",
    programar_llamada: "Llamada programada",
    sin_respuesta: "Marcado sin respuesta",
    rechazado: "Marcado como rechazado",
    observaciones: "Se agregaron observaciones",
    vendido: "Marcado como vendido",
    anexar: "Prospecto anexado",
    recuperar: "Prospecto recuperado",
    iniciar_seguimiento: "Seguimiento iniciado",
    pausar_seguimiento: "Seguimiento pausado",
  }
  return m[accion] ?? accion
}

function getActingAsUserId(): string | null {
  if (typeof window === "undefined") return null
  const v = localStorage.getItem("pulso_acting_user_id")
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
}

async function apiGet(path: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("pulso_token") : null
  const actingAs = getActingAsUserId()

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
    },
    cache: "no-store",
  })

  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    throw new Error(data?.message || "Error en la petición")
  }

  return data
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: "America/Tijuana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function niceDetalle(item: HistItem) {
  if (!item.detalle) return null

  if (item.accion === "agendar_cita") {
    const m = item.detalle.match(/para\s(.+?)\s+en\s+(.+)$/i)
    if (m) return `📅 Cita: ${formatFecha(m[1])} • ${m[2]}`
    return `📅 ${item.detalle}`
  }

  if (item.accion === "programar_llamada") {
    const m = item.detalle.match(/para\s(.+)$/i)
    if (m) return `📞 Llamada: ${formatFecha(m[1])}`
    return `📞 ${item.detalle}`
  }

  if (item.accion === "vendido") {
    return `💰 ${item.detalle}`
  }

  return item.detalle
}

export function HistorialView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchProspecto, setSearchProspecto] = useState("")
  const [searchUsuario, setSearchUsuario] = useState("")

  const [historialGeneral, setHistorialGeneral] = useState<HistItem[]>([])
  const [loadingGeneral, setLoadingGeneral] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const [usuarios, setUsuarios] = useState<UserDTO[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)

  const [prospectos, setProspectos] = useState<ProspectLite[]>([])
  const [loadingProspects, setLoadingProspects] = useState(false)

  const [openUserId, setOpenUserId] = useState<number | null>(null)
  const [userHistorial, setUserHistorial] = useState<HistItem[]>([])
  const [loadingUserModal, setLoadingUserModal] = useState(false)
  const [errorUserModal, setErrorUserModal] = useState<string | null>(null)

  const [openProspectId, setOpenProspectId] = useState<number | null>(null)
  const [modalData, setModalData] = useState<ProspectHistResponse | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoadingGeneral(true)
    setErrorGeneral(null)

    const q = searchTerm.trim()
    const qs = q ? `?q=${encodeURIComponent(q)}&limit=50` : `?limit=50`

    apiGet(`/history/${qs}`)
      .then((data) => {
        if (cancelled) return
        setHistorialGeneral(data.historial || [])
      })
      .catch((e) => {
        if (cancelled) return
        setErrorGeneral(e.message || "Error cargando historial")
      })
      .finally(() => {
        if (!cancelled) setLoadingGeneral(false)
      })

    return () => {
      cancelled = true
    }
  }, [searchTerm])

  useEffect(() => {
    let cancelled = false
    setLoadingProspects(true)

    const q = searchProspecto.trim()
    const qs = q ? `?q=${encodeURIComponent(q)}&limit=2000` : `?limit=2000`

    apiGet(`/history/prospects${qs}`)
      .then((data) => {
        if (cancelled) return
        const arr = (data.prospectos || []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          numero: p.numero,
          numero_encuesta: p.numero_encuesta,
          forma_obtencion_tipo: p.forma_obtencion_tipo,
forma_obtencion: p.forma_obtencion,
          estado: p.estado,
          observaciones: p.observaciones,
        }))
        setProspectos(arr)
      })
      .catch(() => {
        if (cancelled) return
        setProspectos([])
      })
      .finally(() => {
        if (!cancelled) setLoadingProspects(false)
      })

    return () => {
      cancelled = true
    }
  }, [searchProspecto])

  useEffect(() => {
    let cancelled = false
    setLoadingUsuarios(true)

    apiGet(`/users/?limit=500`)
      .then((data) => {
        if (cancelled) return
        setUsuarios(data.users || [])
      })
      .catch(() => {
        if (cancelled) return
        setUsuarios([])
      })
      .finally(() => {
        if (!cancelled) setLoadingUsuarios(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!openUserId) {
      setUserHistorial([])
      setErrorUserModal(null)
      return
    }

    setLoadingUserModal(true)
    setErrorUserModal(null)

    apiGet(`/history/?user_id=${openUserId}&limit=300`)
      .then((data) => {
        if (cancelled) return
        setUserHistorial(data.historial || [])
      })
      .catch((e) => {
        if (cancelled) return
        setErrorUserModal(e.message || "Error cargando actividad")
      })
      .finally(() => {
        if (!cancelled) setLoadingUserModal(false)
      })

    return () => {
      cancelled = true
    }
  }, [openUserId])

  useEffect(() => {
    let cancelled = false
    if (!openProspectId) {
      setModalData(null)
      setErrorModal(null)
      return
    }

    setLoadingModal(true)
    setErrorModal(null)

    apiGet(`/history/prospects/${openProspectId}`)
      .then((data: ProspectHistResponse) => {
        if (cancelled) return
        setModalData(data)
      })
      .catch((e) => {
        if (cancelled) return
        setErrorModal(e.message || "Error cargando prospecto")
      })
      .finally(() => {
        if (!cancelled) setLoadingModal(false)
      })

    return () => {
      cancelled = true
    }
  }, [openProspectId])

  const historialFiltrado = useMemo(() => historialGeneral, [historialGeneral])

  const usuariosFiltrados = useMemo(() => {
    const q = searchUsuario.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((u) => u.email.toLowerCase().includes(q))
  }, [usuarios, searchUsuario])

  function openProspectModal(prospectId: number) {
    setOpenProspectId(prospectId)
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Historial</h1>
          <p className="text-muted-foreground">Registro completo de todos los movimientos del sistema</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Movimientos Recientes</TabsTrigger>
            <TabsTrigger value="prospecto">Por Prospecto</TabsTrigger>
            <TabsTrigger value="usuario">Por Usuario</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar en el historial..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>

            {errorGeneral && (
              <Card>
                <CardContent className="p-6 text-sm text-red-500">{errorGeneral}</CardContent>
              </Card>
            )}

            {loadingGeneral ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Cargando historial...</CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {historialFiltrado.map((item) => {
                  const tipo = item.tipo ?? mapTipo(item.accion)

                  return (
                    <button
                      key={item.id}
                      className="w-full text-left"
                      disabled={!item.prospect?.id}
                      onClick={() => item.prospect?.id && openProspectModal(item.prospect.id)}
                    >
                      <Card className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${tipoColors[tipo] || "bg-muted"}`}>
                              <HistoryIcon className="h-5 w-5" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">{prettyAccion(item.accion)}</h3>
                                {item.monto ? (
                                  <Badge variant="secondary" className="text-green-500">
                                    ${Number(item.monto).toLocaleString()} MXN
                                  </Badge>
                                ) : null}
                              </div>

                              <p className="text-sm text-muted-foreground mb-2">
                                Prospecto:{" "}
                                {item.prospect?.id ? (
                                  <span className="text-foreground underline underline-offset-4">
                                    {item.prospect.nombre}
                                  </span>
                                ) : (
                                  <span className="text-foreground">—</span>
                                )}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Usuario: {item.user?.email ?? "—"}</span>
                                <span>•</span>
                                <span>{formatFecha(item.created_at)}</span>
                              </div>

                              {niceDetalle(item) ? (
                                <p className="mt-2 text-xs text-muted-foreground">{niceDetalle(item)}</p>
                              ) : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  )
                })}

                {historialFiltrado.length === 0 && !loadingGeneral && !errorGeneral ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      No hay movimientos todavía.
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prospecto" className="space-y-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Por Prospecto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar prospecto por nombre o número…"
                    className="pl-10"
                    value={searchProspecto}
                    onChange={(e) => setSearchProspecto(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {loadingProspects ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Cargando prospectos…</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {prospectos.map((p) => (
                  <button key={p.id} onClick={() => openProspectModal(p.id)} className="text-left">
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold truncate">{p.nombre}</div>
                          <Badge variant="secondary" className="shrink-0">
                            {p.estado}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {p.numero} · Encuesta: {p.numero_encuesta ?? "—"}
                        </div>
                        {p.observaciones ? (
                          <div className="text-xs text-muted-foreground line-clamp-2">{p.observaciones}</div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Sin notas</div>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                ))}

                {prospectos.length === 0 && !loadingProspects ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">No hay prospectos.</CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="usuario" className="space-y-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Por Usuario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario por correo…"
                    className="pl-10"
                    value={searchUsuario}
                    onChange={(e) => setSearchUsuario(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {loadingUsuarios ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Cargando usuarios…</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {usuariosFiltrados.map((u) => (
                  <button key={u.id} onClick={() => setOpenUserId(u.id)} className="text-left">
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{u.email}</div>
                            <div className="text-xs text-muted-foreground">Ver actividad</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))}

                {usuariosFiltrados.length === 0 && !loadingUsuarios ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">No hay usuarios.</CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!openProspectId} onOpenChange={(v) => !v && setOpenProspectId(null)}>
        <DialogContent className="w-[95vw] max-w-3xl p-0">
          <div className="flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            <div className="p-4 sm:p-6 border-b">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Prospecto</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Detalle + movimientos
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(85vh-120px)] sm:h-[calc(80vh-140px)]">
                <div className="p-4 sm:p-6 space-y-4">
                  {loadingModal ? (
                    <div className="text-sm text-muted-foreground">Cargando...</div>
                  ) : errorModal ? (
                    <div className="text-sm text-red-500">{errorModal}</div>
                  ) : modalData ? (
                    <>
                      <Card>
                        <CardContent className="p-4 sm:p-6 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="font-semibold text-lg sm:text-xl">{modalData.prospect.nombre}</div>
                            <Badge variant="secondary" className="w-fit">
                              {modalData.prospect.estado}
                            </Badge>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {modalData.prospect.numero} · Encuesta: {modalData.prospect.numero_encuesta ?? "—"}
                          </div>
{modalData.prospect.forma_obtencion ? (
  <div className="text-sm text-muted-foreground">
    <span className="font-medium text-foreground">Forma de obtención:</span>{" "}
    {modalData.prospect.forma_obtencion}
  </div>
) : null}
                          {modalData.prospect.observaciones ? (
                            <div className="text-sm">
                              <div className="font-medium mb-1">Notas</div>
                              <div className="text-muted-foreground whitespace-pre-wrap">
                                {modalData.prospect.observaciones}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">Sin notas</div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base">Movimientos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="p-4 sm:p-6 space-y-3">
                            {modalData.historial.map((h) => (
                              <div key={h.id} className="flex items-start gap-3">
                                <div className={`mt-0.5 p-2 rounded-lg ${tipoColors[mapTipo(h.accion)] || "bg-muted"}`}>
                                  <HistoryIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{prettyAccion(h.accion)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {h.user?.email ?? "—"} • {formatFecha(h.created_at)}
                                  </div>
                                  {niceDetalle(h) ? (
                                    <div className="text-xs text-muted-foreground mt-1">{niceDetalle(h)}</div>
                                  ) : null}
                                </div>
                              </div>
                            ))}

                            {modalData.historial.length === 0 ? (
                              <div className="text-sm text-muted-foreground">Sin movimientos.</div>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openUserId} onOpenChange={(v) => !v && setOpenUserId(null)}>
        <DialogContent className="w-[95vw] max-w-3xl p-0">
          <div className="flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            <div className="p-4 sm:p-6 border-b">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Actividad del usuario</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Movimientos realizados
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(85vh-120px)] sm:h-[calc(80vh-140px)]">
                <div className="p-4 sm:p-6 space-y-3">
                  {loadingUserModal ? (
                    <div className="text-sm text-muted-foreground">Cargando...</div>
                  ) : errorUserModal ? (
                    <div className="text-sm text-red-500">{errorUserModal}</div>
                  ) : (
                    <>
                      {userHistorial.map((item) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={item.prospect?.id ? 0 : -1}
                          aria-disabled={!item.prospect?.id}
                          className={`w-full text-left ${
                            item.prospect?.id ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                          }`}
                          onClick={() => item.prospect?.id && openProspectModal(item.prospect.id)}
                          onKeyDown={(e) => {
                            if (!item.prospect?.id) return
                            if (e.key === "Enter" || e.key === " ") openProspectModal(item.prospect.id)
                          }}
                        >
                          <Card className="hover:border-primary/50 transition-colors">
                            <CardContent className="p-4 sm:p-6">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${tipoColors[mapTipo(item.accion)] || "bg-muted"}`}>
                                  <HistoryIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold">{prettyAccion(item.accion)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Prospecto: {item.prospect?.nombre ?? "—"} • {formatFecha(item.created_at)}
                                  </div>
                                  {niceDetalle(item) ? (
                                    <div className="text-xs text-muted-foreground mt-1">{niceDetalle(item)}</div>
                                  ) : null}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}

                      {userHistorial.length === 0 ? (
                        <Card>
                          <CardContent className="p-6 text-sm text-muted-foreground">
                            Sin actividad.
                          </CardContent>
                        </Card>
                      ) : null}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
