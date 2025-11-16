"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, MapPin, MoreVertical, Clock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data
const mockCitas = [
  {
    id: 1,
    prospecto: "Juan Pérez",
    fecha: "2025-11-15",
    hora: "10:00",
    domicilio: "Av. Principal 123",
    numero: "555-0101",
  },
  {
    id: 2,
    prospecto: "Ana López",
    fecha: "2025-11-16",
    hora: "14:30",
    domicilio: "Calle Secundaria 456",
    numero: "555-0102",
  },
  {
    id: 3,
    prospecto: "Carlos Mendoza",
    fecha: "2025-11-15",
    hora: "16:00",
    domicilio: "Boulevard Norte 789",
    numero: "555-0103",
  },
]

export function CitasView() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedCita, setSelectedCita] = useState<any>(null)

  const citasFiltradas = date
    ? mockCitas.filter((cita) => {
        const citaDate = new Date(cita.fecha)
        return (
          citaDate.getDate() === date.getDate() &&
          citaDate.getMonth() === date.getMonth() &&
          citaDate.getFullYear() === date.getFullYear()
        )
      })
    : mockCitas

  const fechasConCitas = mockCitas.map((cita) => new Date(cita.fecha))

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Citas</h1>
          <p className="text-muted-foreground">Gestiona tus citas programadas con vista de calendario</p>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="grid gap-4">
              {mockCitas.map((cita) => (
                <Card key={cita.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">{cita.prospecto}</h3>
                          <Badge variant="secondary">{cita.numero}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {cita.fecha} - {cita.hora}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{cita.domicilio}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedCita(cita)}>
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
                      booked: fechasConCitas,
                    }}
                    modifiersClassNames={{
                      booked: "bg-primary/20 text-primary font-bold",
                    }}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Citas del{" "}
                      {date?.toLocaleDateString("es-MX", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {citasFiltradas.length > 0 ? (
                  citasFiltradas.map((cita) => (
                    <Card key={cita.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground mb-1">{cita.prospecto}</h3>
                              <Badge variant="secondary">{cita.numero}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="font-semibold text-foreground">{cita.hora}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{cita.domicilio}</span>
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
                      <p className="text-muted-foreground italic">No hay citas programadas para esta fecha.</p>
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
