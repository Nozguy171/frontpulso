"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Menu } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
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

<DialogContent className="p-0 w-72 max-w-[85vw] h-[100dvh] left-0 top-0 translate-x-0 translate-y-0 rounded-none border-r">
                <DialogHeader>
                  <VisuallyHidden>
                    <DialogTitle>Menú principal</DialogTitle>
                  </VisuallyHidden>
                  <VisuallyHidden>
                    <DialogDescription>Navegación del sistema Pulso</DialogDescription>
                  </VisuallyHidden>
                </DialogHeader>

                <Sidebar onNavigate={() => setOpen(false)} />
              </DialogContent>
            </Dialog>

            <div className="font-semibold">Pulso</div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}