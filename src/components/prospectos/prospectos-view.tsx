"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreVertical, User, PhoneIcon, UsersIcon } from "lucide-react"
import { ProspectoDialog } from "./prospecto-dialog"
import { ProspectoActionsDialog } from "./prospecto-action-dialog"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8085/api"

type Prospecto = {
  id: number
  nombre: string
  numero: string
  observaciones?: string | null
  estado: string
  recomendado_por_id?: number | null
  recomendado_por_nombre?: string | null
}

export function ProspectosView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null)
  const [activeTab, setActiveTab] = useState<"pendientes" | "sinRespuesta">("pendientes")

  const [prospectosPendientes, setProspectosPendientes] = useState<Prospecto[]>([])
  const [prospectosSinRespuesta, setProspectosSinRespuesta] = useState<Prospecto[]>([])
  const [loading, setLoading] = useState(false)

  // --- helpers para llamar al API ---

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("pulso_token") : null
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

const fetchProspects = async (opts: { estado?: string; q?: string } = {}) => {
  const params = new URLSearchParams()
  if (opts.estado) params.append("estado", opts.estado)
  if (opts.q && opts.q.trim()) params.append("q", opts.q.trim())

  const headers = getAuthHeaders()
  console.log("👉 Headers que mando al back:", headers)

  const res = await fetch(`${API_BASE_URL}/prospects/?${params.toString()}`, {
    method: "GET",
    headers,
  })

  const text = await res.text()
  console.log("👉 Res status:", res.status)
  console.log("👉 Res body raw:", text)

  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch (e) {
    console.error("No se pudo parsear JSON:", e)
  }

  if (!res.ok) {
    console.error("Error cargando prospectos:", data)
    throw new Error(data.message ?? "Error al cargar prospectos")
  }

  return (data.prospectos ?? []) as Prospecto[]
}


  async function loadProspects() {
    try {
      setLoading(true)
      const [pend, sinResp] = await Promise.all([
        fetchProspects({ estado: "pendiente" }),
        fetchProspects({ estado: "sin_respuesta" }),
      ])
      setProspectosPendientes(pend)
      setProspectosSinRespuesta(sinResp)
    } catch (err) {
      console.error(err)
      alert("No se pudieron cargar los prospectos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProspects()
  }, [])

  const handleSearch = async () => {
    const q = searchQuery.trim()

    // si no hay búsqueda, recarga todo normal
    if (!q) {
      loadProspects()
      return
    }

    try {
      setLoading(true)
      if (activeTab === "pendientes") {
        const pend = await fetchProspects({ estado: "pendiente", q })
        setProspectosPendientes(pend)
      } else {
        const sinResp = await fetchProspects({ estado: "sin_respuesta", q })
        setProspectosSinRespuesta(sinResp)
      }
    } catch (err) {
      console.error(err)
      alert("Error al buscar prospectos")
    } finally {
      setLoading(false)
    }
  }

  const prospectos = activeTab === "pendientes" ? prospectosPendientes : prospectosSinRespuesta

  const totalProspectos = prospectosPendientes.length + prospectosSinRespuesta.length

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Prospectos</h1>
          <p className="text-muted-foreground text-lg">Gestiona y da seguimiento a tus prospectos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Total Prospectos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{totalProspectos}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{prospectosPendientes.length}</p>
            </CardContent>
          </Card>
          <Card className="border-warning/30 bg-warning/5 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PhoneIcon className="h-4 w-4" />
                Sin Respuesta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-warning">{prospectosSinRespuesta.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar prospecto por nombre o número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-background/50 border-border/50"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} className="h-11 px-6">
                Buscar
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)} className="h-11 px-6">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "pendientes" ? "default" : "outline"}
            onClick={() => setActiveTab("pendientes")}
            className="h-10 px-6"
          >
            Pendientes
            <Badge variant="secondary" className="ml-2">
              {prospectosPendientes.length}
            </Badge>
          </Button>
          <Button
            variant={activeTab === "sinRespuesta" ? "default" : "outline"}
            onClick={() => setActiveTab("sinRespuesta")}
            className="h-10 px-6"
          >
            Sin respuesta
            <Badge variant="secondary" className="ml-2">
              {prospectosSinRespuesta.length}
            </Badge>
          </Button>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center text-muted-foreground">
                Cargando prospectos...
              </CardContent>
            </Card>
          ) : prospectos.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
                    <UsersIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-lg">
                    {activeTab === "pendientes" ? "No hay prospectos pendientes." : "No hay prospectos sin respuesta."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            prospectos.map((prospecto) => (
              <Card
                key={prospecto.id}
                className="hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 border-border/50 bg-card/80 backdrop-blur group"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-1">{prospecto.nombre}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">
                              <PhoneIcon className="h-3 w-3 mr-1" />
                              {prospecto.numero}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pl-[52px]">
                        <UsersIcon className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Recomendado por:{" "}
                          <span className="text-foreground font-medium">
                            {prospecto.recomendado_por_nombre ?? "—"}
                          </span>
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedProspecto(prospecto)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ProspectoDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={(nuevoProspecto) => {
          // al crearse, por default está en "pendiente"
          setProspectosPendientes((prev) => [nuevoProspecto, ...prev])
          setIsAddDialogOpen(false)
        }}
      />

      {selectedProspecto && (
        <ProspectoActionsDialog
          prospecto={selectedProspecto}
          open={!!selectedProspecto}
          onOpenChange={(open) => !open && setSelectedProspecto(null)}
          onActionCompleted={() => {
            // después de cualquier acción recargamos desde el back para reflejar cambios de estado
            loadProspects()
          }}
        />
      )}
    </AppLayout>
  )
}
