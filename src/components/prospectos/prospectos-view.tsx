"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreVertical, User, PhoneIcon, UsersIcon } from "lucide-react"
import { ProspectoDialog } from "./prospecto-dialog"
import { ProspectoActionsDialog } from "./prospecto-action-dialog"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8085/api"

type Prospecto = {
  id: number
  nombre: string
  numero: string
  observaciones?: string | null
  estado: string
  recomendado_por_id?: number | null
  recomendado_por_nombre?: string | null
}

type ProspectStats = {
  total: number
  pendientes: number
  sin_respuesta: number
}

function getActingAsUserIdSafe(): string | null {
  const v = typeof window !== "undefined" ? localStorage.getItem("pulso_acting_as_user_id") : null
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
}

export function ProspectosView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null)
  const [activeTab, setActiveTab] = useState<"pendientes" | "sinRespuesta">("pendientes")

  const [prospectosPendientes, setProspectosPendientes] = useState<Prospecto[]>([])
  const [prospectosSinRespuesta, setProspectosSinRespuesta] = useState<Prospecto[]>([])
  const [stats, setStats] = useState<ProspectStats | null>(null)

  const [loading, setLoading] = useState(false)

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("pulso_token") : null
    const actingAs = getActingAsUserIdSafe()

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
    }
  }

  const fetchProspects = async (opts: { estado?: string; q?: string } = {}) => {
    const params = new URLSearchParams()
    if (opts.estado) params.append("estado", opts.estado)
    if (opts.q && opts.q.trim()) params.append("q", opts.q.trim())

    const headers = getAuthHeaders()

    const res = await fetch(`${API_BASE_URL}/prospects/?${params.toString()}`, {
      method: "GET",
      headers,
    })

    const text = await res.text()

    let data: any = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      console.error("No se pudo parsear JSON:", e)
    }

    if (!res.ok) {
      console.error("Error cargando prospectos:", data)
      throw new Error(data.message ?? "Error al cargar prospectos")
    }

    return (data.prospectos ?? []) as Prospecto[]
  }

  const fetchStats = async () => {
    const headers = getAuthHeaders()

    const res = await fetch(`${API_BASE_URL}/prospects/stats`, {
      method: "GET",
      headers,
    })

    const text = await res.text()

    let data: any = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      console.error("No se pudo parsear JSON stats:", e)
    }

    if (!res.ok) {
      console.error("Error cargando stats:", data)
      throw new Error(data.message ?? "Error al cargar stats")
    }

    const payload = (data?.stats ?? data) as ProspectStats

    return {
      total: Number(payload.total ?? 0),
      pendientes: Number(payload.pendientes ?? 0),
      sin_respuesta: Number(payload.sin_respuesta ?? 0),
    } as ProspectStats
  }

  async function loadProspects() {
    try {
      setLoading(true)

      const [pend, sinResp, statsData] = await Promise.all([
        fetchProspects({ estado: "pendiente" }),
        fetchProspects({ estado: "sin_respuesta" }),
        fetchStats(),
      ])

      setProspectosPendientes(pend)
      setProspectosSinRespuesta(sinResp)
      setStats(statsData)
    } catch (err) {
      console.error(err)
      alert("No se pudieron cargar los prospectos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProspects()
  }, [])

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) {
      loadProspects()
      return
    }

    try {
      setLoading(true)

      if (activeTab === "pendientes") {
        const pend = await fetchProspects({ estado: "pendiente", q })
        setProspectosPendientes(pend)
      } else {
        const sinResp = await fetchProspects({ estado: "sin_respuesta", q })
        setProspectosSinRespuesta(sinResp)
      }
    } catch (err) {
      console.error(err)
      alert("Error al buscar prospectos")
    } finally {
      setLoading(false)
    }
  }

  const prospectos = activeTab === "pendientes" ? prospectosPendientes : prospectosSinRespuesta

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">Prospectos</h1>
          <p className="text-muted-foreground text-sm sm:text-lg">
            Gestiona y da seguimiento a tus prospectos
          </p>
        </div>

        {/* Stats cards responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Total */}
          <Card className="col-span-2 lg:col-span-1 border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <UsersIcon className="h-4 w-4" />
                    Total Prospectos
                  </p>
                  <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground leading-none">
                    {stats?.total ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pendientes */}
          <Card className="border-primary/30 bg-primary/5 backdrop-blur">
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Pendientes
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-primary leading-none">
                {stats?.pendientes ?? prospectosPendientes.length}
              </p>
            </CardContent>
          </Card>

          {/* Sin Respuesta */}
          <Card className="border-warning/30 bg-warning/5 backdrop-blur">
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PhoneIcon className="h-4 w-4" />
                Sin Respuesta
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-warning leading-none">
                {stats?.sin_respuesta ?? prospectosSinRespuesta.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search + buttons */}
        <Card className="mb-4 sm:mb-6 border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar prospecto por nombre o número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-background/50 border-border/50"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div className="grid grid-cols-2 sm:flex gap-2">
                <Button onClick={handleSearch} className="h-11 px-4 sm:px-6">
                  Buscar
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)} className="h-11 px-4 sm:px-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6">
          <Button
            variant={activeTab === "pendientes" ? "default" : "outline"}
            onClick={() => setActiveTab("pendientes")}
            className="h-10 px-4 sm:px-6 flex-1 sm:flex-none"
          >
            Pendientes
            <Badge variant="secondary" className="ml-2">
              {stats?.pendientes ?? prospectosPendientes.length}
            </Badge>
          </Button>

          <Button
            variant={activeTab === "sinRespuesta" ? "default" : "outline"}
            onClick={() => setActiveTab("sinRespuesta")}
            className="h-10 px-4 sm:px-6 flex-1 sm:flex-none"
          >
            Sin respuesta
            <Badge variant="secondary" className="ml-2">
              {stats?.sin_respuesta ?? prospectosSinRespuesta.length}
            </Badge>
          </Button>
        </div>

        {/* List */}
        <div className="grid gap-3 sm:gap-4">
          {loading ? (
            <Card className="border-border/50">
              <CardContent className="py-12 sm:py-16 text-center text-muted-foreground">
                Cargando prospectos...
              </CardContent>
            </Card>
          ) : prospectos.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 sm:py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-muted/30 flex items-center justify-center">
                    <UsersIcon className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-base sm:text-lg">
                    {activeTab === "pendientes"
                      ? "No hay prospectos pendientes."
                      : "No hay prospectos sin respuesta."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            prospectos.map((prospecto) => (
              <Card
                key={prospecto.id}
                className="
                  hover:border-primary/50 transition-all
                  border-border/50 bg-card/80 backdrop-blur
                "
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 truncate">
                            {prospecto.nombre}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">
                              <PhoneIcon className="h-3 w-3 mr-1" />
                              {prospecto.numero}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground pl-[52px]">
                        <UsersIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          Recomendado por:{" "}
                          <span className="text-foreground font-medium">
                            {prospecto.recomendado_por_nombre ?? "—"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedProspecto(prospecto)}
                      className="flex-shrink-0 opacity-100"
                      aria-label="Acciones"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ProspectoDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={(nuevoProspecto) => {
          setProspectosPendientes((prev) => [nuevoProspecto, ...prev])
          setIsAddDialogOpen(false)
          loadProspects()
        }}
      />

      {selectedProspecto && (
        <ProspectoActionsDialog
          prospecto={selectedProspecto}
          open={!!selectedProspecto}
          onOpenChange={(open) => !open && setSelectedProspecto(null)}
          onActionCompleted={() => {
            loadProspects()
          }}
        />
      )}
    </AppLayout>
  )
}