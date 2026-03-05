"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Phone, MoreVertical, Clock, StickyNote, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_BASE_URL } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const AppLayout = dynamic(() => import("@/components/layout/app-layout").then((m) => m.AppLayout), { ssr: false })

type LlamadaDTO = {
  id: number
  fecha_hora: string
  observaciones?: string | null
  estado: string
  prospect?: { id: number; nombre: string; numero: string } | null
}

type DaysResponse = { days: { day: string; count: number }[] }

// ✅ Historial real (backend /history)
type HistoryItemDTO = {
  id: number
  accion: string
  detalle?: string | null
  created_at: string
  actor?: { id: number | null; email: string | null } | null
  effective?: { id: number | null; email: string | null } | null
  user?: { id: number | null; email: string | null } | null
}

type AmigosResponse = {
  recomendado_por: any | null
  recomendados: any[]
}

function getActingAsUserId(): string | null {
  const v = localStorage.getItem("pulso_acting_as_user_id")
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
}

async function apiGet(path: string) {
  const token = localStorage.getItem("pulso_token")
  const actingAs = getActingAsUserId()

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
    },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiPost(path: string, body: any) {
  const token = localStorage.getItem("pulso_token")
  const actingAs = getActingAsUserId()

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// YYYY-MM-DD LOCAL (sin timezone)
function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDiaLargo(d?: Date) {
  if (!d) return ""
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
}

function formatFechaCorta(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX")
}

function formatFechaHora(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
}

function getAutor(h: HistoryItemDTO) {
  return h.effective?.email || h.user?.email || h.actor?.email || "—"
}

// rango del mes (LOCAL)
function monthRange(base: Date) {
  const from = new Date(base.getFullYear(), base.getMonth(), 1)
  const to = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return { from, to }
}

// helper: abre picker nativo si existe (Chrome/Edge), si no, focus.
function openNativePicker(ref: React.RefObject<HTMLInputElement | null>) {
  const el = ref.current
  if (!el) return
  ;(el as any).showPicker?.()
  el.focus()
}

function LlamadaActionsMenu({
  onAction,
}: {
  onAction?: (action: "reagendar" | "agendar_cita" | "vendido" | "rechazado" | "observaciones" | "ver_amigos") => void
}) {
  return (
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Acciones">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("reagendar")
            }}
          >
            Reagendar llamada
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("agendar_cita")
            }}
          >
            Agendar cita
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("vendido")
            }}
          >
            Marcar vendido
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("rechazado")
            }}
          >
            Rechazado
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("ver_amigos")
            }}
          >
            Ver amigos
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onAction?.("observaciones")
            }}
          >
            Agregar observaciones
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type ActionState =
  | null
  | { type: "reagendar"; llamada: LlamadaDTO }
  | { type: "agendar_cita"; llamada: LlamadaDTO }
  | { type: "vendido"; llamada: LlamadaDTO }
  | { type: "rechazado"; llamada: LlamadaDTO }
  | { type: "observaciones"; llamada: LlamadaDTO }
  | { type: "ver_amigos"; llamada: LlamadaDTO }

export function LlamadasView() {
  const [tab, setTab] = useState<"list" | "calendar">("list")

  const [date, setDate] = useState<Date | undefined>(new Date())
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date())

  const [llamadas, setLlamadas] = useState<LlamadaDTO[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [errorList, setErrorList] = useState<string | null>(null)

  const [diasConLlamadasSet, setDiasConLlamadasSet] = useState<Set<string>>(new Set())
  const [loadingDays, setLoadingDays] = useState(false)

  const [llamadasDelDia, setLlamadasDelDia] = useState<LlamadaDTO[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [errorDay, setErrorDay] = useState<string | null>(null)

  const [search, setSearch] = useState("")

  const [openLlamadaId, setOpenLlamadaId] = useState<number | null>(null)

  const selectedLlamada = useMemo(
    () => llamadas.find((c) => c.id === openLlamadaId) ?? llamadasDelDia.find((c) => c.id === openLlamadaId) ?? null,
    [openLlamadaId, llamadas, llamadasDelDia]
  )

  const openLlamada = (id: number) => setOpenLlamadaId(id)

  // ✅ amigos
  const [amigosData, setAmigosData] = useState<AmigosResponse | null>(null)
  const [loadingAmigos, setLoadingAmigos] = useState(false)
  const [errorAmigos, setErrorAmigos] = useState<string | null>(null)

  const refreshAmigos = async (prospectId: number) => {
    setLoadingAmigos(true)
    setErrorAmigos(null)
    try {
      const data = (await apiGet(`/prospects/${prospectId}/amigos`)) as AmigosResponse
      setAmigosData({
        recomendado_por: data?.recomendado_por ?? null,
        recomendados: (data?.recomendados ?? []) as any[],
      })
    } catch (e: any) {
      setErrorAmigos(e?.message || "No se pudieron cargar los amigos")
      setAmigosData(null)
    } finally {
      setLoadingAmigos(false)
    }
  }

  // ✅ Historial de notas del prospecto (desde /history)
  const [prospectNotes, setProspectNotes] = useState<HistoryItemDTO[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [errorNotes, setErrorNotes] = useState<string | null>(null)

  const refreshNotes = async (prospectId: number) => {
    setLoadingNotes(true)
    setErrorNotes(null)
    try {
      const data = await apiGet(`/history/?prospect_id=${encodeURIComponent(String(prospectId))}&limit=200`)
      const items: HistoryItemDTO[] = (data?.historial || []) as any

      const notas = items
        .filter((x) => (x?.accion || "").toLowerCase() === "observaciones")
        .filter((x) => (x?.detalle || "").trim().length > 0)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))

      setProspectNotes(notas)
    } catch (e: any) {
      setErrorNotes(e?.message || "No se pudieron cargar las notas del prospecto")
      setProspectNotes([])
    } finally {
      setLoadingNotes(false)
    }
  }

  // cuando abres el modal, carga notas del prospecto
  useEffect(() => {
    let cancelled = false

    const prospectId = selectedLlamada?.prospect?.id
    if (!openLlamadaId || !prospectId) {
      setProspectNotes([])
      setErrorNotes(null)
      setLoadingNotes(false)
      return
    }

    setLoadingNotes(true)
    setErrorNotes(null)

    ;(async () => {
      try {
        const data = await apiGet(`/history/?prospect_id=${encodeURIComponent(String(prospectId))}&limit=200`)
        if (cancelled) return

        const items: HistoryItemDTO[] = (data?.historial || []) as any

        const notas = items
          .filter((x) => (x?.accion || "").toLowerCase() === "observaciones")
          .filter((x) => (x?.detalle || "").trim().length > 0)
          .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))

        setProspectNotes(notas)
      } catch (e: any) {
        if (cancelled) return
        setErrorNotes(e?.message || "No se pudieron cargar las notas del prospecto")
        setProspectNotes([])
      } finally {
        if (!cancelled) setLoadingNotes(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [openLlamadaId, selectedLlamada?.prospect?.id])

  // ====== MODAL ACCIONES ======
  const [actionOpen, setActionOpen] = useState<ActionState>(null)
  const [savingAction, setSavingAction] = useState(false)

  const [formFecha, setFormFecha] = useState("")
  const [formHora, setFormHora] = useState("")
  const [formUbicacion, setFormUbicacion] = useState("")
  const [formObs, setFormObs] = useState("")
  const [formMonto, setFormMonto] = useState("")
  const [formMotivo, setFormMotivo] = useState("")

  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const timeInputRef = useRef<HTMLInputElement | null>(null)

  const resetActionForms = () => {
    setFormFecha("")
    setFormHora("")
    setFormUbicacion("")
    setFormObs("")
    setFormMonto("")
    setFormMotivo("")
  }

  const refreshAll = async () => {
    const today = ymd(new Date())
    const base = visibleMonth ?? new Date()
    const { from, to } = monthRange(base)

    const [listData, daysData, dayData] = await Promise.all([
      apiGet(`/calls/?from=${encodeURIComponent(today)}&limit=200&estado=pendiente`),
      apiGet(`/calls/days?from=${encodeURIComponent(ymd(from))}&to=${encodeURIComponent(ymd(to))}&estado=pendiente`),
      date ? apiGet(`/calls/?day=${encodeURIComponent(ymd(date))}&estado=pendiente`) : Promise.resolve({ llamadas: [] }),
    ])

    setLlamadas((listData.llamadas || []) as LlamadaDTO[])

    const s = new Set<string>()
    for (const d of (daysData.days || []) as any[]) s.add(d.day)
    setDiasConLlamadasSet(s)

    setLlamadasDelDia((dayData.llamadas || []) as LlamadaDTO[])
  }

  const onLlamadaAction = (
    action: "reagendar" | "agendar_cita" | "vendido" | "rechazado" | "observaciones" | "ver_amigos",
    llamada: LlamadaDTO
  ) => {
    if (llamada.estado !== "pendiente") return

    resetActionForms()

    if (action === "reagendar") {
      const d = new Date(llamada.fecha_hora)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const hh = String(d.getHours()).padStart(2, "0")
      const mi = String(d.getMinutes()).padStart(2, "0")
      setFormFecha(`${yyyy}-${mm}-${dd}`)
      setFormHora(`${hh}:${mi}`)
      setFormObs(llamada.observaciones || "")
      setActionOpen({ type: "reagendar", llamada })
      return
    }

    if (action === "observaciones") {
      setFormObs("")
      setActionOpen({ type: "observaciones", llamada })
      return
    }

    if (!llamada?.prospect?.id) {
      alert("Esta llamada no tiene prospecto asociado. No se puede ejecutar esta acción.")
      return
    }

    if (action === "agendar_cita") {
      setActionOpen({ type: "agendar_cita", llamada })
      return
    }
    if (action === "vendido") {
      setActionOpen({ type: "vendido", llamada })
      return
    }
    if (action === "rechazado") {
      setActionOpen({ type: "rechazado", llamada })
      return
    }
    if (action === "ver_amigos") {
      setActionOpen({ type: "ver_amigos", llamada })
      refreshAmigos(llamada.prospect.id)
      return
    }
  }

  const closeCallAsDone = async (callId: number, note?: string) => {
    await apiPost(`/calls/${callId}/marcar-hecha`, {
      observaciones: note?.trim() || null,
    })
  }

  const submitAction = async () => {
    if (!actionOpen) return

    setSavingAction(true)
    try {
      if (actionOpen.type === "reagendar") {
        if (!formFecha || !formHora) {
          alert("Fecha y hora son obligatorias")
          return
        }
        await apiPost(`/calls/${actionOpen.llamada.id}/reagendar`, {
          fecha: formFecha,
          hora: formHora,
          observaciones: formObs?.trim() || null,
        })
      }

      // ✅ Observaciones: POST y luego refresca /history
      if (actionOpen.type === "observaciones") {
        const obs = formObs.trim()
        if (!obs) {
          alert("Escribe una observación")
          return
        }
        const prospectId = actionOpen.llamada.prospect?.id
        if (!prospectId) {
          alert("Esta llamada no tiene prospecto asociado.")
          return
        }

        await apiPost(`/prospects/${prospectId}/acciones`, {
          accion: "observaciones",
          observaciones: obs,
        })

        await refreshNotes(prospectId)

        // opcional si quieres que agregar obs cierre la llamada:
        // await closeCallAsDone(actionOpen.llamada.id, "Agregó observaciones desde llamada")
      }

      const prospectId = actionOpen.llamada.prospect?.id

      if (actionOpen.type === "agendar_cita") {
        if (!prospectId) {
          alert("Esta llamada no tiene prospecto asociado.")
          return
        }
        if (!formFecha || !formHora || !formUbicacion.trim()) {
          alert("Fecha, hora y ubicación son obligatorias")
          return
        }
        await apiPost(`/prospects/${prospectId}/acciones`, {
          accion: "agendar_cita",
          fecha: formFecha,
          hora: formHora,
          ubicacion: formUbicacion.trim(),
          observaciones: formObs?.trim() || null,
        })

        // ✅ CERRAR LLAMADA (IMPORTANTE)
        await closeCallAsDone(actionOpen.llamada.id, "Agendó cita desde llamada")
      }

      if (actionOpen.type === "vendido") {
        if (!prospectId) {
          alert("Esta llamada no tiene prospecto asociado.")
          return
        }
        const monto = Number(formMonto)
        if (!monto || monto <= 0) {
          alert("Ingresa un monto válido (sin IVA)")
          return
        }
        await apiPost(`/prospects/${prospectId}/acciones`, {
          accion: "vendido",
          monto_sin_iva: monto,
        })

        // ✅ CERRAR LLAMADA
        await closeCallAsDone(actionOpen.llamada.id, `Marcó vendido (sin IVA): ${monto}`)
      }

      if (actionOpen.type === "rechazado") {
        if (!prospectId) {
          alert("Esta llamada no tiene prospecto asociado.")
          return
        }
        await apiPost(`/prospects/${prospectId}/acciones`, {
          accion: "rechazado",
          motivo: formMotivo?.trim() || null,
        })

        // ✅ CERRAR LLAMADA
        await closeCallAsDone(
          actionOpen.llamada.id,
          `Marcó rechazado${formMotivo?.trim() ? `: ${formMotivo.trim()}` : ""}`
        )
      }

      setActionOpen(null)
      await refreshAll()
    } catch (e: any) {
      alert(e?.message || "No se pudo completar la acción")
    } finally {
      setSavingAction(false)
    }
  }

  // ====== Fetch lista/días/día ======
  useEffect(() => {
    let cancelled = false
    setLoadingList(true)
    setErrorList(null)

    const today = ymd(new Date())

    apiGet(`/calls/?from=${encodeURIComponent(today)}&limit=200&estado=pendiente`)
      .then((data) => {
        if (cancelled) return
        setLlamadas((data.llamadas || []) as LlamadaDTO[])
      })
      .catch((e) => {
        if (cancelled) return
        setErrorList(e.message || "Error cargando llamadas")
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const base = visibleMonth ?? new Date()
    const { from, to } = monthRange(base)

    setLoadingDays(true)

    apiGet(`/calls/days?from=${encodeURIComponent(ymd(from))}&to=${encodeURIComponent(ymd(to))}&estado=pendiente`)
      .then((data: DaysResponse) => {
        if (cancelled) return
        const s = new Set<string>()
        for (const d of data.days || []) s.add(d.day)
        setDiasConLlamadasSet(s)
      })
      .catch(() => {
        if (cancelled) return
        setDiasConLlamadasSet(new Set())
      })
      .finally(() => {
        if (!cancelled) setLoadingDays(false)
      })

    return () => {
      cancelled = true
    }
  }, [visibleMonth])

  useEffect(() => {
    let cancelled = false
    if (!date) {
      setLlamadasDelDia([])
      return
    }

    setLoadingDay(true)
    setErrorDay(null)

    apiGet(`/calls/?day=${encodeURIComponent(ymd(date))}&estado=pendiente`)
      .then((data) => {
        if (cancelled) return
        setLlamadasDelDia((data.llamadas || []) as LlamadaDTO[])
      })
      .catch((e) => {
        if (cancelled) return
        setErrorDay(e.message || "Error cargando llamadas del día")
      })
      .finally(() => {
        if (!cancelled) setLoadingDay(false)
      })

    return () => {
      cancelled = true
    }
  }, [date])

  // ====== Derived ======
  const llamadasOrdenadas = useMemo(() => {
    return [...llamadas].sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora))
  }, [llamadas])

  const llamadasListFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return llamadasOrdenadas
    return llamadasOrdenadas.filter((c) => {
      const nombre = c.prospect?.nombre ?? ""
      const numero = c.prospect?.numero ?? ""
      const obs = c.observaciones ?? ""
      return `${nombre} ${numero} ${obs}`.toLowerCase().includes(q)
    })
  }, [llamadasOrdenadas, search])

  const modifiers = useMemo(
    () => ({
      scheduled: (day: Date) => diasConLlamadasSet.has(ymd(day)),
    }),
    [diasConLlamadasSet]
  )

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Llamadas</h1>
          <p className="text-muted-foreground">Gestiona tus llamadas programadas con vista de lista y calendario</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4 sm:space-y-6">
          <div className="flex justify-start">
            <TabsList className="inline-flex w-fit gap-1 rounded-full bg-muted p-1">
              <TabsTrigger value="list" className="px-4 py-2 rounded-full">
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendar" className="px-4 py-2 rounded-full">
                Calendario
              </TabsTrigger>
            </TabsList>
          </div>

          {/* LISTA */}
          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Próximas llamadas</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {loadingList ? "Cargando..." : `${llamadasOrdenadas.length} llamadas`}
                  </div>
                  <div className="w-full sm:w-[360px]">
                    <Input
                      placeholder="Buscar por nombre, número u observaciones…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                {errorList ? <div className="text-sm text-red-500">{errorList}</div> : null}
              </CardContent>
            </Card>

            {loadingList ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Cargando llamadas…</CardContent>
              </Card>
            ) : llamadasListFiltradas.length > 0 ? (
              <div className="grid gap-3 sm:gap-4">
                {llamadasListFiltradas.map((llamada) => (
                  <Card
                    key={llamada.id}
                    className="hover:border-primary/50 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => openLlamada(llamada.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openLlamada(llamada.id)
                    }}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                                {llamada.prospect?.nombre ?? "—"}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="truncate">
                                  {llamada.prospect?.numero ?? "—"}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {llamada.estado}
                                </Badge>
                              </div>
                            </div>

                            {llamada.estado === "pendiente" ? (
                              <LlamadaActionsMenu onAction={(a) => onLlamadaAction(a, llamada)} />
                            ) : null}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              <span className="truncate">
                                {formatFechaCorta(llamada.fecha_hora)} • {formatHora(llamada.fecha_hora)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 min-w-0">
                              <Phone className="h-4 w-4" />
                              <span className="truncate">Llamada programada</span>
                            </div>
                          </div>

                          {llamada.observaciones ? (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <StickyNote className="h-4 w-4 mt-0.5" />
                              <span className="line-clamp-2">{llamada.observaciones}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground italic">No hay llamadas próximas.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* CALENDARIO */}
          <TabsContent value="calendar">
            <div className="grid lg:grid-cols-[360px_1fr] gap-4 sm:gap-6 items-start">
              <Card className="lg:sticky lg:top-6">
                <CardHeader className="py-4">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Seleccionar fecha</span>
                    {loadingDays ? <span className="text-xs text-muted-foreground">Cargando…</span> : null}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex justify-center pb-6">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    className="rounded-md border w-full"
                    modifiers={modifiers}
                    modifiersClassNames={{
                      scheduled:
                        "relative font-semibold text-primary after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
                    }}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4 min-h-[520px]">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Phone className="h-5 w-5" />
                      Llamadas del {formatDiaLargo(date)}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {loadingDay ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">Cargando llamadas del día…</CardContent>
                  </Card>
                ) : errorDay ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-red-500">{errorDay}</CardContent>
                  </Card>
                ) : llamadasDelDia.length > 0 ? (
                  <div className="grid gap-3 sm:gap-4">
                    {llamadasDelDia
                      .slice()
                      .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora))
                      .map((llamada) => (
                        <Card
                          key={llamada.id}
                          className="hover:border-primary/50 transition-colors cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onClick={() => openLlamada(llamada.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openLlamada(llamada.id)
                          }}
                        >
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                                      {llamada.prospect?.nombre ?? "—"}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary">{llamada.prospect?.numero ?? "—"}</Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {llamada.estado}
                                      </Badge>
                                    </div>
                                  </div>

                                  {llamada.estado === "pendiente" ? (
                                    <LlamadaActionsMenu onAction={(a) => onLlamadaAction(a, llamada)} />
                                  ) : null}
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-semibold text-foreground">{formatHora(llamada.fecha_hora)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span className="truncate">Llamada programada</span>
                                  </div>
                                </div>

                                {llamada.observaciones ? (
                                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <StickyNote className="h-4 w-4 mt-0.5" />
                                    <span className="line-clamp-2">{llamada.observaciones}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
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

      {/* ✅ MODAL DETALLE (SCROLL SIEMPRE) */}
      <Dialog open={!!openLlamadaId} onOpenChange={(v) => !v && setOpenLlamadaId(null)}>
        <DialogContent
          className="
            p-0 overflow-hidden
            w-[96vw] sm:w-full max-w-2xl
            h-[88vh] sm:h-[80vh] lg:h-[78vh]
            rounded-xl
          "
        >
          {/* header fijo */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
            <div className="flex items-center justify-between gap-2 p-4 sm:p-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg sm:text-xl">Detalle de la llamada</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Información del prospecto y la llamada programada
                </DialogDescription>
              </DialogHeader>

              <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={() => setOpenLlamadaId(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* cuerpo con scroll: height = total - header */}
          <ScrollArea className="h-[calc(88vh-88px)] sm:h-[calc(80vh-96px)] lg:h-[calc(78vh-96px)]">
            <div className="p-4 sm:p-6 space-y-4">
              {!selectedLlamada ? (
                <div className="text-sm text-muted-foreground">Cargando…</div>
              ) : (
                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Prospecto</div>
                      <div className="font-semibold text-lg truncate">{selectedLlamada.prospect?.nombre ?? "—"}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className="truncate">
                          {selectedLlamada.prospect?.numero ?? "—"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {selectedLlamada.estado}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      <div className="flex items-start gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground text-xs">Fecha</div>
                          <div className="font-medium">{formatFechaCorta(selectedLlamada.fecha_hora)}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground text-xs">Hora</div>
                          <div className="font-medium">{formatHora(selectedLlamada.fecha_hora)}</div>
                        </div>
                      </div>

                      {selectedLlamada.observaciones ? (
                        <div className="flex items-start gap-2 text-sm sm:col-span-2">
                          <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="text-muted-foreground text-xs">Observaciones de la llamada</div>
                            <div className="whitespace-pre-wrap break-words">{selectedLlamada.observaciones}</div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* ✅ HISTORIAL DE NOTAS DEL PROSPECTO (REAL: /history) */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Historial de notas del prospecto</div>

                      {loadingNotes ? (
                        <div className="text-sm text-muted-foreground">Cargando notas…</div>
                      ) : errorNotes ? (
                        <div className="text-sm text-red-500">{errorNotes}</div>
                      ) : prospectNotes.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">No hay notas registradas.</div>
                      ) : (
                        <div className="space-y-2">
                          {prospectNotes.map((n) => (
                            <div key={n.id} className="rounded-md border p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium truncate">{getAutor(n)}</div>
                                <div className="text-xs text-muted-foreground">{formatFechaHora(n.created_at)}</div>
                              </div>
                              <div className="mt-2 text-sm whitespace-pre-wrap break-words">{n.detalle}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button variant="destructive" onClick={() => setOpenLlamadaId(null)}>
                        Cerrar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* MODAL ACCIONES */}
      <Dialog
        open={!!actionOpen}
        onOpenChange={(v) => {
          if (!v) setActionOpen(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionOpen?.type === "reagendar"
                ? "Reagendar llamada"
                : actionOpen?.type === "agendar_cita"
                ? "Agendar cita"
                : actionOpen?.type === "vendido"
                ? "Marcar vendido"
                : actionOpen?.type === "rechazado"
                ? "Marcar rechazado"
                : actionOpen?.type === "ver_amigos"
                ? "Ver amigos"
                : "Agregar observaciones"}
            </DialogTitle>
            <DialogDescription>
              {actionOpen?.llamada?.prospect?.nombre ?? "—"} • {actionOpen?.llamada?.prospect?.numero ?? "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {actionOpen?.type === "observaciones" ? (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Agregar nueva observación</div>
                <Input value={formObs} onChange={(e) => setFormObs(e.target.value)} placeholder="Escribe una nota nueva..." />
                <div className="text-[11px] text-muted-foreground mt-1">Se guarda en el historial del prospecto.</div>
              </div>
            ) : null}

            {(actionOpen?.type === "reagendar" || actionOpen?.type === "agendar_cita") ? (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Fecha</div>
                    <div className="relative">
                      <Input
                        ref={dateInputRef}
                        type="date"
                        value={formFecha}
                        onChange={(e) => setFormFecha(e.target.value)}
                        className="pr-10 dark:[color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => openNativePicker(dateInputRef)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Seleccionar fecha"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Hora</div>
                    <div className="relative">
                      <Input
                        ref={timeInputRef}
                        type="time"
                        value={formHora}
                        onChange={(e) => setFormHora(e.target.value)}
                        className="pr-10 dark:[color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => openNativePicker(timeInputRef)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Seleccionar hora"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {actionOpen?.type === "agendar_cita" ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ubicación</div>
                    <Input
                      value={formUbicacion}
                      onChange={(e) => setFormUbicacion(e.target.value)}
                      placeholder="Ej: Casa del prospecto"
                    />
                  </div>
                ) : null}

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Observaciones (opcional)</div>
                  <Input value={formObs} onChange={(e) => setFormObs(e.target.value)} placeholder="Ej: Confirmar 1 hora antes..." />
                </div>
              </>
            ) : null}

            {actionOpen?.type === "vendido" ? (
              <Input
                inputMode="decimal"
                placeholder="Ej: 12000"
                value={formMonto}
                onChange={(e) => {
                  const raw = e.target.value
                  const cleaned = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1")
                  setFormMonto(cleaned)
                }}
              />
            ) : null}

            {actionOpen?.type === "rechazado" ? (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Motivo (opcional)</div>
                <Input
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Ej: No le interesa / sin presupuesto..."
                />
              </div>
            ) : null}

            {/* ✅ VER AMIGOS (REAL) */}
            {actionOpen?.type === "ver_amigos" ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  {loadingAmigos ? (
                    <div className="text-sm text-muted-foreground">Cargando…</div>
                  ) : errorAmigos ? (
                    <div className="text-sm text-red-500">{errorAmigos}</div>
                  ) : !amigosData ? (
                    <div className="text-sm text-muted-foreground">Sin datos.</div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Recomendado por</div>
                        {amigosData.recomendado_por ? (
                          <div className="text-sm font-medium">
                            {amigosData.recomendado_por.nombre} • {amigosData.recomendado_por.numero}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">Nadie</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Recomendados</div>
                        {amigosData.recomendados.length === 0 ? (
                          <div className="text-sm text-muted-foreground italic">No ha recomendado a nadie.</div>
                        ) : (
                          <div className="space-y-2">
                            {amigosData.recomendados.map((r: any) => (
                              <div key={r.id} className="rounded-md border p-2 text-sm">
                                <div className="font-medium">{r.nombre}</div>
                                <div className="text-muted-foreground">{r.numero}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* ✅ FOOTER: si es ver_amigos, solo cerrar */}
            {actionOpen?.type === "ver_amigos" ? (
              <div className="flex justify-end pt-2">
                <Button variant="ghost" onClick={() => setActionOpen(null)}>
                  Cerrar
                </Button>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setActionOpen(null)} disabled={savingAction}>
                  Cancelar
                </Button>
                <Button onClick={submitAction} disabled={savingAction}>
                  {savingAction ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}