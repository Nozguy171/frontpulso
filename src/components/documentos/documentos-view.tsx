"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { API_BASE_URL } from "@/lib/api"
import { FileText, Upload } from "lucide-react"

type TemplateDoc = {
  id: number
  name: string
  description?: string | null
  filename?: string | null
  mime_type?: string | null
  uploaded_at?: string | null
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

function fmtDate(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
}

function TemplatePreview({ doc }: { doc: TemplateDoc }) {
  const [url, setUrl] = useState("")

  useEffect(() => {
    if (!doc.mime_type?.startsWith("image/")) {
      setUrl("")
      return
    }

    let alive = true
    let objectUrl = ""
    fetch(`${API_BASE_URL}/documents/templates/${doc.id}/download`, { headers: headers() })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || !alive) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => undefined)

    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [doc.id, doc.mime_type])

  if (url && doc.mime_type?.startsWith("image/")) {
    return <img src={url} alt="" className="h-44 w-full rounded-md border object-cover" />
  }

  return (
    <div className="flex h-44 items-center justify-center rounded-md border bg-muted/30">
      <div className="text-center">
        <FileText className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
        <div className="text-xs text-muted-foreground">{doc.mime_type === "application/pdf" ? "PDF listo para abrir" : "Vista previa no disponible"}</div>
      </div>
    </div>
  )
}

export function DocumentosView() {
  const [templates, setTemplates] = useState<TemplateDoc[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function load() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE_URL}/documents/templates`, { headers: headers(), cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "No se pudieron cargar formatos")
      setTemplates(data.templates || [])
      setCanManage(!!data.can_manage)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar formatos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function selectFile(next?: File | null) {
    const selected = next || null
    setFile(selected)
    if (selected && !name.trim()) setName(selected.name.replace(/\.[^.]+$/, ""))
  }

  async function upload() {
    if (!file) return
    setBusy(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("name", name)
      body.append("description", description)
      const res = await fetch(`${API_BASE_URL}/documents/templates`, {
        method: "POST",
        headers: headers(),
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "No se pudo subir")
      setTemplates(data.templates || [])
      setCanManage(!!data.can_manage)
      setName("")
      setDescription("")
      setFile(null)
      setFileInputKey((value) => value + 1)
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo subir")
    } finally {
      setBusy(false)
    }
  }

  async function openTemplate(doc: TemplateDoc) {
    const res = await fetch(`${API_BASE_URL}/documents/templates/${doc.id}/download`, { headers: headers() })
    if (!res.ok) {
      alert("No se pudo abrir el formato")
      return
    }
    window.open(URL.createObjectURL(await res.blob()), "_blank", "noopener,noreferrer")
  }

  async function downloadTemplate(doc: TemplateDoc) {
    const res = await fetch(`${API_BASE_URL}/documents/templates/${doc.id}/download`, { headers: headers() })
    if (!res.ok) {
      alert("No se pudo descargar el formato")
      return
    }
    const url = URL.createObjectURL(await res.blob())
    const link = document.createElement("a")
    link.href = url
    link.download = doc.filename || `${doc.name}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-4xl">Documentos</h1>
        <p className="text-sm text-muted-foreground sm:text-lg">Formatos para ver y descargar.</p>
      </div>

      {error ? <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">{error}</div> : null}

      {canManage ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">Subir formato</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
            <div className="grid content-start gap-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del formato" />
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción opcional" className="min-h-24" />
            </div>

            <div className="grid gap-3">
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => selectFile(e.target.files?.[0])}
              />

              <div
                className={`rounded-md border border-dashed p-5 text-center transition-colors ${
                  dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                }`}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setDragging(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  selectFile(e.dataTransfer.files?.[0])
                }}
              >
                <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <div className="text-sm font-medium">{file ? file.name : "Arrastra el archivo aquí"}</div>
                <div className="mt-1 text-xs text-muted-foreground">PDF o imagen, máximo 15 MB.</div>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => fileInputRef.current?.click()}>
                  Elegir archivo
                </Button>
              </div>

              <Button type="button" disabled={!file || busy} onClick={upload}>
                <Upload className="h-4 w-4" />
                {busy ? "Subiendo..." : "Subir formato"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card><CardContent className="p-8 text-muted-foreground">Cargando formatos...</CardContent></Card>
      ) : templates.length === 0 ? (
        <Card><CardContent className="p-8 text-muted-foreground">Todavía no hay formatos cargados.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{doc.name}</CardTitle>
                  <Badge variant="secondary">Formato</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <TemplatePreview doc={doc} />
                <div className="text-xs text-muted-foreground">
                  <div className="line-clamp-2">{doc.description || "Sin descripción"}</div>
                  <div className="truncate font-medium text-foreground">{doc.filename}</div>
                  <div>{fmtDate(doc.uploaded_at)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openTemplate(doc)}>Ver</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => downloadTemplate(doc)}>Descargar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
