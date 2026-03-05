"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"

type InviteStatus =
  | { state: "loading" }
  | { state: "missing_token" }
  | { state: "valid"; expires_at?: string | null }
  | { state: "invalid"; message: string }

function formatFechaCorta(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" })
}

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" })
  const txt = await res.text()
  if (!res.ok) throw new Error(txt || "Error")
  return txt ? JSON.parse(txt) : {}
}

export default function SignupCollaboratorPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const token = useMemo(() => (sp.get("token") || "").trim(), [sp])

  const [inviteStatus, setInviteStatus] = useState<InviteStatus>({ state: "loading" })

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  // ✅ validar invite (recomendado)
  useEffect(() => {
    if (!token) {
      setInviteStatus({ state: "missing_token" })
      return
    }

    let cancelled = false
    setInviteStatus({ state: "loading" })

    apiGet(`/invites/${encodeURIComponent(token)}`)
      .then((data) => {
        if (cancelled) return
        // tu backend regresa: { valid: true, expires_at: "..." }
        if (data?.valid) {
          setInviteStatus({ state: "valid", expires_at: data?.expires_at ?? null })
        } else {
          setInviteStatus({ state: "invalid", message: data?.message || "Invitación inválida" })
        }
      })
      .catch((e) => {
        if (cancelled) return
        // si tu endpoint responde 404/410/409, aquí caerá (porque apiGet tira error).
        setInviteStatus({ state: "invalid", message: e?.message || "Invitación inválida" })
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOkMsg(null)

    if (!token) {
      setError("Falta el token de invitación.")
      return
    }
    if (!email.trim()) {
      setError("Correo obligatorio.")
      return
    }
    if (!password || !confirm) {
      setError("Contraseña y confirmación obligatorias.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    // si ya sabemos que es inválido, ni intentes
    if (inviteStatus.state === "invalid" || inviteStatus.state === "missing_token") {
      setError("La invitación no es válida.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup-collaborator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: email.trim().toLowerCase(),
          password,
          confirm_password: confirm,
        }),
      })

      const txt = await res.text()
      let data: any = {}
      try {
        data = txt ? JSON.parse(txt) : {}
      } catch {
        data = { message: txt }
      }

      if (!res.ok) {
        setError(data?.message || "No se pudo crear la cuenta.")
        return
      }

      if (data?.access_token) {
        localStorage.setItem("pulso_token", data.access_token)
      }
      // por si venían actuando como alguien
      localStorage.removeItem("pulso_acting_user_id")

      setOkMsg("Cuenta creada. Entrando…")
      router.push("/prospectos")
    } catch (err: any) {
      setError(err?.message || "Error de conexión con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  const disabled =
    loading ||
    inviteStatus.state === "loading" ||
    inviteStatus.state === "missing_token" ||
    inviteStatus.state === "invalid"

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold">P</span>
            </div>
            <span className="text-sm text-muted-foreground tracking-wide">Pulso CRM</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Registro de colaborador</h1>

          {inviteStatus.state === "loading" ? (
            <p className="text-sm text-muted-foreground">Validando invitación…</p>
          ) : inviteStatus.state === "missing_token" ? (
            <p className="text-sm text-destructive">Falta el token en el link.</p>
          ) : inviteStatus.state === "invalid" ? (
            <p className="text-sm text-destructive">{inviteStatus.message}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Invitación válida • expira: <span className="font-medium">{formatFechaCorta(inviteStatus.expires_at)}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="colaborador@ejemplo.com"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirmar contraseña</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
              disabled={disabled}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/40 rounded-md px-3 py-2">
              {error}
            </p>
          ) : null}

          {okMsg ? (
            <p className="text-sm text-green-600 bg-green-500/10 border border-green-500/30 rounded-md px-3 py-2">
              {okMsg}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={disabled}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          ¿Ya tienes cuenta?{" "}
          <a href="/auth/login" className="text-primary hover:underline font-medium">
            Inicia sesión
          </a>
        </p>

        {/* debug mínimo */}
        <div className="text-[11px] text-muted-foreground break-all">
          token: {token || "—"}
        </div>
      </div>
    </div>
  )
}