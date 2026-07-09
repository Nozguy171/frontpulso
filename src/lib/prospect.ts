type ProspectPhoneLike = {
  numero?: string | null
  lada?: string | null
  numero_formateado?: string | null
}

type ProspectLocationLike = {
  ultima_ubicacion_cita?: string | null
  ultima_ubicacion_cita_lat?: number | null
  ultima_ubicacion_cita_lng?: number | null
}

type ProspectFollowupLike = {
  venta_monto_sin_iva?: number | null
  seguimiento_fecha_base?: string | null
  seguimiento_pausado?: boolean | null
}

export function formatProspectPhone(prospect?: ProspectPhoneLike | null) {
  if (!prospect) return "--"
  if (prospect.numero_formateado) return prospect.numero_formateado
  const numero = prospect.numero ?? ""
  if (!numero) return "--"
  const lada = (prospect.lada || "52").replace(/^\+/, "") || "52"
  return `+${lada} ${numero}`
}

export function getLastAppointmentLocation(prospect?: ProspectLocationLike | null) {
  return {
    ubicacion: prospect?.ultima_ubicacion_cita ?? "",
    ubicacion_lat: prospect?.ultima_ubicacion_cita_lat ?? null,
    ubicacion_lng: prospect?.ultima_ubicacion_cita_lng ?? null,
  }
}

export function canStartOrResumeFollowup(prospect?: ProspectFollowupLike | null) {
  return prospect?.venta_monto_sin_iva != null && (!prospect.seguimiento_fecha_base || !!prospect.seguimiento_pausado)
}
