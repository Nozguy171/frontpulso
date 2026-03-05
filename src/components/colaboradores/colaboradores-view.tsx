"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserCircle, MoreVertical, Copy, UserCheck } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { API_BASE_URL } from "@/lib/api"
import { clearActing as clearActingLS, getActingId, onActingChange, setActing as setActingLS } from "@/lib/acting"

type Usuario = {
  id: number
  email: string
  nombre?: string | null
  role?: string | null
  tenant_id?: number | null
}

type ColaboradorRow = {
  id: number
  email: string
  role: string
  created_at?: string | null
  nombre?: string | null
  prospectos?: number
  ventas?: number
}

type InviteResponse = {
  invite: {
    token: string
    expires_at?: string | null
    max_uses?: number | null
    uses?: number | null
  }
}

type LimitsResponse = {
  limits: {
    plan?: string | null
    collaborator_limit: number
    collaborators_used: number
    collaborators_remaining: number
  }
}

function getAuthAndActingHeaders() {
  const token = localStorage.getItem("pulso_token")
  const acting = localStorage.getItem("pulso_acting_user_id")
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(acting ? { "X-Acting-As-User": acting } : {}),
  } as Record<string, string>
}

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthAndActingHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthAndActingHeaders(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function formatFechaCorta(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" })
}

function safeParseJsonMessage(txt: string) {
  try {
    const obj = JSON.parse(txt)
    return obj?.message || txt
  } catch {
    return txt
  }
}

export function ColaboradoresView() {
  const [me, setMe] = useState<Usuario | null>(null)
  const [loadingMe, setLoadingMe] = useState(false)

  const [limits, setLimits] = useState<LimitsResponse["limits"] | null>(null)
  const [loadingLimits, setLoadingLimits] = useState(false)

  const [items, setItems] = useState<ColaboradorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")

  // acting info
  const [actingId, setActingId] = useState<string>("")

  // invite link
  const [invite, setInvite] = useState<InviteResponse["invite"] | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string>("")
  const [creatingInvite, setCreatingInvite] = useState(false)

  const isLeader = useMemo(() => {
    const role = (me?.role || "").toLowerCase()
    return role === "leader" || role === "admin"
  }, [me])

  const actingUser = useMemo(() => {
    if (!actingId) return null
    return items.find((u) => String(u.id) === String(actingId)) ?? null
  }, [items, actingId])

  const loadMe = async () => {
    setLoadingMe(true)
    try {
      const data = await apiGet(`/users/me`)
      setMe((data?.user ?? data) as Usuario)
    } catch {
      setMe(null)
    } finally {
      setLoadingMe(false)
    }
  }

  const loadLimits = async () => {
    setLoadingLimits(true)
    try {
      const data = (await apiGet(`/users/limits`)) as LimitsResponse
      setLimits(data?.limits ?? null)
    } catch {
      setLimits(null)
    } finally {
      setLoadingLimits(false)
    }
  }

  const loadCollaborators = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/users/collaborators?limit=500`)
      const rows = (data?.colaboradores ?? []) as ColaboradorRow[]
      setItems(
        rows.map((r) => ({
          ...r,
          nombre: r.nombre ?? r.email?.split("@")?.[0] ?? "—",
          prospectos: typeof r.prospectos === "number" ? r.prospectos : 0,
          ventas: typeof r.ventas === "number" ? r.ventas : 0,
          role: r.role ?? "collaborator",
        })),
      )
    } catch (e: any) {
      setError(safeParseJsonMessage(e?.message || "Error cargando colaboradores"))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const loadAll = async () => {
    setInvite(null)
    setInviteUrl("")
    await loadMe()
    await loadLimits()
    await loadCollaborators()
  }

  useEffect(() => {
    const sync = () => setActingId(getActingId())
    sync()
    const off = onActingChange(sync)
    loadAll()
    return () => off()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) => `${c.nombre ?? ""} ${c.email} ${c.role}`.toLowerCase().includes(q))
  }, [items, search])

  const usedSlotsText = useMemo(() => {
    if (!limits) return "—"
    return `${limits.collaborators_used}/${limits.collaborator_limit} usados`
  }, [limits])

  const canCreateMoreUsers = useMemo(() => {
    if (!limits) return true
    return (limits.collaborators_remaining ?? 0) > 0
  }, [limits])

  const setActingAs = async (userId: number) => {
    try {
      await apiPost(`/users/acting-as`, { user_id: userId })
      const email = items.find((x) => x.id === userId)?.email
      setActingLS(String(userId), email)
      setActingId(String(userId))
      await loadAll()
    } catch (e: any) {
      alert(safeParseJsonMessage(e?.message || "No se pudo activar acting-as"))
    }
  }

  const clearActing = async () => {
    clearActingLS()
    setActingId("")
    await loadAll()
  }

  const createInvite = async () => {
    setCreatingInvite(true)
    try {
      const data = (await apiPost(`/invites/`, {})) as InviteResponse
      const inv = (data?.invite ?? null) as InviteResponse["invite"] | null
      setInvite(inv)

      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const url = inv?.token ? `${origin}/auth/signup-collaborator?token=${encodeURIComponent(inv.token)}` : ""
      setInviteUrl(url)
    } catch (e: any) {
      alert(safeParseJsonMessage(e?.message || "No se pudo generar el link"))
    } finally {
      setCreatingInvite(false)
    }
  }

  const copyInvite = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      alert("Link copiado ✅")
    } catch {
      alert("No se pudo copiar (cópialo manual).")
    }
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground mt-1">Gestiona tu equipo de ventas</p>
        </div>

        {/* Registro + límites */}
        <Card className="mb-4">
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Registro de colaboradores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {loadingLimits ? "Cargando límites..." : limits ? usedSlotsText : "Límites: — (crea /api/users/limits para bloquear cupos)"}
                {limits ? (
                  <span className="ml-2">
                    • Restantes: <span className="font-semibold text-foreground">{limits.collaborators_remaining}</span>
                    {limits.plan ? <span className="ml-2 text-muted-foreground">• Plan: {limits.plan}</span> : null}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={createInvite} disabled={creatingInvite || !isLeader || !canCreateMoreUsers} className="h-10">
                  {creatingInvite ? "Generando..." : "Generar link de registro"}
                </Button>

                {inviteUrl ? (
                  <Button variant="outline" onClick={copyInvite} className="h-10">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar link
                  </Button>
                ) : null}
              </div>
            </div>

            {!loadingMe && !isLeader ? (
              <div className="text-sm text-red-500">
                Esta sección es solo para líder/admin (tu usuario actual tiene role: <b>{me?.role ?? "—"}</b>).
              </div>
            ) : null}

            {limits && limits.collaborators_remaining <= 0 ? (
              <div className="text-sm text-red-500">Límite de colaboradores alcanzado. El backend debe bloquear el signup-collaborator.</div>
            ) : null}

            {inviteUrl ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">Link de registro</div>
                <div className="break-all font-mono">{inviteUrl}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Expira: {formatFechaCorta(invite?.expires_at)}</span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Buscar */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <Input
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10"
            />
          </CardContent>
        </Card>

        {error ? (
          <Card className="mb-4">
            <CardContent className="p-4 text-sm text-red-500">{error}</CardContent>
          </Card>
        ) : null}

        {/* Lista */}
        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Cargando colaboradores…</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground italic">No hay colaboradores.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((colaborador) => {
              const isThisActing = !!actingId && actingId === String(colaborador.id)

              return (
                <Card key={colaborador.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-full bg-primary/10 shrink-0">
                          <UserCircle className="h-8 w-8 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{colaborador.nombre ?? "—"}</h3>
                          <p className="text-sm text-muted-foreground truncate">{colaborador.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">{colaborador.role}</Badge>
                            {isThisActing ? (
                              <Badge variant="secondary" className="gap-1">
                                <UserCheck className="h-3 w-3" />
                                Activo
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Acciones">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" className="w-72">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              disabled={!isLeader || isThisActing}
                              onSelect={(e) => {
                                e.preventDefault()
                                if (!isLeader || isThisActing) return
                                setActingAs(colaborador.id)
                              }}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              {isThisActing ? "Ya estás actuando como este usuario" : "Actuar como este usuario"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
                              (Luego) Reset password / bloquear
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{colaborador.prospectos ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Prospectos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">{colaborador.ventas ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Ventas</p>
                      </div>
                    </div>

                    {colaborador.created_at ? (
                      <div className="mt-3 text-xs text-muted-foreground">Creado: {formatFechaCorta(colaborador.created_at)}</div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}