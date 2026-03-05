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
import { API_BASE_URL } from "@/lib/api"

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
}

interface ProspectoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}

function getActingAsUserId(): string | null {
  const v = localStorage.getItem("pulso_acting_as_user_id")
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

export function ProspectoDialog({ open, onOpenChange, onSubmit }: ProspectoDialogProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    numero: "",
    observaciones: "",
    recomendadoPorId: "",
  })

  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<MeResponse | null>(null)

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [assignedToUserId, setAssignedToUserId] = useState<string>("")

  // ✅ buscador recomendador
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

  // --- phone validation ---
  const phoneDigits = formData.numero
  const phoneOk = phoneDigits.length === 10

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

  // ✅ Buscar recomendadores (debounce)
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

    if (collaborator) return true
    if (leaderLike) {
      if (mustChooseAssignee) return !!assignedToUserId
      return !!assignedToUserId
    }

    return true
  }, [loading, formData.nombre, phoneOk, collaborator, leaderLike, mustChooseAssignee, assignedToUserId])

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

      const res = await fetch(`${API_BASE_URL}/prospects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(actingAsHeader ? { "X-Acting-As-User": actingAsHeader } : {}),
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          numero: formData.numero, // ✅ solo dígitos y max 10
          observaciones: formData.observaciones?.trim() || undefined,
          recomendado_por_id: formData.recomendadoPorId ? Number(formData.recomendadoPorId) : undefined,
          assigned_to_user_id: assignee,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error(data)
        alert(data.message ?? "Error al crear el prospecto")
        return
      }

      onSubmit(data.prospecto)

      // reset form
      setFormData({
        nombre: "",
        numero: "",
        observaciones: "",
        recomendadoPorId: "",
      })
      setRecoSelected(null)
      setRecoQuery("")
      setRecoResults([])

      // reset selector
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
      ? "Ingresa 10 dígitos."
      : phoneOk
        ? "Número válido ✅"
        : `Te faltan ${10 - phoneDigits.length} dígitos (10 en total).`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Prospecto</DialogTitle>
          <DialogDescription>
            {collaborator
              ? "Se asignará automáticamente a tu cuenta."
              : leaderLike && !isActingAs
                ? "Selecciona a qué colaborador se asignará."
                : leaderLike && isActingAs
                  ? "Puedes cambiar a quién se asigna (preseleccionado al usuario con el que estás actuando)."
                  : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {showAssignSelect && (
              <div className="grid gap-2">
                <Label>Asignar a *</Label>
                <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona colaborador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        No hay colaboradores
                      </SelectItem>
                    ) : (
                      colaboradores.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre ? `${c.nombre} — ${c.email}` : c.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {mustChooseAssignee && !assignedToUserId && (
                  <p className="text-xs text-muted-foreground">
                    Debes seleccionar un colaborador para continuar.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="numero">Número (10 dígitos) *</Label>
              <Input
                id="numero"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="Ej: 6861234567"
                value={formData.numero}
                onChange={(e) =>
                  setFormData({ ...formData, numero: onlyDigitsMax10(e.target.value) })
                }
                required
              />
              <p className={`text-xs ${phoneOk ? "text-muted-foreground" : "text-destructive"}`}>
                {phoneHint}
              </p>
            </div>

            {/* ✅ Recomendado por con buscador */}
            <div className="grid gap-2">
              <Label>Recomendado por (opcional)</Label>

              {recoSelected ? (
                <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{recoSelected.nombre}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {recoSelected.numero} • ID {recoSelected.id}
                    </div>
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
                    value={recoQuery}
                    onChange={(e) => setRecoQuery(e.target.value)}
                  />

                  <div className="rounded-md border">
                    <div className="max-h-52 overflow-auto">
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
                            className="w-full text-left px-3 py-2 hover:bg-muted/40 border-b last:border-b-0"
                          >
                            <div className="font-medium">{p.nombre}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {p.numero} • ID {p.id}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* guardamos el id en formData.recomendadoPorId */}
                  <input type="hidden" value={formData.recomendadoPorId} readOnly />
                </>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
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