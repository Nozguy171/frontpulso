"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreVertical, User, PhoneIcon, UsersIcon, UserCheck, DollarSign } from "lucide-react"
import { ProspectoDialog } from "./prospecto-dialog"
import { ProspectoActionsDialog } from "./prospecto-action-dialog"
import { ProspectosGlobalSearch } from "./prospectos-global-search"
import { ProspectoDetailDialog } from "./prospecto-detail-dialog"
import { ProspectStatusBadge } from "./prospect-status-badge"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8085/api"

type Prospecto = {
  id: number
  nombre: string
  numero: string
  numero_encuesta?: string | null
  observaciones?: string | null
  estado: string
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

type ProspectStats = {
  total: number
  total_prospectos: number
  total_clientes: number
  total_general: number
  pendientes: number
  sin_respuesta: number
  ventas_mes_monto: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value)
}

function getActingAsUserIdSafe(): string | null {
  const v = typeof window !== "undefined" ? localStorage.getItem("pulso_acting_user_id") : null
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
const [detailProspecto, setDetailProspecto] = useState<Prospecto | null>(null)
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

  const payload = (data?.stats ?? data) as Partial<ProspectStats>

  return {
    total: Number(payload.total ?? 0),
    total_prospectos: Number(payload.total_prospectos ?? payload.total ?? 0),
    total_clientes: Number(payload.total_clientes ?? 0),
    total_general: Number(payload.total_general ?? 0),
    pendientes: Number(payload.pendientes ?? 0),
    sin_respuesta: Number(payload.sin_respuesta ?? 0),
    ventas_mes_monto: 0,
  } as ProspectStats
  }

  const fetchDashboardStats = async () => {
    const res = await fetch(`${API_BASE_URL}/stats/dashboard`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? "Error al cargar estadísticas")
    return { ventas_mes_monto: Number(data?.kpis?.ventas_mes_monto ?? 0) }
  }

  async function loadProspects() {
    try {
      setLoading(true)

      const [pend, sinResp, statsData, dashboardStats] = await Promise.all([
        fetchProspects({ estado: "pendiente" }),
        fetchProspects({ estado: "sin_respuesta" }),
        fetchStats(),
        fetchDashboardStats(),
      ])

      setProspectosPendientes(pend)
      setProspectosSinRespuesta(sinResp)
      setStats({ ...statsData, ...dashboardStats })
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
    <>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
<div className="mb-6 sm:mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
  <div>
    <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">Prospectos</h1>
    <p className="text-muted-foreground text-sm sm:text-lg">
      Gestiona y da seguimiento a tus prospectos
    </p>
  </div>

  <ProspectosGlobalSearch
    onActionCompleted={() => {
      loadProspects()
    }}
  />
</div>

        {/* Stats cards responsive */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
  {/* Total Prospectos */}
  <Card className="border-border/50 bg-card/50 backdrop-blur">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            Total Prospectos
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground leading-none">
            {stats?.total_prospectos ??
              ((stats?.pendientes ?? prospectosPendientes.length) +
                (stats?.sin_respuesta ?? prospectosSinRespuesta.length))}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Total Clientes */}
  <Link href="/seguimiento" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Card className="h-full cursor-pointer border-emerald-500/30 bg-emerald-500/5 backdrop-blur transition-colors hover:border-emerald-500/70 hover:bg-emerald-500/10">
      <CardContent className="p-4 sm:p-6">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Total Clientes
        </p>
        <p className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-600 leading-none">
          {stats?.total_clientes ?? 0}
        </p>
      </CardContent>
    </Card>
  </Link>

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

  {/* Ventas del Mes */}
  <Link href="/estadisticas" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Card className="h-full cursor-pointer border-primary/30 bg-primary/5 backdrop-blur transition-colors hover:border-primary/70 hover:bg-primary/10">
      <CardContent className="p-4 sm:p-6">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Ventas del mes
        </p>
        <p className="mt-2 text-xl sm:text-3xl font-bold text-primary leading-none break-words">
          {formatCurrency(stats?.ventas_mes_monto ?? 0)}
        </p>
      </CardContent>
    </Card>
  </Link>
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
<div
  className="flex-1 min-w-0 cursor-pointer"
  onClick={() => setDetailProspecto(prospecto)}
>    <div className="flex items-start gap-3 mb-3">
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
          <Badge variant="secondary" className="font-mono text-xs">
            Encuesta: {prospecto.numero_encuesta ?? "—"}
          </Badge>
          <ProspectStatusBadge prospect={prospecto} />
        </div>
      </div>
    </div>

    <div className="space-y-2 pl-[52px]">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UsersIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          Recomendado por:{" "}
          <span className="text-foreground font-medium">
            {prospecto.recomendado_por_nombre ?? "—"}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex-shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground">
          Forma de obtención
        </span>
        <span className="truncate text-foreground font-medium">
          {prospecto.forma_obtencion ?? "—"}
        </span>
      </div>
    </div>
  </div>

<Button
  variant="ghost"
  size="icon"
  onClick={(e) => {
    e.stopPropagation()
    setSelectedProspecto(prospecto)
  }}
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

<ProspectoDetailDialog
  prospecto={detailProspecto}
  open={!!detailProspecto}
  onOpenChange={(open) => !open && setDetailProspecto(null)}
  onActionCompleted={() => {
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
      setSelectedProspecto(null)
    }}
  />
)}
    </>
  )
}
