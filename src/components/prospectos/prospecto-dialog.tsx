"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Frown, Meh, Smile } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import { formatProspectPhone } from "@/lib/prospect"
import { ProspectTreatmentBadge } from "@/components/prospectos/prospect-treatment-badge"

type Colaborador = {
  id: number
  email: string
  nombre?: string | null
  role?: string | null
}

type MeResponse = {
  id: number
  email: string
  nombre?: string | null
  role?: string | null
  tenant_id?: number | null
}

type RecomendadorItem = {
  id: number
  nombre: string
  numero: string
  lada?: string | null
  numero_formateado?: string | null
  numero_encuesta?: string | null
  trato_prospecto?: "enojado" | "feliz" | "neutral" | null
}

type FormaObtencion = "encuesta" | "referido" | "cita_en_frio" | "otro" | ""
type TratoProspecto = "enojado" | "feliz" | "neutral" | ""

const TRATOS_ENCUESTA = [
  {
    value: "enojado",
    label: "Enojado",
    Icon: Frown,
    color: "text-red-500",
    selected: "border-red-500 bg-red-500/10",
  },
  {
    value: "feliz",
    label: "Feliz",
    Icon: Smile,
    color: "text-emerald-500",
    selected: "border-emerald-500 bg-emerald-500/10",
  },
  {
    value: "neutral",
    label: "Neutral",
    Icon: Meh,
    color: "text-amber-400",
    selected: "border-amber-400 bg-amber-400/10",
  },
] as const

interface ProspectoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}

function getActingAsUserId(): string | null {
  const v = localStorage.getItem("pulso_acting_user_id")
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.trunc(n))
}

function isLeaderLike(role?: string | null) {
  const r = (role ?? "").toLowerCase()
  return r === "leader" || r === "admin" || r === "administrator" || r === "superadmin"
}

function onlyDigitsMax10(v: string) {
  return (v ?? "").replace(/\D/g, "").slice(0, 10)
}

function onlyDigitsMax5(v: string) {
  return (v ?? "").replace(/\D/g, "").slice(0, 5)
}

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "")
}

function getFormaObtencionTexto(
  tipo: FormaObtencion,
  otroTexto: string
): string | undefined {
  if (tipo === "encuesta") return "Encuesta"
  if (tipo === "referido") return "Referido"
  if (tipo === "cita_en_frio") return "Cita en frío"
  if (tipo === "otro") {
    const clean = otroTexto.trim()
    return clean || undefined
  }
  return undefined
}

export function ProspectoDialog({ open, onOpenChange, onSubmit }: ProspectoDialogProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    numero: "",
    lada: "",
    numeroEncuesta: "",
    tratoProspecto: "" as TratoProspecto,
    observaciones: "",
    recomendadoPorId: "",
    formaObtencionTipo: "" as FormaObtencion,
    formaObtencionOtro: "",
  })

  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<MeResponse | null>(null)

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [assignedToUserId, setAssignedToUserId] = useState<string>("")

  const [recoQuery, setRecoQuery] = useState("")
  const [recoLoading, setRecoLoading] = useState(false)
  const [recoResults, setRecoResults] = useState<RecomendadorItem[]>([])
  const [recoSelected, setRecoSelected] = useState<RecomendadorItem | null>(null)

  const actingAs = useMemo(() => {
    if (typeof window === "undefined") return null
    return getActingAsUserId()
  }, [open])

  const token = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("pulso_token")
  }, [open])

  const role = me?.role ?? null
  const myUserId = me?.id ?? null

  const leaderLike = isLeaderLike(role)
  const collaborator = (role ?? "").toLowerCase() === "collaborator"
  const isActingAs = !!actingAs

  const showAssignSelect = leaderLike
  const mustChooseAssignee = leaderLike && !isActingAs

  const phoneDigits = formData.numero
  const phoneOk = phoneDigits.length === 10

  const formaObtencionOk =
    !!formData.formaObtencionTipo &&
    (formData.formaObtencionTipo !== "otro" || !!formData.formaObtencionOtro.trim())

  const assignableUsers = useMemo(() => {
    const map = new Map<number, Colaborador>()

    if (me?.id) {
      map.set(me.id, {
        id: me.id,
        email: me.email,
        nombre: me.nombre,
        role: me.role,
      })
    }

    for (const c of colaboradores) {
      if (!map.has(c.id)) {
        map.set(c.id, c)
      }
    }

    return Array.from(map.values())
  }, [me, colaboradores])

  useEffect(() => {
    if (!open) return

    async function loadMe() {
      try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
          },
        })

        const data = (await res.json()) as any
        if (!res.ok) {
          console.error("users/me error", data)
          setMe(null)
          return
        }

        const payload = (data.user ?? data) as MeResponse
        setMe(payload)
      } catch (e) {
        console.error("users/me fetch error", e)
        setMe(null)
      }
    }

    loadMe()
  }, [open, token, actingAs])

  useEffect(() => {
    if (!open) return
    if (!me) return

    if (leaderLike && isActingAs && actingAs) {
      setAssignedToUserId(String(actingAs))
      return
    }

    if (leaderLike && !isActingAs) {
      setAssignedToUserId("")
      return
    }

    if (collaborator && myUserId) {
      setAssignedToUserId(String(myUserId))
      return
    }
  }, [open, me, leaderLike, isActingAs, actingAs, collaborator, myUserId])

  useEffect(() => {
    if (!open) return
    if (!leaderLike) return

    async function loadCols() {
      try {
        const res = await fetch(`${API_BASE_URL}/users/collaborators`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
          },
        })

        const text = await res.text()
        let data: any = {}
        try {
          data = text ? JSON.parse(text) : {}
        } catch {}

        if (!res.ok) {
          console.error("Error cargando colaboradores:", data)
          setColaboradores([])
          return
        }

        const list = (data.colaboradores ?? data.users ?? data.items ?? []) as Colaborador[]
        setColaboradores(list)
      } catch (e) {
        console.error("Error cargando colaboradores:", e)
        setColaboradores([])
      }
    }

    loadCols()
  }, [open, leaderLike, token, actingAs])

  useEffect(() => {
    if (!open) return
    const q = recoQuery.trim()
    if (!q) {
      setRecoResults([])
      return
    }

    let alive = true
    const t = setTimeout(async () => {
      try {
        setRecoLoading(true)
        const res = await fetch(
          `${API_BASE_URL}/prospects/recomendadores?q=${encodeURIComponent(q)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(actingAs ? { "X-Acting-As-User": actingAs } : {}),
            },
          }
        )

        const data = await res.json()
        if (!res.ok) throw new Error(data?.message ?? "Error buscando recomendadores")

        if (!alive) return
        setRecoResults((data.prospectos ?? []) as RecomendadorItem[])
      } catch (e) {
        console.error(e)
        if (!alive) return
        setRecoResults([])
      } finally {
        if (!alive) return
        setRecoLoading(false)
      }
    }, 250)

    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [recoQuery, open, token, actingAs])

  function selectRecomendador(p: RecomendadorItem) {
    setRecoSelected(p)
    setFormData((prev) => ({ ...prev, recomendadoPorId: String(p.id) }))
    setRecoQuery("")
    setRecoResults([])
  }

  const canSubmit = useMemo(() => {
    if (loading) return false
    if (!formData.nombre.trim()) return false
    if (!phoneOk) return false
    if (formData.formaObtencionTipo === "encuesta" && !formData.numeroEncuesta.trim()) return false
    if (formData.formaObtencionTipo === "encuesta" && !formData.tratoProspecto) return false
    if (formData.formaObtencionTipo === "referido" && !formData.recomendadoPorId) return false
    if (!formaObtencionOk) return false

    if (collaborator) return true
    if (leaderLike) {
      if (mustChooseAssignee) return !!assignedToUserId
      return !!assignedToUserId
    }

    return true
  }, [
    loading,
    formData.nombre,
    formData.numeroEncuesta,
    formData.tratoProspecto,
    formData.recomendadoPorId,
    formData.formaObtencionTipo,
    phoneOk,
    formaObtencionOk,
    collaborator,
    leaderLike,
    mustChooseAssignee,
    assignedToUserId,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)

    try {
      const actingAsHeader = getActingAsUserId()

      let assignee: number | undefined = undefined
      if (collaborator && myUserId) {
        assignee = myUserId
      } else if (assignedToUserId) {
        const n = Number(assignedToUserId)
        if (Number.isFinite(n) && n > 0) assignee = n
      }

      const formaObtencion = getFormaObtencionTexto(
        formData.formaObtencionTipo,
        formData.formaObtencionOtro
      )

      const res = await fetch(`${API_BASE_URL}/prospects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(actingAsHeader ? { "X-Acting-As-User": actingAsHeader } : {}),
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          numero: formData.numero,
          lada: formData.lada || undefined,
          numero_encuesta:
            formData.formaObtencionTipo === "encuesta" ? formData.numeroEncuesta.trim() : undefined,
          trato_prospecto:
            formData.formaObtencionTipo === "encuesta" ? formData.tratoProspecto : undefined,
          observaciones: formData.observaciones?.trim() || undefined,
          recomendado_por_id: formData.formaObtencionTipo !== "encuesta" && formData.recomendadoPorId
            ? Number(formData.recomendadoPorId)
            : undefined,
          assigned_to_user_id: assignee,
          forma_obtencion_tipo: formData.formaObtencionTipo || undefined,
          forma_obtencion: formaObtencion,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error(data)
        alert(data.message ?? "Error al crear el prospecto")
        return
      }

      onSubmit(data.prospecto)

      setFormData({
        nombre: "",
        numero: "",
        lada: "",
        numeroEncuesta: "",
        tratoProspecto: "",
        observaciones: "",
        recomendadoPorId: "",
        formaObtencionTipo: "",
        formaObtencionOtro: "",
      })
      setRecoSelected(null)
      setRecoQuery("")
      setRecoResults([])

      if (leaderLike && isActingAs && actingAs) setAssignedToUserId(String(actingAs))
      else if (leaderLike && !isActingAs) setAssignedToUserId("")
      else if (collaborator && myUserId) setAssignedToUserId(String(myUserId))

      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Error de conexión con el servidor")
    } finally {
      setLoading(false)
    }
  }

  const phoneHint =
    phoneDigits.length === 0
      ? ""
      : phoneOk
        ? "Número válido ✅"
        : ``

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[52rem] w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>Agregar Nuevo Prospecto</DialogTitle>
          <DialogDescription>
            {collaborator
              ? "Se asignará automáticamente a tu cuenta."
              : leaderLike && !isActingAs
                ? "Selecciona a quién se asignará."
                : leaderLike && isActingAs
                  ? "Puedes cambiar a quién se asigna (preseleccionado al usuario con el que estás actuando)."
                  : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-thin grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {showAssignSelect && (
              <div className="grid gap-2">
                <Label>Asignar a *</Label>
                <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        No hay usuarios disponibles
                      </SelectItem>
                    ) : (
                      assignableUsers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.id === myUserId
                            ? `${u.nombre ? `${u.nombre} — ${u.email}` : u.email} (yo)`
                            : u.nombre
                              ? `${u.nombre} — ${u.email}`
                              : u.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {mustChooseAssignee && !assignedToUserId && (
                  <p className="text-xs text-muted-foreground">
                    Debes seleccionar un usuario para continuar.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                autoComplete="new-password"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="numero">Lada y número (10 dígitos) *</Label>
              <div className="flex gap-2">
                <div className="flex w-24 items-center rounded-md border bg-background">
                  <span className="px-2 text-muted-foreground">+</span>
                  <Input
                    aria-label="Lada"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="new-password"
                    placeholder="52"
                    value={formData.lada}
                    onChange={(e) =>
                      setFormData({ ...formData, lada: onlyDigitsMax5(e.target.value) })
                    }
                    className="border-0 px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <Input
                  id="numero"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="new-password"
                  placeholder="Ej: 6861234567"
                  value={formData.numero}
                  onChange={(e) =>
                    setFormData({ ...formData, numero: onlyDigitsMax10(e.target.value) })
                  }
                  required
                />
              </div>
              <p className={`text-xs ${phoneOk ? "text-muted-foreground" : "text-destructive"}`}>
                {phoneHint}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Forma de obtención *</Label>

              <RadioGroup
                value={formData.formaObtencionTipo}
                onValueChange={(value: FormaObtencion) => {
                  setFormData((prev) => ({
                    ...prev,
                    formaObtencionTipo: value,
                    formaObtencionOtro: value === "otro" ? prev.formaObtencionOtro : "",
                    numeroEncuesta: value === "encuesta" ? prev.numeroEncuesta : "",
                    tratoProspecto: value === "encuesta" ? prev.tratoProspecto : "",
                    recomendadoPorId: value === "encuesta" ? "" : prev.recomendadoPorId,
                  }))
                  if (value === "encuesta") {
                    setRecoSelected(null)
                    setRecoQuery("")
                    setRecoResults([])
                  }
                }}
                className="flex flex-wrap items-center gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="encuesta" id="forma-encuesta" />
                  <Label htmlFor="forma-encuesta" className="cursor-pointer font-normal">
                    Encuesta
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="referido" id="forma-referido" />
                  <Label htmlFor="forma-referido" className="cursor-pointer font-normal">
                    Referido
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cita_en_frio" id="forma-cita-en-frio" />
                  <Label htmlFor="forma-cita-en-frio" className="cursor-pointer font-normal">
                    Cita en frío
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="otro" id="forma-otro" />
                  <Label htmlFor="forma-otro" className="cursor-pointer font-normal">
                    Otro
                  </Label>
                </div>
              </RadioGroup>

              {formData.formaObtencionTipo === "otro" && (
                <Input
                  placeholder="Escribe la forma de obtención..."
                  autoComplete="new-password"
                  value={formData.formaObtencionOtro}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      formaObtencionOtro: e.target.value,
                    }))
                  }
                />
              )}
            </div>

            {formData.formaObtencionTipo === "encuesta" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="numero-encuesta">Número de encuesta *</Label>
                  <Input
                    id="numero-encuesta"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="new-password"
                    value={formData.numeroEncuesta}
                    onChange={(e) =>
                      setFormData({ ...formData, numeroEncuesta: onlyDigits(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>¿Cómo te trató el prospecto? *</Label>
                  <RadioGroup
                    value={formData.tratoProspecto}
                    onValueChange={(value: TratoProspecto) =>
                      setFormData((prev) => ({ ...prev, tratoProspecto: value }))
                    }
                    className="grid grid-cols-3 gap-3"
                  >
                    {TRATOS_ENCUESTA.map(({ value, label, Icon, color, selected }) => (
                      <div key={value}>
                        <RadioGroupItem value={value} id={`trato-${value}`} className="sr-only" />
                        <Label
                          htmlFor={`trato-${value}`}
                          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                            formData.tratoProspecto === value
                              ? selected
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <Icon className={`h-10 w-10 ${color}`} />
                          <span>{label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}

            {formData.formaObtencionTipo !== "encuesta" && (
              <div className="grid gap-2">
                <Label>
                  Recomendado por{" "}
                  {formData.formaObtencionTipo === "referido" ? "*" : "(opcional)"}
                </Label>

                {recoSelected ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{recoSelected.nombre}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {formatProspectPhone(recoSelected)} • Encuesta:{" "}
                        {recoSelected.numero_encuesta ?? "—"} • ID {recoSelected.id}
                      </div>
                      <ProspectTreatmentBadge prospect={recoSelected} className="mt-2" />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRecoSelected(null)
                        setFormData((prev) => ({ ...prev, recomendadoPorId: "" }))
                      }}
                    >
                      Quitar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Buscar recomendador por nombre..."
                      autoComplete="new-password"
                      value={recoQuery}
                      onChange={(e) => setRecoQuery(e.target.value)}
                    />

                    <div className="rounded-md border">
                      <div className="scrollbar-thin max-h-52 overflow-auto overscroll-contain">
                        {recoLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
                        ) : recoQuery.trim() && recoResults.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">Sin resultados</div>
                        ) : (
                          recoResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectRecomendador(p)}
                              className="w-full border-b px-3 py-2 text-left hover:bg-muted/40 last:border-b-0"
                            >
                              <div className="font-medium">{p.nombre}</div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {formatProspectPhone(p)} • Encuesta: {p.numero_encuesta ?? "—"}{" "}
                                • ID {p.id}
                              </div>
                              <ProspectTreatmentBadge prospect={p} className="mt-2" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <input type="hidden" value={formData.recomendadoPorId} readOnly />
                  </>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                autoComplete="new-password"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
