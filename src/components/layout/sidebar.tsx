"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"

const menuItems = [
  { href: "/prospectos", label: "Prospectos", icon: Users },
  { href: "/citas", label: "Citas", icon: Calendar },
  { href: "/seguimiento", label: "Seguimiento", icon: TrendingUp },
  { href: "/llamadas", label: "Llamadas", icon: Phone },
  { href: "/rechazados", label: "Rechazados", icon: XCircle },
  { href: "/anexados", label: "Anexados", icon: Archive, leaderOnly: true },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3, leaderOnly: true },
  { href: "/colaboradores", label: "Colaboradores", icon: UserCog, leaderOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  // TODO: Replace with actual user role from your API
  const isLeader = true

  return (
    <aside className="w-72 border-r border-sidebar-border bg-sidebar flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Activity className="relative h-9 w-9 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight">Pulso</h1>
            <p className="text-xs text-muted-foreground">CRM Profesional</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          if (item.leaderOnly && !isLeader) return null

          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href}>
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
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <p className="text-xs text-muted-foreground mb-1">Usuario</p>
          <p className="text-sm font-semibold text-sidebar-foreground">Admin</p>
          <p className="text-xs text-muted-foreground">Líder de equipo</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-10"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
