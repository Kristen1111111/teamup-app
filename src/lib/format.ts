import type { Activity } from './types'

const DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// "Aujourd'hui · 19:30 – 21:00" / "Demain · 18:00 – 19:30" / "Sam. · 11:00"
export function formatSlot(a: Activity): string {
  const start = new Date(a.starts_at)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  let day: string
  if (isSameDay(start, now)) day = "Aujourd'hui"
  else if (isSameDay(start, tomorrow)) day = 'Demain'
  else day = DAYS[start.getDay()]

  const times = a.ends_at ? `${hhmm(start)} – ${hhmm(new Date(a.ends_at))}` : hhmm(start)
  return `${day} · ${times}`
}

export function confirmedCount(a: Activity): number {
  return a.participants.filter((p) => p.status === 'confirmed').length
}

export function slotsLeft(a: Activity): number {
  return Math.max(a.total_slots - confirmedCount(a), 0)
}

export function placesLabel(a: Activity): string {
  const left = slotsLeft(a)
  if (left <= 0) return 'Complet'
  return left > 1 ? `${left} places` : `${left} place`
}

// Live shortfall headline, always derived from the real slot count so it can
// never contradict the "Complet" / "X places" badge (both come from slotsLeft).
export function shortfallLabel(a: Activity): string {
  const left = slotsLeft(a)
  if (left <= 0) return 'Complet'
  return `Il manque ${left} joueur${left > 1 ? 's' : ''}`
}

// Count-style asks ("Il manque 2 joueurs", "1 place côté pivot", "Complet…")
// bake a player count into free text that goes stale the moment someone joins.
const COUNT_ASK_RE = /il manque|\bplaces?\b|\bjoueurs?\b|complet/i

// Headline shown on cards and the manage view. For count-style (or empty) asks
// we render the live shortfall instead of the frozen text; genuinely
// descriptive pitches ("Sortie 8 km · allure 5'30") are kept as-is.
export function activityHeadline(a: Activity): string {
  const ask = (a.ask ?? '').trim()
  if (!ask || COUNT_ASK_RE.test(ask)) return shortfallLabel(a)
  return ask
}

export type Coords = { lat: number; lng: number }

// Great-circle distance in km between two points (Haversine).
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Distance from `from` to the activity venue, or null if either side lacks coords.
export function activityDistanceKm(a: Activity, from: Coords | null): number | null {
  if (!from || a.lat == null || a.lng == null) return null
  return distanceKm(from, { lat: a.lat, lng: a.lng })
}

// "850 m" / "1,2 km" / "12 km"
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}
