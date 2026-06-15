import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { NotifType, Notification as Notif } from './types'

// Per-type display metadata for the notification center (F6).
export const NOTIF_META: Record<NotifType, { label: string; color: string; tint: string }> = {
  request: { label: 'Nouvelle demande', color: '#5C2049', tint: '#F1E6EC' },
  accepted: { label: 'Demande acceptée', color: '#2E6B45', tint: '#E6EFE8' },
  freed: { label: 'Place libérée', color: '#2E6B45', tint: '#E6EFE8' },
  reminder: { label: 'Rappel', color: '#B06A1B', tint: '#F6ECDD' },
  mutual: { label: 'Se revoir', color: '#5C2049', tint: '#F1E6EC' },
  invite: { label: 'Réinvitation', color: '#5C2049', tint: '#F1E6EC' },
}

// Human-readable preference labels, in display order.
export const PREF_ROWS: { type: NotifType; label: string; hint: string }[] = [
  { type: 'request', label: 'Nouvelles demandes', hint: 'Quand un joueur demande à rejoindre ton activité' },
  { type: 'accepted', label: 'Demandes acceptées', hint: 'Quand un organisateur valide ta demande' },
  { type: 'freed', label: 'Places libérées', hint: 'Quand tu passes de la liste d’attente aux confirmés' },
  { type: 'reminder', label: 'Rappels de match', hint: 'La veille et quelques heures avant' },
  { type: 'mutual', label: '« Se revoir » réciproque', hint: 'Quand l’intérêt est mutuel après un match' },
  { type: 'invite', label: 'Réinvitations', hint: 'Quand un habitué reprogramme une session' },
]

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'hier'
  if (d < 7) return `il y a ${d} j`
  return `il y a ${Math.round(d / 7)} sem`
}

// ── "Push" via the Web Notifications API — fires while a tab is open ────────
export function pushPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function enablePush(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

function fireBrowserNotification(title: string, body: string | null) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body: body ?? undefined, tag: 'teamup' })
  } catch {
    /* some browsers throw without a service worker — ignore for the MVP */
  }
}

// Unread badge + live delivery. Counts unread notifications and subscribes to
// new rows over Supabase Realtime, surfacing each as a desktop notification.
export function useUnread(profileId: string | null) {
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!profileId) return
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', profileId)
      .is('read_at', null)
    setUnread(count ?? 0)
  }, [profileId])

  useEffect(() => {
    refresh()
    if (!profileId) return
    const channel = supabase
      .channel(`notif:${profileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${profileId}` },
        (payload) => {
          const n = payload.new as Notif
          setUnread((u) => u + 1)
          fireBrowserNotification(n.title, n.body)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profileId, refresh])

  return { unread, refresh }
}
