"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

// Mock data for charts
interface VentaMes {
  mes: string
  ventas: number
  monto: number
}

interface CitaColaborador {
  nombre: string
  citas: number
  conversiones: number
  porcentaje: number
}

interface ProspectoEstado {
  estado: string
  cantidad: number
  color: string
  [key: string]: string | number
}

interface ActividadDia {
  dia: string
  llamadas: number
  citas: number
}

const ventasPorMes: VentaMes[] = [
  { mes: "Jul", ventas: 12, monto: 300000 },
  { mes: "Ago", ventas: 15, monto: 375000 },
  { mes: "Sep", ventas: 18, monto: 450000 },
  { mes: "Oct", ventas: 22, monto: 550000 },
  { mes: "Nov", ventas: 25, monto: 625000 },
]

const citasPorColaborador: CitaColaborador[] = [
  { nombre: "María García", citas: 45, conversiones: 15, porcentaje: 33 },
  { nombre: "Carlos Ruiz", citas: 38, conversiones: 12, porcentaje: 32 },
  { nombre: "Laura Torres", citas: 52, conversiones: 18, porcentaje: 35 },
  { nombre: "Roberto Sánchez", citas: 31, conversiones: 8, porcentaje: 26 },
]

const prospectosPorEstado: ProspectoEstado[] = [
  { estado: "Pendiente", cantidad: 45, color: "#3b82f6" },
  { estado: "Seguimiento", cantidad: 32, color: "#8b5cf6" },
  { estado: "Anexados", cantidad: 18, color: "#10b981" },
  { estado: "Rechazados", cantidad: 12, color: "#ef4444" },
]

const actividadSemanal: ActividadDia[] = [
  { dia: "Lun", llamadas: 24, citas: 8 },
  { dia: "Mar", llamadas: 32, citas: 12 },
  { dia: "Mié", llamadas: 28, citas: 10 },
  { dia: "Jue", llamadas: 35, citas: 15 },
  { dia: "Vie", llamadas: 30, citas: 11 },
]

export function EstadisticasView() {
  const topPerformer = citasPorColaborador.reduce((prev, current) =>
    prev.conversiones > current.conversiones ? prev : current,
  )

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Estadísticas y Métricas</h1>
          <p className="text-muted-foreground">Dashboard completo de rendimiento del equipo y métricas de ventas</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ventas del Mes</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">$625,000</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500 font-medium">+13.6%</span> vs mes anterior
              </p>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversión</CardTitle>
              <Target className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">32%</div>
              <p className="text-xs text-muted-foreground mt-1">53 de 166 prospectos convertidos</p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Citas Agendadas</CardTitle>
              <Calendar className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">166</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-500 font-medium">+8</span> esta semana
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
              <div className="text-2xl font-bold text-foreground">149</div>
              <p className="text-xs text-muted-foreground mt-1">Promedio: 30 por día</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evolución de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ventasPorMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ventas" stroke="hsl(var(--primary))" strokeWidth={2} name="Ventas" />
                  <Line
                    type="monotone"
                    dataKey="monto"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="Monto (MXN)"
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={prospectosPorEstado}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props) => {
                      const entry = prospectosPorEstado[props.index]
                      return `${entry.estado}: ${entry.cantidad}`
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="cantidad"
                  >
                    {prospectosPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Rendimiento por Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={citasPorColaborador}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="nombre" className="text-xs" angle={-15} textAnchor="end" height={80} />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="citas" fill="hsl(var(--primary))" name="Citas" />
                  <Bar dataKey="conversiones" fill="#10b981" name="Conversiones" />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actividadSemanal}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="llamadas" fill="#f97316" name="Llamadas" />
                  <Bar dataKey="citas" fill="#8b5cf6" name="Citas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Performer Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Colaborador Destacado del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{topPerformer.nombre}</h3>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">{topPerformer.citas}</span> citas agendadas
                  </span>
                  <span>•</span>
                  <span>
                    <span className="font-semibold text-green-500">{topPerformer.conversiones}</span> conversiones
                  </span>
                  <span>•</span>
                  <span>
                    <span className="font-semibold text-primary">{topPerformer.porcentaje}%</span> tasa de conversión
                  </span>
                </div>
              </div>
              <Badge className="text-lg px-4 py-2">Top Performer</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
