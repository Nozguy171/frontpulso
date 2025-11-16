"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Phone, Clock, MoreVertical } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data
const mockLlamadas = [
  {
    id: 1,
    prospecto: "María González",
    numero: "555-0301",
    fechaProgramada: "2025-11-12",
    hora: "15:00",
    prioridad: "alta",
  },
  {
    id: 2,
    prospecto: "Roberto Sánchez",
    numero: "555-0302",
    fechaProgramada: "2025-11-13",
    hora: "10:30",
    prioridad: "media",
  },
  {
    id: 3,
    prospecto: "Laura Martínez",
    numero: "555-0303",
    fechaProgramada: "2025-11-12",
    hora: "17:00",
    prioridad: "baja",
  },
]

export function LlamadasView() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  const llamadasFiltradas = date
    ? mockLlamadas.filter((llamada) => {
        const llamadaDate = new Date(llamada.fechaProgramada)
        return (
          llamadaDate.getDate() === date.getDate() &&
          llamadaDate.getMonth() === date.getMonth() &&
          llamadaDate.getFullYear() === date.getFullYear()
        )
      })
    : mockLlamadas

  const fechasConLlamadas = mockLlamadas.map((llamada) => new Date(llamada.fechaProgramada))

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta":
        return "border-red-500/50 bg-red-500/5"
      case "media":
        return "border-yellow-500/50 bg-yellow-500/5"
      default:
        return ""
    }
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Llamadas</h1>
          <p className="text-muted-foreground">Llamadas programadas pendientes con vista de calendario</p>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="grid gap-4">
              {mockLlamadas.map((llamada) => (
                <Card
                  key={llamada.id}
                  className={`hover:border-primary/50 transition-colors ${getPrioridadColor(llamada.prioridad)}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-foreground">{llamada.prospecto}</h3>
                          <Badge variant="secondary">{llamada.numero}</Badge>
                          {llamada.prioridad === "alta" && <Badge variant="destructive">Urgente</Badge>}
                          {llamada.prioridad === "media" && (
                            <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">
                              Prioridad Media
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {llamada.fechaProgramada} - {llamada.hora}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>Llamada pendiente</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="grid lg:grid-cols-[350px_1fr] gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Seleccionar Fecha</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                    modifiers={{
                      scheduled: fechasConLlamadas,
                    }}
                    modifiersClassNames={{
                      scheduled: "bg-primary/20 text-primary font-bold",
                    }}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Llamadas del{" "}
                      {date?.toLocaleDateString("es-MX", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {llamadasFiltradas.length > 0 ? (
                  llamadasFiltradas.map((llamada) => (
                    <Card
                      key={llamada.id}
                      className={`hover:border-primary/50 transition-colors ${getPrioridadColor(llamada.prioridad)}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-foreground">{llamada.prospecto}</h3>
                              <Badge variant="secondary">{llamada.numero}</Badge>
                              {llamada.prioridad === "alta" && <Badge variant="destructive">Urgente</Badge>}
                              {llamada.prioridad === "media" && (
                                <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">
                                  Prioridad Media
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="font-semibold text-foreground">{llamada.hora}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground italic">No hay llamadas programadas para esta fecha.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
