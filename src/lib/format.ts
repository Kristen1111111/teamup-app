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
