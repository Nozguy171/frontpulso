"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, MoreVertical } from "lucide-react"

// Mock data
interface Anexado {
  id: string
  prospecto: string
  numero: string
  fecha: string
}

const mockAnexados: Anexado[] = []

export function AnexadosView() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Anexados</h1>
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Solo Líder
          </Badge>
        </div>
        <p className="text-muted-foreground mb-8">Prospectos archivados permanentemente</p>

        <div className="grid gap-4">
          {mockAnexados.map((anexado) => (
            <Card key={anexado.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{anexado.prospecto}</h3>
                      <Badge variant="secondary">{anexado.numero}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Fecha anexado: {anexado.fecha}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {mockAnexados.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground italic">No hay prospectos anexados.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
