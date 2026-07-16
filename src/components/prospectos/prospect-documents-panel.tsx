"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api"
import { Camera, FileText, Trash2, Upload } from "lucide-react"
import { ProspectTreatmentBadge } from "@/components/prospectos/prospect-treatment-badge"

type DocStatus = {
  type: string
  label: string
  uploaded: boolean
  id?: number | null
  filename?: string | null
}

type Payload = {
  prospecto: {
    id: number
    nombre: string
    trato_prospecto?: "enojado" | "feliz" | "neutral" | null
  }
  can_view: boolean
  can_delete: boolean
  documents: Record<string, DocStatus>
}

type PendingFile = {
  file: File
  previewUrl?: string
}

function getActingAsUserId() {
  const value = localStorage.getItem("pulso_acting_user_id")
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : null
}

function headers() {
  const token = localStorage.getItem("pulso_token")
  const acting = getActingAsUserId()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(acting ? { "X-Acting-As-User": acting } : {}),
  } as Record<string, string>
}

function keyFor(prospectId: number, type: string) {
  return `${prospectId}:${type}`
}

export function ProspectDocumentsPanel({ prospectId }: { prospectId: number }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [pending, setPending] = useState<Record<string, PendingFile>>({})
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const cameraInputs = useRef<Record<string, HTMLInputElement | null>>({})

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/documents/prospects/${prospectId}`, { headers: headers(), cache: "no-store" })
      const next = await res.json().catch(() => ({}))
      if (res.ok) setData(next)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [prospectId])

  function setSelectedFile(type: string, file?: File) {
    const k = keyFor(prospectId, type)
    setPending((prev) => {
      prev[k]?.previewUrl && URL.revokeObjectURL(prev[k].previewUrl)
      if (!file) {
        const next = { ...prev }
        delete next[k]
        return next
      }
      return {
        ...prev,
        [k]: { file, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined },
      }
    })
  }

  async function upload(type: string) {
    const k = keyFor(prospectId, type)
    const selected = pending[k]
    if (!selected) return

    setBusy(k)
    try {
      const body = new FormData()
      body.append("file", selected.file)
      const res = await fetch(`${API_BASE_URL}/documents/prospects/${prospectId}/${type}`, {
        method: "POST",
        headers: headers(),
        body,
      })
      const next = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(next?.message || "No se pudo subir")
      setSelectedFile(type)
      setData(next)
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo subir")
    } finally {
      setBusy("")
    }
  }

  async function openDocument(doc: DocStatus) {
    if (!doc.id) return
    const res = await fetch(`${API_BASE_URL}/documents/${doc.id}/download`, { headers: headers() })
    if (!res.ok) {
      alert("No se pudo abrir el documento")
      return
    }
    const blob = await res.blob()
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer")
  }

  async function deleteDocument(doc: DocStatus) {
    if (!doc.id || !window.confirm("¿Borrar este documento?")) return
    setBusy(`delete:${doc.id}`)
    try {
      const res = await fetch(`${API_BASE_URL}/documents/${doc.id}`, { method: "DELETE", headers: headers() })
      const next = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(next?.message || "No se pudo borrar")
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo borrar")
    } finally {
      setBusy("")
    }
  }

  const docs = Object.values(data?.documents || {})
  const uploadedCount = docs.filter((doc) => doc.uploaded).length

  return (
    <Card className="overflow-hidden border-border/70">
      <CardContent className="p-0">
        <div className="border-b bg-muted/25 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-base font-semibold">
                  Expediente de {data?.prospecto?.nombre ?? "prospecto"}
                </div>
                <div className="text-xs text-muted-foreground">INE, comprobantes y contrato del cliente vendido.</div>
                <ProspectTreatmentBadge prospect={data?.prospecto} className="mt-2" />
              </div>
            </div>
            {!loading ? (
              <Badge variant={uploadedCount === docs.length && docs.length ? "default" : "secondary"} className="w-fit">
                {uploadedCount} de {docs.length} cargados
              </Badge>
            ) : null}
          </div>
        </div>

        {loading ? <div className="p-5 text-sm text-muted-foreground">Cargando documentos...</div> : null}

        <div className="grid gap-4 p-4 sm:p-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
          {docs.map((doc) => {
            const k = keyFor(prospectId, doc.type)
            const selected = pending[k]
            return (
              <div key={doc.type} className="flex min-h-[230px] flex-col rounded-lg border bg-background p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm font-semibold leading-tight">{doc.label}</div>
                  <Badge variant={doc.uploaded ? "default" : "secondary"}>{doc.uploaded ? "Cargado" : "Falta"}</Badge>
                </div>

                {doc.uploaded ? (
                  <div className="flex flex-1 flex-col justify-between gap-4">
                    <div className="rounded-md border bg-muted/25 p-3">
                      <div className="mb-1 text-xs font-medium text-foreground">Archivo recibido</div>
                      <div className="break-words text-xs text-muted-foreground">
                        {data?.can_view ? doc.filename || "Archivo cargado" : "Ya tiene cargado este documento"}
                      </div>
                    </div>
                    {data?.can_view ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => openDocument(doc)}>Abrir</Button>
                        {data.can_delete ? (
                          <Button type="button" size="sm" variant="outline" className="sm:w-10" disabled={busy === `delete:${doc.id}`} onClick={() => deleteDocument(doc)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-3">
                    {selected?.previewUrl ? (
                      <img src={selected.previewUrl} alt="" className="h-32 w-full rounded-md border object-cover" />
                    ) : selected ? (
                      <div className="rounded-md border bg-muted/40 p-3 text-xs break-words">{selected.file.name}</div>
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 text-center">
                        <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                        <div className="text-xs font-medium">Archivo pendiente</div>
                        <div className="text-[11px] text-muted-foreground">PDF o imagen</div>
                      </div>
                    )}

                    <input
                      ref={(el) => { fileInputs.current[k] = el }}
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(event) => setSelectedFile(doc.type, event.target.files?.[0])}
                    />
                    <input
                      ref={(el) => { cameraInputs.current[k] = el }}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => setSelectedFile(doc.type, event.target.files?.[0])}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => fileInputs.current[k]?.click()}>
                        <Upload className="h-3.5 w-3.5" />
                        Archivo
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => cameraInputs.current[k]?.click()}>
                        <Camera className="h-3.5 w-3.5" />
                        Cámara
                      </Button>
                    </div>

                    {selected ? (
                      <div className="mt-auto grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Button type="button" size="sm" disabled={busy === k} onClick={() => upload(doc.type)}>
                          {busy === k ? "Subiendo..." : "Subir"}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedFile(doc.type)}>
                          Volver a tomar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProspectDocumentsDialog({
  prospecto,
  open,
  onOpenChange,
}: {
  prospecto: {
    id: number
    nombre?: string | null
    trato_prospecto?: "enojado" | "feliz" | "neutral" | null
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[95vw] max-w-none overflow-y-auto sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>Subir documentos</DialogTitle>
          <DialogDescription>
            {prospecto?.nombre ? `Expediente de ${prospecto.nombre}` : "Expediente del cliente vendido"}
          </DialogDescription>
          <ProspectTreatmentBadge prospect={prospecto} />
        </DialogHeader>
        {prospecto ? <ProspectDocumentsPanel prospectId={prospecto.id} /> : null}
      </DialogContent>
    </Dialog>
  )
}
