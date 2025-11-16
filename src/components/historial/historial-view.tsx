"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { HistoryIcon, Search, User, TrendingUp, ChevronRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data - Expanded
const mockHistorial = [
  {
    id: 1,
    accion: "Prospecto agregado",
    prospecto: "Juan Pérez",
    prospectoId: "1",
    usuario: "María García",
    usuarioId: "u1",
    fecha: "2025-11-12 09:30",
    tipo: "creacion",
  },
  {
    id: 2,
    accion: "Cita agendada",
    prospecto: "Ana López",
    prospectoId: "2",
    usuario: "Carlos Ruiz",
    usuarioId: "u2",
    fecha: "2025-11-12 10:15",
    tipo: "cita",
  },
  {
    id: 3,
    accion: "Venta realizada",
    prospecto: "Carlos Mendoza",
    prospectoId: "3",
    usuario: "Laura Torres",
    usuarioId: "u3",
    fecha: "2025-11-11 16:45",
    tipo: "venta",
    monto: 25000,
  },
  {
    id: 4,
    accion: "Estado cambiado a Seguimiento",
    prospecto: "Juan Pérez",
    prospectoId: "1",
    usuario: "María García",
    usuarioId: "u1",
    fecha: "2025-11-10 14:20",
    tipo: "cambio",
  },
  {
    id: 5,
    accion: "Llamada realizada",
    prospecto: "Juan Pérez",
    prospectoId: "1",
    usuario: "María García",
    usuarioId: "u1",
    fecha: "2025-11-09 11:00",
    tipo: "llamada",
  },
]

// Mock prospectos timeline
const mockProspectos = [
  { id: "1", nombre: "Juan Pérez" },
  { id: "2", nombre: "Ana López" },
  { id: "3", nombre: "Carlos Mendoza" },
]

// Mock usuarios
const mockUsuarios = [
  { id: "u1", nombre: "María García" },
  { id: "u2", nombre: "Carlos Ruiz" },
  { id: "u3", nombre: "Laura Torres" },
]

const tipoColors: Record<string, string> = {
  creacion: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cita: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  venta: "bg-green-500/10 text-green-500 border-green-500/20",
  rechazo: "bg-red-500/10 text-red-500 border-red-500/20",
  cambio: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  llamada: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
}

export function HistorialView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchProspecto, setSearchProspecto] = useState("")
  const [searchUsuario, setSearchUsuario] = useState("")
  const [selectedProspecto, setSelectedProspecto] = useState<string>("")
  const [selectedUsuario, setSelectedUsuario] = useState<string>("")

  const historialPorProspecto = selectedProspecto
    ? mockHistorial
        .filter((item) => item.prospectoId === selectedProspecto)
        .filter(
          (item) =>
            item.accion.toLowerCase().includes(searchProspecto.toLowerCase()) ||
            item.usuario.toLowerCase().includes(searchProspecto.toLowerCase()),
        )
    : []

  const historialPorUsuario = selectedUsuario
    ? mockHistorial
        .filter((item) => item.usuarioId === selectedUsuario)
        .filter(
          (item) =>
            item.accion.toLowerCase().includes(searchUsuario.toLowerCase()) ||
            item.prospecto.toLowerCase().includes(searchUsuario.toLowerCase()),
        )
    : []

  const historialFiltrado = mockHistorial.filter(
    (item) =>
      item.prospecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.accion.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <AppLayout>
      <div className="p-8">
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

          {/* General History */}
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

            <div className="space-y-4">
              {historialFiltrado.map((item) => (
                <Card key={item.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${tipoColors[item.tipo] || "bg-muted"}`}>
                        <HistoryIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{item.accion}</h3>
                          {item.monto && (
                            <Badge variant="secondary" className="text-green-500">
                              ${item.monto.toLocaleString()} MXN
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Prospecto: <span className="text-foreground">{item.prospecto}</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Usuario: {item.usuario}</span>
                          <span>•</span>
                          <span>{item.fecha}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="prospecto" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seleccionar Prospecto</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedProspecto} onValueChange={setSelectedProspecto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un prospecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProspectos.map((prospecto) => (
                      <SelectItem key={prospecto.id} value={prospecto.id}>
                        {prospecto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedProspecto && (
              <>
                <Card>
                  <CardHeader>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar en el timeline..."
                        className="pl-10"
                        value={searchProspecto}
                        onChange={(e) => setSearchProspecto(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Timeline completo - {mockProspectos.find((p) => p.id === selectedProspecto)?.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative space-y-6">
                      {/* Timeline line */}
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border" />

                      {historialPorProspecto.length > 0 ? (
                        historialPorProspecto.map((item, index) => (
                          <div key={item.id} className="relative flex gap-4">
                            <div
                              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                                tipoColors[item.tipo] || "bg-muted"
                              }`}
                            >
                              <ChevronRight className="h-5 w-5" />
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="mb-1 flex items-center gap-2">
                                <h4 className="font-semibold text-foreground">{item.accion}</h4>
                                {item.monto && (
                                  <Badge variant="secondary" className="text-green-500">
                                    ${item.monto.toLocaleString()} MXN
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Ejecutado por: {item.usuario}</p>
                                <p className="text-xs">{item.fecha}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground italic">No hay historial para este prospecto.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="usuario" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seleccionar Usuario</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedUsuario && (
              <>
                <Card>
                  <CardHeader>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar en actividad del usuario..."
                        className="pl-10"
                        value={searchUsuario}
                        onChange={(e) => setSearchUsuario(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Actividad de {mockUsuarios.find((u) => u.id === selectedUsuario)?.nombre}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <div className="space-y-4">
                  {historialPorUsuario.length > 0 ? (
                    historialPorUsuario.map((item) => (
                      <Card key={item.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${tipoColors[item.tipo] || "bg-muted"}`}>
                              <HistoryIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">{item.accion}</h3>
                                {item.monto && (
                                  <Badge variant="secondary" className="text-green-500">
                                    ${item.monto.toLocaleString()} MXN
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Prospecto: <span className="text-foreground">{item.prospecto}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">{item.fecha}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground italic">No hay actividad para este usuario.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
