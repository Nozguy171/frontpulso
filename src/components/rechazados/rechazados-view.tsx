"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreVertical } from "lucide-react"

// Mock data
const mockRechazados = [
  {
    id: 1,
    prospecto: "Luis Ramírez",
    numero: "555-0401",
    faseRechazo: "Prospecto",
    fecha: "2025-11-10",
  },
]

export function RechazadosView() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Rechazados</h1>
          <p className="text-muted-foreground">Prospectos que dijeron no</p>
        </div>

        <div className="grid gap-4">
          {mockRechazados.map((rechazado) => (
            <Card key={rechazado.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{rechazado.prospecto}</h3>
                      <Badge variant="secondary">{rechazado.numero}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Rechazado en: <span className="text-foreground">{rechazado.faseRechazo}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">Fecha: {rechazado.fecha}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {mockRechazados.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground italic">No hay prospectos rechazados.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
