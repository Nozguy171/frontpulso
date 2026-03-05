export const ACTING_STORAGE_KEY = "pulso_acting_user_id"
export const ACTING_EMAIL_KEY = "pulso_acting_email"
export const ACTING_EVENT = "pulso:acting-changed"

export function getActingId(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(ACTING_STORAGE_KEY) || ""
}

export function setActing(userId: string, email?: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(ACTING_STORAGE_KEY, userId)
  if (email) localStorage.setItem(ACTING_EMAIL_KEY, email)
  window.dispatchEvent(new Event(ACTING_EVENT))
}

export function clearActing() {
  if (typeof window === "undefined") return
  localStorage.removeItem(ACTING_STORAGE_KEY)
  localStorage.removeItem(ACTING_EMAIL_KEY)
  window.dispatchEvent(new Event(ACTING_EVENT))
}

export function onActingChange(cb: () => void) {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(ACTING_EVENT, cb)
  return () => window.removeEventListener(ACTING_EVENT, cb)
}