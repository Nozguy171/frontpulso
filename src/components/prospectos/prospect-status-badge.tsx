"use client"

import { Badge } from "@/components/ui/badge"

type ProspectStatus = {
  estado?: string | null
  venta_monto_sin_iva?: number | null
  seguimiento_activo?: boolean | null
  seguimiento_pausado?: boolean | null
  seguimiento_fecha_base?: string | null
}

export function ProspectStatusBadge({ prospect }: { prospect?: ProspectStatus | null }) {
  if (prospect?.venta_monto_sin_iva == null) return null

  const active =
    prospect.seguimiento_activo ??
    ((prospect.estado ?? "").toLowerCase() === "seguimiento" &&
      !!prospect.seguimiento_fecha_base &&
      !prospect.seguimiento_pausado)

  return (
    <Badge
      variant="outline"
      className={
        active
          ? "gap-1.5 border-emerald-600 bg-emerald-600 text-white"
          : "gap-1.5 border-emerald-600 text-emerald-700 dark:text-emerald-400"
      }
    >
      <span className={active ? "h-2 w-2 rounded-[2px] bg-current" : "h-2 w-2 rounded-[2px] border border-current"} />
      {active ? "Seguimiento" : "Vendido"}
    </Badge>
  )
}
