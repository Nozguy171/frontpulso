"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Search } from "lucide-react"

const LEAFLET_VERSION = "1.9.4"

type NominatimPlace = {
  place_id?: number
  lat: string
  lon: string
  display_name: string
}

export type AppointmentLocationValue = {
  ubicacion: string
  ubicacion_lat: number | null
  ubicacion_lng: number | null
}

type Props = {
  value: AppointmentLocationValue
  onChange: (value: AppointmentLocationValue) => void
  inputId?: string
}

let leafletPromise: Promise<any> | null = null

function loadLeaflet() {
  if (typeof window === "undefined") return Promise.resolve(null)
  if ((window as any).L) return Promise.resolve((window as any).L)
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
      document.head.appendChild(link)
    }

    const script = document.createElement("script")
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
    script.async = true
    script.onload = () => resolve((window as any).L)
    script.onerror = reject
    document.head.appendChild(script)
  })

  return leafletPromise
}

function placeLabel(place: NominatimPlace) {
  return place.display_name || "Ubicacion seleccionada"
}

function googleMapsUrl(value: AppointmentLocationValue) {
  if (value.ubicacion_lat != null && value.ubicacion_lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${value.ubicacion_lat},${value.ubicacion_lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.ubicacion)}`
}

export function getAppointmentGoogleMapsUrl(value: AppointmentLocationValue) {
  return googleMapsUrl(value)
}

export function AppointmentLocationPicker({ value, onChange, inputId = "appointment-location" }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const valueRef = useRef(value)
  const [query, setQuery] = useState(value.ubicacion)
  const [results, setResults] = useState<NominatimPlace[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    valueRef.current = value
    setQuery(value.ubicacion)
  }, [value])

  const setPoint = async (lng: number, lat: number, address?: string) => {
    const nextAddress = address || valueRef.current.ubicacion || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    const L = (window as any).L
    if (mapRef.current && L) {
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current)
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current.getLatLng()
          setPoint(pos.lng, pos.lat)
        })
      }
      markerRef.current.setLatLng([lat, lng])
      mapRef.current.setView([lat, lng], 15)
    }
    setQuery(nextAddress)
    onChange({ ubicacion: nextAddress, ubicacion_lat: lat, ubicacion_lng: lng })
  }

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    let alive = true

    loadLeaflet()
      .then((L) => {
        if (!alive || !mapEl.current || !L) return
        const center: [number, number] =
          value.ubicacion_lat != null && value.ubicacion_lng != null
            ? [value.ubicacion_lat, value.ubicacion_lng]
            : [23.6345, -102.5528]

        mapRef.current = L.map(mapEl.current).setView(
          center,
          value.ubicacion_lat != null && value.ubicacion_lng != null ? 14 : 5,
        )
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current)
        mapRef.current.on("click", (event: any) => {
          setPoint(event.latlng.lng, event.latlng.lat)
        })
        if (value.ubicacion_lat != null && value.ubicacion_lng != null) {
          setPoint(value.ubicacion_lng, value.ubicacion_lat, value.ubicacion)
        }
      })
      .catch(() => {})

    return () => {
      alive = false
      markerRef.current = null
      mapRef.current?.remove?.()
      mapRef.current = null
    }
  }, [])

  async function searchAddress() {
    const q = query.trim()
    onChange({ ...value, ubicacion: q })
    if (q.length < 3) return

    setSearching(true)
    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        q,
        "accept-language": "es",
        limit: "5",
      })
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
      const data = await res.json()
      setResults((Array.isArray(data) ? data : []) as NominatimPlace[])
    } finally {
      setSearching(false)
    }
  }

  async function selectPlace(place: NominatimPlace) {
    const lat = Number(place.lat)
    const lng = Number(place.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const label = placeLabel(place)
    setQuery(label)
    setResults([])
    await setPoint(lng, lat, label)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            onChange({ ...value, ubicacion: event.target.value, ubicacion_lat: null, ubicacion_lng: null })
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void searchAddress()
            }
          }}
          placeholder="Busca o escribe la direccion"
          className="h-11"
        />
        <Button type="button" variant="outline" size="icon" onClick={searchAddress} disabled={searching} aria-label="Buscar direccion">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {results.length > 0 ? (
        <div className="max-h-36 overflow-y-auto rounded-md border bg-background text-sm">
          {results.map((result, index) => (
            <button
              key={result.place_id || index}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted"
              onClick={() => selectPlace(result)}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{placeLabel(result)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div ref={mapEl} className="h-48 rounded-md border bg-muted sm:h-64" />

      {value.ubicacion ? (
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={googleMapsUrl(value)} target="_blank" rel="noreferrer">
            Abrir en Google Maps
          </a>
        </Button>
      ) : null}
    </div>
  )
}
