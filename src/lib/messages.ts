import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { ConversationSummary, Message } from './types'

const WDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']

// Absolute clock for message bubbles inside a thread: a real "14:05" (with a
// day prefix once it's no longer today) instead of an ever-vaguer "2 min".
export function msgClock(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `Hier ${time}`
  if (now.getTime() - d.getTime() < 7 * 24 * 3600 * 1000) return `${WDAYS[d.getDay()]} ${time}`
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${time}`
}

// ── relative time, shared with the messaging UI ─────────────────────
export function msgTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h`
  const days = Math.round(h / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

type MemberRow = { conversation_id: string; last_read_at: string }
type ConvRow = {
  id: string
  kind: 'activity' | 'direct'
  activity_id: string | null
  activity: { ask: string; venue_code: string; sport: { label: string; color: string; tint: string } | null } | null
}
type ProfRow = { id: string; first_name: string; last_initial: string; avatar_color: string; verified: boolean }
type MsgRow = { conversation_id: string; sender_id: string | null; body: string; created_at: string }

// Assemble every conversation I belong to, with last-message preview + unread
// count, ready for the Messagerie list.
export async function loadConversations(me: string): Promise<ConversationSummary[]> {
  const { data: mem } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq('profile_id', me)
  const members = (mem as MemberRow[]) ?? []
  const ids = members.map((m) => m.conversation_id)
  if (ids.length === 0) return []
  const lastRead = new Map(members.map((m) => [m.conversation_id, m.last_read_at]))

  const [{ data: convs }, { data: allMembers }, { data: msgs }] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, kind, activity_id, activity:activities(ask, venue_code, sport:sports(label, color, tint))')
      .in('id', ids),
    supabase
      .from('conversation_members')
      .select('conversation_id, profile:profiles(id, first_name, last_initial, avatar_color, verified)')
      .in('conversation_id', ids),
    supabase
      .from('messages')
      .select('conversation_id, sender_id, body, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false }),
  ])

  // members grouped by conversation, excluding me
  const othersByConv = new Map<string, ProfRow[]>()
  for (const row of (allMembers as unknown as Array<{ conversation_id: string; profile: ProfRow }>) ?? []) {
    if (!row.profile || row.profile.id === me) continue
    const arr = othersByConv.get(row.conversation_id) ?? []
    arr.push(row.profile)
    othersByConv.set(row.conversation_id, arr)
  }

  const list: ConversationSummary[] = ((convs as unknown as ConvRow[]) ?? []).map((c) => {
    const others = othersByConv.get(c.id) ?? []
    const convMsgs = ((msgs as MsgRow[]) ?? []).filter((m) => m.conversation_id === c.id)
    const last = convMsgs[0] ?? null
    const lr = lastRead.get(c.id)
    const unread = convMsgs.filter((m) => m.sender_id !== me && (!lr || m.created_at > lr)).length

    let title: string
    let subtitle: string
    let avatarColor: string
    let avatarLetter: string
    if (c.kind === 'activity') {
      title = c.activity?.sport?.label ? `${c.activity.sport.label} · groupe` : 'Activité'
      subtitle = c.activity?.venue_code ?? `${others.length + 1} participants`
      avatarColor = c.activity?.sport?.color ?? '#5C2049'
      avatarLetter = (c.activity?.sport?.label ?? 'A')[0]
    } else {
      const o = others[0]
      title = o ? `${o.first_name} ${o.last_initial}` : 'Conversation'
      subtitle = 'Message privé'
      avatarColor = o?.avatar_color ?? '#5C2049'
      avatarLetter = (o?.first_name ?? '?')[0]
    }

    return {
      id: c.id,
      kind: c.kind,
      activity_id: c.activity_id,
      title,
      subtitle,
      avatarColor,
      avatarLetter,
      lastBody: last?.body ?? null,
      lastAt: last?.created_at ?? null,
      unread,
      others,
    }
  })

  // most recent activity first; empty threads sink to the bottom
  return list.sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''))
}

export async function countUnreadMessages(me: string): Promise<number> {
  const convs = await loadConversations(me)
  return convs.reduce((n, c) => n + c.unread, 0)
}

// Unread-message badge for the top nav, refreshed live on any new message.
export function useUnreadMessages(profileId: string | null) {
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!profileId) return
    setUnread(await countUnreadMessages(profileId))
  }, [profileId])

  useEffect(() => {
    refresh()
    if (!profileId) return
    const channel = supabase
      .channel(`msg:${profileId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profileId, refresh])

  return { unread, refresh }
}

export type { Message }
