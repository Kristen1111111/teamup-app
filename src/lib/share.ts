import type { Activity } from './types'
import { formatSlot, placesLabel } from './format'

// Public, shareable URL for an activity — works without an account.
export function activityUrl(id: string): string {
  return `${window.location.origin}/a/${id}`
}

// One-line teaser used as the message body across share channels.
export function shareText(a: Activity): string {
  return `${a.sport.label} · ${a.venue_name} · ${formatSlot(a)} — ${placesLabel(a)}. Tu joues avec nous ?`
}

export function whatsappUrl(a: Activity): string {
  return `https://wa.me/?text=${encodeURIComponent(`${shareText(a)}\n${activityUrl(a.id)}`)}`
}

export function smsUrl(a: Activity): string {
  // `?&body=` is the broadly-compatible form across iOS and Android.
  return `sms:?&body=${encodeURIComponent(`${shareText(a)} ${activityUrl(a.id)}`)}`
}

export async function copyLink(id: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(activityUrl(id))
    return true
  } catch {
    return false
  }
}

// Native OS share sheet (mobile / supported browsers). Returns false if unavailable.
export async function nativeShare(a: Activity): Promise<boolean> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
  if (!nav.share) return false
  try {
    await nav.share({ title: `TeamUp · ${a.sport.label}`, text: shareText(a), url: activityUrl(a.id) })
    return true
  } catch {
    return false
  }
}
