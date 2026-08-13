import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClientShell } from "@/components/layout/client-shell"
import Script from "next/script"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-pulso-sans" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Pulso - Sistema de Gestión de Prospectos",
  description: "Gestiona tus prospectos, citas y ventas de manera eficiente con Pulso CRM",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Script id="pulso-ui-version" strategy="beforeInteractive">{`
          try {
            var version = localStorage.getItem('pulso_ui_version') || 'classic';
            document.documentElement.dataset.uiVersion = version;
          } catch (_) {}
        `}</Script>
        <ClientShell>{children}</ClientShell>
        <Analytics />
      </body>
    </html>
  )
}
