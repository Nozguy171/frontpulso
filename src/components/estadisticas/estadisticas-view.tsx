"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { API_BASE_URL } from "@/lib/api"
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

function getActingAsUserId(): string | null {
  if (typeof window === "undefined") return null
  const v = localStorage.getItem("pulso_acting_as_user_id")
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

function SalesTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="min-w-[190px] rounded-xl border border-white/10 bg-[#0b1020] p-3 shadow-md">
      <p className="mb-2 text-sm font-semibold text-white">{label}</p>

      <div className="space-y-1 text-sm">
        <p className="text-slate-300">
          Monto: <span className="font-medium text-white">{formatCurrency(Number(row.monto || 0))}</span>
        </p>
        <p className="text-slate-300">
          Ventas: <span className="font-medium text-white">{formatNumber(Number(row.ventas || 0))}</span>
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

  return (
    <AppLayout>
      <div className="p-8">
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
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
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

          <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
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

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
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

          <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
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
  >
    <CartesianGrid
      stroke="rgba(148,163,184,0.10)"
      strokeDasharray="4 4"
      vertical={false}
    />

    <XAxis
      dataKey="periodo"
      tickLine={false}
      axisLine={false}
      tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }}
    />

    <YAxis
      tickLine={false}
      axisLine={false}
      width={70}
      tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }}
      tickFormatter={(value) => `$${formatCompactCurrency(Number(value))}`}
    />

    <Tooltip
      content={<SalesTooltip />}
      cursor={{ stroke: "rgba(148,163,184,0.22)", strokeDasharray: "4 4" }}
    />

    <Line
      type="monotone"
      dataKey="monto"
      name="Monto"
      stroke="#8b5cf6"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      dot={false}
      activeDot={{
        r: 5,
        fill: "#0b1020",
        stroke: "#8b5cf6",
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
                    >
                      {distribucionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatNumber(Number(value)), "Cantidad"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
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
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="nombre" className="text-xs" angle={-15} textAnchor="end" height={80} />
                    <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip content={<CollaboratorTooltip />} />
                    <Legend />
                    <Bar dataKey="tasa_citas" fill="hsl(var(--primary))" name="% Citas" radius={[6, 6, 0, 0]} />
                    <Bar
                      dataKey="tasa_conversion"
                      fill="#10b981"
                      name="% Conversión"
                      radius={[6, 6, 0, 0]}
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
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="dia" className="text-xs" />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="llamadas" fill="#f97316" name="Llamadas" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="citas" fill="#8b5cf6" name="Citas" radius={[6, 6, 0, 0]} />
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
                    <span>
                      <span className="font-semibold text-foreground">
                        {formatNumber(topPerformer.prospectos_con_cita)}
                      </span>{" "}
                      prospectos con cita
                    </span>
                    <span>•</span>
                    <span>
                      <span className="font-semibold text-green-500">{formatNumber(topPerformer.vendidos)}</span>{" "}
                      vendidos
                    </span>
                    <span>•</span>
                    <span>
                      <span className="font-semibold text-primary">{formatPercent(topPerformer.tasa_conversion)}</span>{" "}
                      tasa de conversión
                    </span>
                  </div>
                </div>
                <Badge className="text-lg px-4 py-2">Top Performer</Badge>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sin datos suficientes para determinar un top performer.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}