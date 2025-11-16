"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, UserCircle, MoreVertical } from "lucide-react"

// Mock data
const mockColaboradores = [
  {
    id: 1,
    nombre: "María García",
    email: "maria@example.com",
    rol: "Colaborador",
    prospectos: 12,
    ventas: 3,
  },
  {
    id: 2,
    nombre: "Carlos Ruiz",
    email: "carlos@example.com",
    rol: "Colaborador",
    prospectos: 8,
    ventas: 2,
  },
]

export function ColaboradoresView() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Solo Líder
          </Badge>
        </div>
        <p className="text-muted-foreground mb-8">Gestiona tu equipo de ventas</p>

        <div className="grid gap-4 md:grid-cols-2">
          {mockColaboradores.map((colaborador) => (
            <Card key={colaborador.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <UserCircle className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{colaborador.nombre}</h3>
                      <p className="text-sm text-muted-foreground">{colaborador.email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{colaborador.prospectos}</p>
                    <p className="text-xs text-muted-foreground">Prospectos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500">{colaborador.ventas}</p>
                    <p className="text-xs text-muted-foreground">Ventas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
