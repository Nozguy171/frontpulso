"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";

function onlyDigitsMax10(v: string) {
  return (v ?? "").replace(/\D/g, "").slice(0, 10);
}

export default function SignupPage() {
  const router = useRouter();

  // OJO:
  // visualmente este campo será "Nombre completo",
  // pero en el request seguirá viajando como "email"
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [numeroTelefonico, setNumeroTelefonico] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("El nombre completo es obligatorio");
      return;
    }

    if (!username.trim()) {
      setError("El username es obligatorio");
      return;
    }

    if (!numeroTelefonico.trim()) {
      setError("El número telefónico es obligatorio");
      return;
    }

    if (numeroTelefonico.length !== 10) {
      setError("El número telefónico debe tener exactamente 10 dígitos");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(), // <- aquí realmente va el nombre completo
          username: username.trim(),
          numero_telefonico: numeroTelefonico,
          password,
          confirm_password: confirm,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setError(data.message ?? "Error al crear la cuenta");
      } else {
        if (data.access_token) {
          localStorage.setItem("pulso_token", data.access_token);
        }
        router.push("/prospectos");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const numeroInvalido =
    numeroTelefonico.length > 0 && numeroTelefonico.length !== 10;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-4 shadow-xl sm:p-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold">P</span>
            </div>
            <span className="text-sm text-muted-foreground tracking-wide">
              Pulso CRM Profesional
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Crear cuenta de líder
          </h1>

          <p className="text-sm text-muted-foreground">
            Esta cuenta será el líder y podrá crear colaboradores más adelante.
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Nombre completo
            </label>
            <Input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ej: Juan Pérez López"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Username
            </label>
            <Input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ej: juanperez"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Número telefónico
            </label>
            <Input
              type="text"
              inputMode="numeric"
              required
              value={numeroTelefonico}
              onChange={(e) => setNumeroTelefonico(onlyDigitsMax10(e.target.value))}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="6861234567"
            />
            {numeroInvalido && (
              <p className="text-xs text-destructive">
                Debe tener exactamente 10 dígitos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Contraseña
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Confirmar contraseña
            </label>
            <Input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/40 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          ¿Ya tienes cuenta?{" "}
          <a
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
