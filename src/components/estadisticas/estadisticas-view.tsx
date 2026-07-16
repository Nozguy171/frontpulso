"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api"
import { ProspectoDetailDialog } from "@/components/prospectos/prospecto-detail-dialog"
import { ProspectTreatmentBadge } from "@/components/prospectos/prospect-treatment-badge"
import { BarChart3, TrendingUp, Users, Target, DollarSign, Award, Calendar, Phone } from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts"

interface DashboardStatsResponse {
  kpis: {
    ventas_mes_count: number
    ventas_mes_monto: number
    ventas_mes_delta_pct: number
    total_prospectos: number
    prospectos_con_cita: number
    prospectos_vendidos_con_cita: number
    tasa_citas_pct: number
    tasa_conversion_pct: number
    llamadas_realizadas: number
    llamadas_promedio_dia: number
  }
  ventas_chart: {
    granularity: "month" | "year"
    year: number
    available_years: number[]
    data: {
      periodo: string
      ventas: number
      monto: number
    }[]
  }
  distribucion_prospectos: {
    estado: string
    cantidad: number
    color: string
    estado_key: string
  }[]
  actividad_semanal: {
    day: string
    dia: string
    llamadas: number
    citas: number
  }[]
  colaboradores: {
    user_id: number
    nombre: string
    email: string
    prospectos: number
    prospectos_con_cita: number
    vendidos: number
    tasa_citas: number
    tasa_conversion: number
  }[]
  top_performer: {
    user_id: number
    nombre: string
    email: string
    prospectos: number
    prospectos_con_cita: number
    vendidos: number
    tasa_citas: number
    tasa_conversion: number
  } | null
  collab_mode: "always" | "month"
  collab_year: number
  collab_month: number | null
}

interface StatsDetailItem {
  id: number
  tipo: string
  titulo: string
  fecha?: string | null
  detalle?: string | null
  estado?: string | null
  estado_label?: string | null
  conclusion?: string | null
  prospect_id?: number | null
  trato_prospecto?: "enojado" | "feliz" | "neutral" | null
}

interface StatsDetailResponse {
  title: string
  items: StatsDetailItem[]
}

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
]

const chartText = "var(--muted-foreground)"
const chartGrid = "var(--border)"

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
    throw new Error(data?.message || "No se pudieron cargar las estadísticas")
  }

  return data
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatCompactCurrency(value: number) {
  const n = Number(value || 0)

  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return `${v.toFixed(v >= 10 ? 0 : 1).replace(".0", "")}M`
  }

  if (n >= 1_000) {
    const v = n / 1_000
    return `${v.toFixed(v >= 10 ? 0 : 1).replace(".0", "")}k`
  }

  return formatNumber(n)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX").format(value || 0)
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2).replace(".00", "")}%`
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin fecha"

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function SalesTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="min-w-[190px] rounded-xl border bg-card p-3 text-card-foreground shadow-md">
      <p className="mb-2 text-sm font-semibold">{label}</p>

      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">
          Monto: <span className="font-medium text-foreground">{formatCurrency(Number(row.monto || 0))}</span>
        </p>
        <p className="text-muted-foreground">
          Ventas: <span className="font-medium text-foreground">{formatNumber(Number(row.ventas || 0))}</span>
        </p>
      </div>
    </div>
  )
}

function CollaboratorTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm min-w-[220px]">
      <p className="font-medium text-sm mb-2">{label}</p>
      <div className="space-y-1 text-sm">
        <p>Prospectos: {formatNumber(row.prospectos)}</p>
        <p>Prospectos con cita: {formatNumber(row.prospectos_con_cita)}</p>
        <p>Vendidos: {formatNumber(row.vendidos)}</p>
        <p>% Citas: {formatPercent(row.tasa_citas)}</p>
        <p>% Conversión: {formatPercent(row.tasa_conversion)}</p>
      </div>
    </div>
  )
}

export function EstadisticasView() {
  const currentYear = new Date().getFullYear()

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [salesGranularity, setSalesGranularity] = useState<"month" | "year">("month")
  const [salesYear, setSalesYear] = useState(currentYear)

  const [collabMode, setCollabMode] = useState<"always" | "month">("always")
  const [collabYear, setCollabYear] = useState(currentYear)
  const [collabMonth, setCollabMonth] = useState(new Date().getMonth() + 1)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTitle, setDetailTitle] = useState("Detalle")
  const [detailItems, setDetailItems] = useState<StatsDetailItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<{
    id: number
    nombre: string
    numero: string
    estado: string
  } | null>(null)

  const availableYears = useMemo(() => {
    const years = stats?.ventas_chart?.available_years ?? []
    const merged = Array.from(new Set([currentYear, salesYear, collabYear, ...years]))
    return merged.sort((a, b) => a - b)
  }, [stats?.ventas_chart?.available_years, currentYear, salesYear, collabYear])

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          sales_year: String(salesYear),
          sales_granularity: salesGranularity,
          collab_mode: collabMode,
          collab_year: String(collabYear),
          collab_month: String(collabMonth),
        })

        const data = await apiGet(`/stats/dashboard?${params.toString()}`)

        if (!cancelled) {
          setStats(data)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Error al cargar estadísticas")
          setStats(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      cancelled = true
    }
  }, [salesYear, salesGranularity, collabMode, collabYear, collabMonth])

  const ventasData = stats?.ventas_chart?.data ?? []
  const distribucionData = stats?.distribucion_prospectos ?? []
  const colaboradoresData = stats?.colaboradores ?? []
  const actividadData = stats?.actividad_semanal ?? []
  const topPerformer = stats?.top_performer

  async function openDetails(params: Record<string, string | number>) {
    try {
      setDetailOpen(true)
      setDetailLoading(true)
      setDetailError(null)
      setDetailItems([])

      const query = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      )
      const data = (await apiGet(`/stats/details?${query.toString()}`)) as StatsDetailResponse

      setDetailTitle(data.title || "Detalle")
      setDetailItems(data.items ?? [])
    } catch (err: any) {
      setDetailError(err?.message || "No se pudo cargar el detalle")
    } finally {
      setDetailLoading(false)
    }
  }

  function openCollaboratorDetails(userId: number, metric: "prospectos" | "citas" | "vendidos") {
    openDetails({
      kind: "collaborator",
      user_id: userId,
      metric,
      collab_mode: collabMode,
      collab_year: collabYear,
      collab_month: collabMonth,
    })
  }

  function openProspectDetails(item: StatsDetailItem) {
    if (!item.prospect_id) return
    setDetailOpen(false)
    setSelectedProspect({ id: item.prospect_id, nombre: item.titulo, numero: "", estado: "" })
  }

  return (
    <>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Estadísticas y Métricas</h1>
            <p className="text-muted-foreground">Dashboard completo de rendimiento del equipo y métricas reales</p>
          </div>

          <div className="text-sm text-muted-foreground">
            {loading ? "Cargando estadísticas..." : error ? "Error al cargar" : "Datos actualizados"}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card
            className="cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-transparent transition hover:border-primary/50"
            onClick={() => openDetails({ kind: "sales_month" })}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ventas del Mes</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats ? formatCurrency(stats.kpis.ventas_mes_monto) : "--"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats ? (
                  <>
                    <span
                      className={`font-medium ${
                        stats.kpis.ventas_mes_delta_pct >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {stats.kpis.ventas_mes_delta_pct >= 0 ? "+" : ""}
                      {stats.kpis.ventas_mes_delta_pct}%
                    </span>{" "}
                    vs mes anterior
                  </>
                ) : (
                  "Sin datos"
                )}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent transition hover:border-cyan-500/50"
            onClick={() => openDetails({ kind: "sold_with_appointment" })}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversión</CardTitle>
              <Target className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats ? formatPercent(stats.kpis.tasa_conversion_pct) : "--"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats
                  ? `${formatNumber(stats.kpis.prospectos_vendidos_con_cita)} de ${formatNumber(
                      stats.kpis.prospectos_con_cita,
                    )} prospectos con cita se convirtieron`
                  : "Sin datos"}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent transition hover:border-purple-500/50"
            onClick={() => openDetails({ kind: "with_appointment" })}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Citas Agendadas</CardTitle>
              <Calendar className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats ? formatPercent(stats.kpis.tasa_citas_pct) : "--"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats
                  ? `${formatNumber(stats.kpis.prospectos_con_cita)} de ${formatNumber(
                      stats.kpis.total_prospectos,
                    )} prospectos llegaron a cita`
                  : "Sin datos"}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent transition hover:border-orange-500/50"
            onClick={() => openDetails({ kind: "calls_done" })}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-orange-500" />
                Llamadas Realizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats ? formatNumber(stats.kpis.llamadas_realizadas) : "--"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats ? `Promedio: ${stats.kpis.llamadas_promedio_dia} por día` : "Sin datos"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="gap-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Evolución de Ventas
                </CardTitle>

                <div className="flex gap-2 flex-wrap">
                  <select
                    value={salesGranularity}
                    onChange={(e) => setSalesGranularity(e.target.value as "month" | "year")}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="month">Por meses</option>
                    <option value="year">Por años</option>
                  </select>

                  {salesGranularity === "month" && (
                    <select
                      value={salesYear}
                      onChange={(e) => setSalesYear(Number(e.target.value))}
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
<ResponsiveContainer width="100%" height={320}>
  <LineChart
    data={ventasData}
    margin={{ top: 12, right: 18, left: 6, bottom: 8 }}
    onClick={(chart: any) => {
      const period = chart?.activeLabel
      if (!period) return
      openDetails({
        kind: "sales_period",
        granularity: salesGranularity,
        period: String(period),
        year: salesYear,
      })
    }}
    className="cursor-pointer"
  >
    <CartesianGrid
      stroke={chartGrid}
      opacity={0.35}
      strokeDasharray="4 4"
      vertical={false}
    />

    <XAxis
      dataKey="periodo"
      tickLine={false}
      axisLine={false}
      tick={{ fill: chartText, fontSize: 12 }}
    />

    <YAxis
      tickLine={false}
      axisLine={false}
      width={70}
      tick={{ fill: chartText, fontSize: 12 }}
      tickFormatter={(value) => `$${formatCompactCurrency(Number(value))}`}
    />

    <Tooltip
      content={<SalesTooltip />}
      cursor={{ stroke: chartGrid, strokeDasharray: "4 4" }}
    />

    <Line
      type="monotone"
      dataKey="monto"
      name="Monto"
      stroke="var(--primary)"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      dot={false}
      activeDot={{
        r: 5,
        fill: "var(--card)",
        stroke: "var(--primary)",
        strokeWidth: 2,
      }}
    />
  </LineChart>
</ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-500" />
                Distribución de Prospectos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {distribucionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distribucionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => `${props?.payload?.estado}: ${props?.payload?.cantidad ?? 0}`}
                      outerRadius={100}
                      dataKey="cantidad"
                      onClick={(entry: any) => {
                        const estado = entry?.estado_key || entry?.payload?.estado_key
                        if (estado) openDetails({ kind: "status", estado })
                      }}
                      className="cursor-pointer"
                    >
                      {distribucionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
<Tooltip
  formatter={(value) => [formatNumber(Number(value ?? 0)), "Cantidad"]}
  contentStyle={{
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--card-foreground)",
    borderRadius: "8px",
  }}
/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Sin datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="gap-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Rendimiento por Colaborador
                </CardTitle>

                <div className="flex gap-2 flex-wrap">
                  <select
                    value={collabMode}
                    onChange={(e) => setCollabMode(e.target.value as "always" | "month")}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="always">Siempre</option>
                    <option value="month">Mensual</option>
                  </select>

                  {collabMode === "month" && (
                    <>
                      <select
                        value={collabYear}
                        onChange={(e) => setCollabYear(Number(e.target.value))}
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        {availableYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>

                      <select
                        value={collabMonth}
                        onChange={(e) => setCollabMonth(Number(e.target.value))}
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        {MONTHS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {colaboradoresData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={colaboradoresData}>
                    <CartesianGrid stroke={chartGrid} opacity={0.35} strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" tick={{ fill: chartText, fontSize: 12 }} angle={-15} textAnchor="end" height={80} />
                    <YAxis tick={{ fill: chartText, fontSize: 12 }} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip content={<CollaboratorTooltip />} />
                    <Legend wrapperStyle={{ color: chartText }} />
                    <Bar
                      dataKey="tasa_citas"
                      fill="var(--primary)"
                      name="% Citas"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry: any) => {
                        const row = entry?.payload || entry
                        if (row?.user_id) openCollaboratorDetails(row.user_id, "citas")
                      }}
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="tasa_conversion"
                      fill="#10b981"
                      name="% Conversión"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry: any) => {
                        const row = entry?.payload || entry
                        if (row?.user_id) openCollaboratorDetails(row.user_id, "vendidos")
                      }}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Sin datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                Actividad Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actividadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={actividadData}>
                    <CartesianGrid stroke={chartGrid} opacity={0.35} strokeDasharray="3 3" />
                    <XAxis dataKey="dia" tick={{ fill: chartText, fontSize: 12 }} />
                    <YAxis tick={{ fill: chartText, fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        color: "var(--card-foreground)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend wrapperStyle={{ color: chartText }} />
                    <Bar
                      dataKey="llamadas"
                      fill="#f97316"
                      name="Llamadas"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry: any) => {
                        const row = entry?.payload || entry
                        if (row?.day) openDetails({ kind: "week_activity", day: row.day, metric: "llamadas" })
                      }}
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="citas"
                      fill="#8b5cf6"
                      name="Citas"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry: any) => {
                        const row = entry?.payload || entry
                        if (row?.day) openDetails({ kind: "week_activity", day: row.day, metric: "citas" })
                      }}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Sin datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {collabMode === "month" ? "Colaborador Destacado del Periodo" : "Colaborador Destacado Histórico"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformer ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{topPerformer.nombre}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => openCollaboratorDetails(topPerformer.user_id, "citas")}
                      className="rounded-md border border-transparent px-1 text-left transition hover:border-primary/30 hover:text-foreground"
                    >
                      <span className="font-semibold text-foreground">
                        {formatNumber(topPerformer.prospectos_con_cita)}
                      </span>{" "}
                      prospectos con cita
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => openCollaboratorDetails(topPerformer.user_id, "vendidos")}
                      className="rounded-md border border-transparent px-1 text-left transition hover:border-primary/30 hover:text-foreground"
                    >
                      <span className="font-semibold text-green-500">{formatNumber(topPerformer.vendidos)}</span>{" "}
                      vendidos
                    </button>
                    <span>•</span>
                    <span>
                      <span className="font-semibold text-primary">{formatPercent(topPerformer.tasa_conversion)}</span>{" "}
                      tasa de conversión
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openCollaboratorDetails(topPerformer.user_id, "prospectos")}>
                    Prospectos
                  </Button>
                  <Badge className="text-lg px-4 py-2">Top Performer</Badge>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sin datos suficientes para determinar un top performer.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[42rem] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{detailTitle}</DialogTitle>
          </DialogHeader>

          <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
            {detailLoading ? (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">Cargando detalle...</div>
            ) : detailError ? (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
                {detailError}
              </div>
            ) : detailItems.length === 0 ? (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No hay registros para esta métrica.</div>
            ) : (
              detailItems.map((item) => (
                <button
                  key={`${item.tipo}-${item.id}`}
                  type="button"
                  disabled={!item.prospect_id}
                  onClick={() => openProspectDetails(item)}
                  className="w-full rounded-lg border bg-card p-4 text-left transition-colors enabled:hover:border-primary/50 enabled:hover:bg-muted/30 disabled:cursor-default"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-foreground">{item.titulo}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(item.fecha)}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <ProspectTreatmentBadge prospect={item} />
                      {item.estado_label && <Badge variant="secondary">{item.estado_label}</Badge>}
                      <Badge variant="outline">{item.tipo}</Badge>
                    </div>
                  </div>
                  {item.detalle && <div className="text-sm text-muted-foreground">{item.detalle}</div>}
                  {item.conclusion && (
                    <div className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">Conclusión:</span>{" "}
                      <span className="text-muted-foreground">{item.conclusion}</span>
                    </div>
                  )}
                  {item.prospect_id && <div className="mt-2 text-xs font-medium text-primary">Ver información completa</div>}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProspectoDetailDialog
        prospecto={selectedProspect}
        open={!!selectedProspect}
        onOpenChange={(open) => !open && setSelectedProspect(null)}
        showActions={false}
      />
    </>
  )
}
