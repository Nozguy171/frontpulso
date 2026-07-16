"use client"

import { useMemo, useState } from "react"
import { Search, User, PhoneIcon, UsersIcon, MoreVertical } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProspectoDetailDialog } from "./prospecto-detail-dialog"
import { ProspectStatusBadge } from "./prospect-status-badge"
import { ProspectTreatmentBadge } from "./prospect-treatment-badge"
import { formatProspectPhone } from "@/lib/prospect"

type Prospecto = {
  id: number
  nombre: string
  numero: string
  lada?: string | null
  numero_formateado?: string | null
  numero_encuesta?: string | null
  trato_prospecto?: "enojado" | "feliz" | "neutral" | null
  observaciones?: string | null
  estado: string
  recomendado_por_id?: number | null
  recomendado_por_nombre?: string | null
  forma_obtencion_tipo?: "encuesta" | "referido" | "cita_en_frio" | "otro" | null
  forma_obtencion?: string | null
  venta_monto_sin_iva?: number | null
  venta_fecha?: string | null
  rechazo_motivo?: string | null
  rechazo_at?: string | null
  rechazo_count?: number
  seguimiento_pausado?: boolean
  seguimiento_pausado_at?: string | null
  seguimiento_fecha_base?: string | null
  created_at?: string
}

type ResumenEstado = {
  estado: string
  cantidad: number
}

type SearchResponse = {
  prospectos: Prospecto[]
  resumen_estados: ResumenEstado[]
  total: number
}

function getActingAsUserIdSafe(): string | null {
  const v = typeof window !== "undefined" ? localStorage.getItem("pulso_acting_user_id") : null
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
}

function prettyEstado(estado: string) {
  const m: Record<string, string> = {
    pendiente: "Pendiente",
    sin_respuesta: "Sin respuesta",
    con_cita: "Con cita",
    seguimiento: "Seguimiento",
    rechazado: "Rechazado",
  }
  return m[estado] ?? estado
}

function estadoBadgeVariant(estado: string) {
  switch (estado) {
    case "pendiente":
      return "default"
    case "sin_respuesta":
      return "secondary"
    case "con_cita":
      return "outline"
    case "seguimiento":
      return "secondary"
    case "rechazado":
      return "destructive"
    default:
      return "outline"
  }
}

export function ProspectosGlobalSearch({
  onActionCompleted,
}: {
  onActionCompleted?: () => void
}) {
const [query, setQuery] = useState("")
const [estado, setEstado] = useState("todos")
const [open, setOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [data, setData] = useState<SearchResponse | null>(null)
const [detailProspecto, setDetailProspecto] = useState<Prospecto | null>(null)

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("pulso_token") : null
    const actingAs = getActingAsUserIdSafe()

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
    }
  }

  const runSearch = async (nextEstado = estado) => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (query.trim()) params.append("q", query.trim())
      if (nextEstado && nextEstado !== "todos") params.append("estado", nextEstado)
      params.append("limit", "150")

      const res = await fetch(`${API_BASE_URL}/prospects/search?${params.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
      })

      const text = await res.text()

      let json: any = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {}

      if (!res.ok) {
        throw new Error(json?.message || "No se pudo buscar prospectos")
      }

      setEstado(nextEstado)
      setData(json)
      setOpen(true)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "Error al buscar prospectos")
    } finally {
      setLoading(false)
    }
  }

  const resumenMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of data?.resumen_estados || []) {
      map.set(item.estado, item.cantidad)
    }
    return map
  }, [data])

  return (
    <>
      <div className="w-full lg:w-[420px]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en todos tus prospectos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch("todos")
              }}
            />
          </div>

          <Button onClick={() => runSearch("todos")} className="h-11 px-5" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[52rem] w-[95vw] max-w-5xl flex-col overflow-hidden p-0">
          <div className="shrink-0 border-b p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">Buscador general de prospectos</DialogTitle>
              <DialogDescription>
                Todos los prospectos visibles para este usuario, excepto anexados.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant={estado === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => runSearch("todos")}
              >
                Todos
                <Badge variant="secondary" className="ml-2">
                  {data?.total ?? 0}
                </Badge>
              </Button>

              {["pendiente", "sin_respuesta", "con_cita", "seguimiento", "rechazado"].map((key) => (
                <Button
                  key={key}
                  variant={estado === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => runSearch(key)}
                >
                  {prettyEstado(key)}
                  <Badge variant="secondary" className="ml-2">
                    {resumenMap.get(key) ?? 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            {!data || data.prospectos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No se encontraron prospectos.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {data.prospectos.map((prospecto) => (
                  <Card key={prospecto.id} className="border-border/50 bg-card/80">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setDetailProspecto(prospecto)}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="text-base sm:text-lg font-semibold truncate">
                                  {prospecto.nombre}
                                </h3>
                                <Badge variant={estadoBadgeVariant(prospecto.estado) as any}>
                                  {prettyEstado(prospecto.estado)}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="font-mono text-xs">
                                  <PhoneIcon className="h-3 w-3 mr-1" />
                                  {formatProspectPhone(prospecto)}
                                </Badge>
                                <Badge variant="secondary" className="font-mono text-xs">
                                  Encuesta: {prospecto.numero_encuesta ?? "—"}
                                </Badge>
                                <ProspectTreatmentBadge prospect={prospecto} />
                                <ProspectStatusBadge prospect={prospecto} />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pl-[52px]">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <UsersIcon className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                Recomendado por:{" "}
                                <span className="text-foreground font-medium">
                                  {prospecto.recomendado_por_nombre ?? "—"}
                                </span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground">
                                Forma de obtención
                              </span>
                              <span className="truncate text-foreground font-medium">
                                {prospecto.forma_obtencion ?? "—"}
                              </span>
                            </div>

                          </div>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

<ProspectoDetailDialog
  prospecto={detailProspecto}
  open={!!detailProspecto}
  onOpenChange={(open) => !open && setDetailProspecto(null)}
  onActionCompleted={() => {
    runSearch(estado)
    setDetailProspecto(null)
    onActionCompleted?.()
  }}
  showActions={false}
/>

    </>
  )
}
