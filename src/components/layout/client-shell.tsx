"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppLayout } from "./app-layout"

const plainRoutes = ["/", "/login", "/signup", "/auth/signup-collaborator"]

export function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (plainRoutes.includes(pathname)) return <>{children}</>
  return <AppLayout>{children}</AppLayout>
}
