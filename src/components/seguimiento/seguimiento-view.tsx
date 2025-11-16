"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, MoreVertical } from "lucide-react"

// Mock data
const mockSeguimiento = [
  {
    id: 1,
    prospecto: "Carlos Mendoza",
    numero: "555-0201",
    montoVenta: 25000,
    proximaLlamada: "2025-12-15",
  },
]

export function SeguimientoView() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Seguimiento</h1>
          <p className="text-muted-foreground">Clientes con ventas realizadas</p>
        </div>

        <div className="grid gap-4">
          {mockSeguimiento.map((item) => (
            <Card key={item.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{item.prospecto}</h3>
                      <Badge variant="secondary">{item.numero}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-500">
                        ${item.montoVenta.toLocaleString()} MXN
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Próxima llamada: {item.proximaLlamada}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {mockSeguimiento.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground italic">No hay prospectos en seguimiento.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
