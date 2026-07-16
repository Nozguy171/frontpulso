"use client"

import { Frown, Meh, Smile } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ProspectTreatment = {
  trato_prospecto?: "enojado" | "feliz" | "neutral" | null
}

const treatments = {
  enojado: {
    label: "Enojado",
    Icon: Frown,
    className: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  feliz: {
    label: "Feliz",
    Icon: Smile,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  neutral: {
    label: "Neutral",
    Icon: Meh,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
} as const

export function ProspectTreatmentBadge({
  prospect,
  className,
}: {
  prospect?: ProspectTreatment | null
  className?: string
}) {
  const treatment = prospect?.trato_prospecto
  if (!treatment) return null

  const { label, Icon, className: color } = treatments[treatment]

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", color, className)}
      title={`Trato del prospecto: ${label}`}
      aria-label={`Trato del prospecto: ${label}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}
