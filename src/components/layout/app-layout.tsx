"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Menu } from "lucide-react"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <div className="hidden h-full shrink-0 md:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
          <div className="h-14 px-4 flex items-center gap-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </DialogTrigger>

              <DialogContent
                showCloseButton={false}
                className="left-0 top-0 h-[100dvh] max-h-none w-72 max-w-[88vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 p-0 shadow-2xl sm:w-72 sm:max-w-[88vw] sm:p-0"
              >
                <DialogTitle className="sr-only">Menú principal</DialogTitle>
                <DialogDescription className="sr-only">
                  Navegación del sistema Pulso
                </DialogDescription>
                <Sidebar
                  onNavigate={() => setOpen(false)}
                  onClose={() => setOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <div className="font-semibold">Pulso</div>
          </div>
        </div>

        {/* Content */}
        <main className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
