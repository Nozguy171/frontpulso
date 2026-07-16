"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { cn } from "@/lib/utils"
import {
  Users,
  Calendar,
  TrendingUp,
  Phone,
  XCircle,
  Archive,
  History,
  UserCog,
  LogOut,
  Activity,
  BarChart3,
  UserCheck,
  UserX,
  Palette,
  Settings,
  ShieldCheck,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { API_BASE_URL } from "@/lib/api"
import { clearActing as clearActingLS, getActingId, onActingChange } from "@/lib/acting"
import { PULSO_ADMIN_ENABLED } from "@/lib/features"

const menuItems = [
  { href: "/prospectos", label: "Prospectos", icon: Users },
  { href: "/citas", label: "Citas", icon: Calendar },
  { href: "/seguimiento", label: "Seguimiento", icon: TrendingUp },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/llamadas", label: "Llamadas", icon: Phone },
  { href: "/rechazados", label: "Rechazados", icon: XCircle },

  // leader only
  { href: "/anexados", label: "Anexados", icon: Archive, leaderOnly: true },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/colaboradores", label: "Colaboradores", icon: UserCog, leaderOnly: true },
  { href: "/admin", label: "Administración", icon: ShieldCheck, adminOnly: true },
]

const DEFAULT_THEME = "royal-sapphire"
const themes = [
  { id: "royal-emerald", label: "Rey esmeralda", colors: ["#d6ad50", "#21a36f", "#38bdf8", "#f472b6", "#091713"] },
  { id: "royal-amethyst", label: "Rey amatista", colors: ["#d2aa52", "#8b5cf6", "#f472b6", "#22d3ee", "#130d24"] },
  { id: "royal-sapphire", label: "Rey zafiro", colors: ["#d9b75d", "#3b82f6", "#22d3ee", "#fb7185", "#071226"] },
  { id: "royal-ivory", label: "Rey marfil", colors: ["#946b24", "#183b6b", "#0f766e", "#be123c", "#f6efdf"] },
]
const themeIds = themes.map((item) => item.id)

type MeUser = {
  id: number
  email: string
  role?: string | null
  tenant_id?: number | null
  theme?: string | null
  is_platform_admin?: boolean
}

type ListUsersResp = {
  users: { id: number; email: string }[]
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
  const txt = await res.text()
  if (!res.ok) throw new Error(txt || "Error")
  return txt ? JSON.parse(txt) : {}
}

async function apiPatch(path: string, body: unknown) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { ...getAuthAndActingHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const txt = await res.text()
  const data = txt ? JSON.parse(txt) : {}
  if (!res.ok) throw new Error(data?.message || "Error")
  return data
}

function normalizeRoleLabel(role?: string | null) {
  const r = (role || "").toLowerCase()
  if (r === "leader" || r === "lider" || r === "admin") return "Líder"
  if (r === "collaborator" || r === "colaborador") return "Colaborador"
  return role || "—"
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  const [me, setMe] = useState<MeUser | null>(null)
  const [loadingMe, setLoadingMe] = useState(false)

  const [actingId, setActingId] = useState<string>("")
  const [actingEmail, setActingEmail] = useState<string>("")
  const [loadingActing, setLoadingActing] = useState(false)
  const [theme, setTheme] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState("")
  const [settingsMessage, setSettingsMessage] = useState("")

  const isLeader = useMemo(() => {
    const rol = (me?.role || "").toLowerCase()
    return rol === "leader" || rol === "lider" || rol === "admin"
  }, [me])

  const logout = () => {
    try {
      localStorage.clear()
    } catch {}
    router.push("/")
  }

  const applyTheme = (value: string, remember = true) => {
    const next = themeIds.includes(value) ? value : DEFAULT_THEME
    document.documentElement.dataset.theme = next
    document.body.dataset.theme = next
    if (remember) localStorage.setItem("pulso_theme", next)
    setTheme(next)
  }

const saveSettings = async (event: FormEvent) => {
  event.preventDefault()
  setSavingSettings(true)
  setSettingsError("")
  setSettingsMessage("")
  try {
    const data = await apiPatch("/users/me/settings", {
      theme,
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    })
    const nextTheme = data?.user?.theme || theme
    applyTheme(nextTheme)
    setMe((prev) => prev ? { ...prev, theme: nextTheme } : prev)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setSettingsMessage("Ajustes guardados.")
  } catch (e) {
    setSettingsError(e instanceof Error ? e.message : "No se pudo guardar.")
  } finally {
    setSavingSettings(false)
  }
}

const clearActing = () => {
  clearActingLS()
  setActingId("")
  setActingEmail("")
  setLoadingActing(false)
  window.location.reload()
}

  useEffect(() => {
    let cancelled = false
    setLoadingMe(true)

    apiGet(`/users/me`)
      .then((data) => {
        if (cancelled) return
        const u = (data?.user ?? data) as MeUser
        setMe(u)
        applyTheme(u.theme || localStorage.getItem("pulso_theme") || DEFAULT_THEME)
      })
      .catch(() => {
        if (cancelled) return
        setMe(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingMe(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    applyTheme(localStorage.getItem("pulso_theme") || DEFAULT_THEME, false)
  }, [])

  useEffect(() => {
    const sync = () => {
      setActingId(getActingId())
      setActingEmail(localStorage.getItem("pulso_acting_email") || "")
    }
    sync()
    const off = onActingChange(sync)
    return () => off()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadActingEmail() {
      if (!isLeader) {
        setActingEmail("")
        setLoadingActing(false)
        return
      }

      if (!actingId) {
        setActingEmail("")
        setLoadingActing(false)
        return
      }

      const cached = localStorage.getItem("pulso_acting_email")
      if (cached) {
        setActingEmail(cached)
        setLoadingActing(false)
        return
      }

      setLoadingActing(true)
      try {
        const data = (await apiGet(`/users/`)) as ListUsersResp
        const u = (data?.users || []).find((x) => String(x.id) === String(actingId))
        if (cancelled) return
        setActingEmail(u?.email || `ID ${actingId}`)
      } catch {
        if (cancelled) return
        setActingEmail(`ID ${actingId}`)
      } finally {
        if (!cancelled) setLoadingActing(false)
      }
    }

    loadActingEmail()
    return () => {
      cancelled = true
    }
  }, [isLeader, actingId])

  const actingLine = useMemo(() => {
    if (!isLeader) return null
    if (!actingId) return { mode: "normal" as const, text: "Cuenta normal", icon: UserX }

    return {
      mode: "acting" as const,
      text: loadingActing ? "Actuando como: cargando…" : `Actuando como: ${actingEmail || `ID ${actingId}`}`,
      icon: UserCheck,
    }
  }, [isLeader, actingId, actingEmail, loadingActing])

  const ActingIcon = actingLine?.icon

  return (
    <aside className="w-full md:w-72 border-r border-sidebar-border bg-sidebar flex flex-col h-[100dvh]">
      {/* Top */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Activity className="relative h-9 w-9 text-primary" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight">Pulso</h1>
            <p className="text-xs text-muted-foreground">CRM Profesional</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-4">
        {menuItems.map((item) => {
          if (item.leaderOnly && !isLeader) return null
          if (item.adminOnly && (!PULSO_ADMIN_ENABLED || !me?.is_platform_admin)) return null

          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href} onClick={() => onNavigate?.()}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11 text-[15px] font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border shadow-sm"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="truncate">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <p className="text-xs text-muted-foreground mb-1">Usuario</p>

          <p className="text-sm font-semibold text-sidebar-foreground truncate">
            {loadingMe ? "Cargando…" : me?.email ?? "—"}
          </p>

          <p className="text-xs text-muted-foreground mt-1 truncate">{normalizeRoleLabel(me?.role)}</p>

          {actingLine ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
                {ActingIcon ? <ActingIcon className="h-3 w-3 shrink-0" /> : null}
                <span className="truncate">{actingLine.text}</span>
              </div>

              {actingLine.mode === "acting" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px] shrink-0"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    clearActing()
                  }}
                >
                  Volver
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-3 h-10">
              <Settings className="h-[18px] w-[18px]" />
              Ajustes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajustes</DialogTitle>
              <DialogDescription>Estilo y contraseña de esta cuenta.</DialogDescription>
            </DialogHeader>

            <form className="space-y-5" onSubmit={saveSettings} autoComplete="off">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Palette className="h-4 w-4" />
                  Estilo
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {themes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyTheme(item.id, false)}
                      className={cn(
                        "h-10 rounded-md border px-2 text-xs flex items-center gap-2 hover:bg-accent hover:text-accent-foreground",
                        theme === item.id ? "border-primary bg-accent text-accent-foreground" : "border-border text-foreground",
                      )}
                    >
                      <span className="flex -space-x-1">
                        {item.colors.map((color) => (
                          <span key={color} className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="current-password">Contraseña actual</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>

              {settingsError ? <p className="text-sm text-destructive">{settingsError}</p> : null}
              {settingsMessage ? <p className="text-sm text-muted-foreground">{settingsMessage}</p> : null}

              <Button type="submit" className="w-full" disabled={savingSettings}>
                {savingSettings ? "Guardando..." : "Guardar ajustes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-10"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
