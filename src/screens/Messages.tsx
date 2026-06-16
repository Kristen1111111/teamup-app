import { useEffect, useRef, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { ConversationSummary, Message, Profile } from '../lib/types'
import { loadConversations, msgTime, msgClock } from '../lib/messages'
import { ChevronLeft, Dots, Send, Flag, Ban, Message as MessageIcon, VerifiedDot, Check } from '../components/icons'

const REPORT_REASONS = [
  'Comportement déplacé',
  'Propos haineux',
  'Spam ou publicité',
  'Profil suspect',
  'Absences répétées',
  'Autre',
]

export default function Messages({
  profile,
  initialThreadId,
  onChange,
}: {
  profile: Profile
  initialThreadId: string | null
  onChange: () => void
}) {
  const [active, setActive] = useState<string | null>(initialThreadId ?? null)

  if (active) {
    return (
      <Thread
        conversationId={active}
        profile={profile}
        onBack={() => {
          setActive(null)
          onChange()
        }}
        onChange={onChange}
      />
    )
  }
  return <ConversationList profile={profile} onOpen={setActive} />
}

// ── Liste des fils ──────────────────────────────────────────────────
function ConversationList({ profile, onOpen }: { profile: Profile; onOpen: (id: string) => void }) {
  const [convs, setConvs] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations(profile.id).then((c) => {
      setConvs(c)
      setLoading(false)
    })
  }, [profile.id])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontFamily: FONT.serif, fontSize: 32, fontWeight: 500, letterSpacing: '-.01em', marginBottom: 4 }}>
        Messagerie
      </h1>
      <p style={{ fontSize: 14, color: C.muted, fontWeight: 500, marginBottom: 18 }}>
        Tes échanges par activité et tes messages privés.
      </p>

      {loading && <div style={{ color: C.muted, fontSize: 14 }}>Chargement…</div>}
      {!loading && convs.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: C.muted,
            fontSize: 14,
            padding: '48px 0',
            background: C.card,
            border: `1px dashed ${C.faint}`,
            borderRadius: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <MessageIcon size={26} stroke={C.faint} />
          </div>
          Aucune conversation. Lance la discussion depuis « Ouvert à se revoir » ou une activité.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {convs.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className="tu-press"
            style={{
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              background: c.unread > 0 ? '#FBF8F1' : C.card,
              border: `1px solid ${c.unread > 0 ? C.prune : C.line}`,
              borderRadius: 18,
              padding: '14px 16px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                flex: 'none',
                width: 46,
                height: 46,
                borderRadius: c.kind === 'activity' ? 13 : '50%',
                background: c.avatarColor,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {c.avatarLetter}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.title}
                </span>
                {c.kind === 'direct' && c.others[0]?.verified && <VerifiedDot />}
                <span style={{ marginLeft: 'auto', flex: 'none', fontSize: 11, color: C.faint, fontWeight: 500 }}>
                  {c.lastAt ? msgTime(c.lastAt) : ''}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: c.unread > 0 ? C.ink : C.muted,
                  fontWeight: c.unread > 0 ? 600 : 500,
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.lastBody ?? c.subtitle}
              </div>
            </div>
            {c.unread > 0 && (
              <span
                style={{
                  flex: 'none',
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 999,
                  background: C.prune,
                  color: '#fff',
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Vue conversation ────────────────────────────────────────────────
type ConvMeta = {
  kind: 'activity' | 'direct'
  activity_id: string | null
  title: string
  other: Pick<Profile, 'id' | 'first_name' | 'last_initial' | 'verified'> | null
}

function Thread({
  conversationId,
  profile,
  onBack,
  onChange,
}: {
  conversationId: string
  profile: Profile
  onBack: () => void
  onChange: () => void
}) {
  const me = profile.id
  const [meta, setMeta] = useState<ConvMeta | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheet, setSheet] = useState<'report' | 'block' | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  function toast(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3000)
  }

  async function markRead() {
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('profile_id', me)
    onChange()
  }

  async function load() {
    const [{ data: conv }, { data: members }, { data: msgs }] = await Promise.all([
      supabase
        .from('conversations')
        .select('kind, activity_id, activity:activities(ask, sport:sports(label))')
        .eq('id', conversationId)
        .single(),
      supabase
        .from('conversation_members')
        .select('profile:profiles(id, first_name, last_initial, verified)')
        .eq('conversation_id', conversationId),
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
    ])

    const others = ((members as unknown as Array<{ profile: ConvMeta['other'] }>) ?? [])
      .map((m) => m.profile)
      .filter((p): p is NonNullable<ConvMeta['other']> => !!p && p.id !== me)
    const c = conv as unknown as { kind: 'activity' | 'direct'; activity_id: string | null; activity: { ask: string; sport: { label: string } | null } | null } | null
    if (c) {
      setMeta({
        kind: c.kind,
        activity_id: c.activity_id,
        title:
          c.kind === 'activity'
            ? c.activity?.sport?.label
              ? `${c.activity.sport.label} · groupe`
              : c.activity?.ask ?? 'Activité'
            : others[0]
              ? `${others[0].first_name} ${others[0].last_initial}`
              : 'Conversation',
        other: c.kind === 'direct' ? others[0] ?? null : null,
      })
    }
    setMessages((msgs as Message[]) ?? [])
  }

  useEffect(() => {
    load().then(markRead)
    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
          if (m.sender_id !== me) markRead()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setDraft('')
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: me, body })
      .select('*')
      .single()
    if (error) {
      setDraft(body)
      toast("Le message n'a pas pu être envoyé")
    } else if (data) {
      const m = data as Message
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    }
    setSending(false)
  }

  async function submitReport(reason: string) {
    setSheet(null)
    setMenuOpen(false)
    await supabase.from('reports').insert({
      reporter_id: me,
      reported_profile_id: meta?.other?.id ?? null,
      activity_id: meta?.activity_id ?? null,
      conversation_id: conversationId,
      reason,
    })
    toast('Signalement transmis à la modération')
  }

  async function confirmBlock() {
    if (!meta?.other) return
    setSheet(null)
    setMenuOpen(false)
    await supabase.from('blocks').insert({ blocker_id: me, blocked_id: meta.other.id })
    toast(`${meta.other.first_name} a été bloqué·e`)
    setTimeout(onBack, 600)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 200px)' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
        <button onClick={onBack} style={iconBtn} title="Retour">
          <ChevronLeft />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {meta?.title ?? '…'}
            </span>
            {meta?.other?.verified && <VerifiedDot />}
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
            {meta?.kind === 'activity' ? 'Conversation de groupe' : 'Message privé'}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen((o) => !o)} style={iconBtn} title="Options">
            <Dots />
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={menu}>
                <button onClick={() => setSheet('report')} style={menuItem(false)}>
                  <Flag size={15} stroke={C.ink} />
                  Signaler
                </button>
                {meta?.other && (
                  <button onClick={() => setSheet('block')} style={menuItem(true)}>
                    <Ban size={15} stroke="#A53F3F" />
                    Bloquer {meta.other.first_name}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 13.5, padding: '24px 0' }}>
            Démarre la conversation 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '78%',
                  background: mine ? C.prune : C.card,
                  color: mine ? '#fff' : C.ink,
                  border: mine ? 'none' : `1px solid ${C.line}`,
                  borderRadius: 16,
                  borderBottomRightRadius: mine ? 5 : 16,
                  borderBottomLeftRadius: mine ? 16 : 5,
                  padding: '9px 13px',
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                <div
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 9.5,
                    marginTop: 3,
                    textAlign: 'right',
                    color: mine ? 'rgba(255,255,255,.65)' : C.faint,
                  }}
                >
                  {msgClock(m.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div style={{ position: 'sticky', bottom: 0, display: 'flex', gap: 9, padding: '12px 0', background: C.paper }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Écris un message…"
          style={{
            flex: 1,
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 14,
            padding: '12px 15px',
            fontSize: 14.5,
            color: C.ink,
            outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          className="tu-press"
          title="Envoyer"
          style={{
            flex: 'none',
            width: 46,
            borderRadius: 14,
            border: 'none',
            background: draft.trim() ? C.prune : '#D8D2C6',
            color: '#fff',
            cursor: draft.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send size={18} stroke="#fff" />
        </button>
      </div>

      {/* report / block sheet */}
      {sheet && (
        <>
          <div onClick={() => setSheet(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,24,21,.4)', zIndex: 70 }} />
          <div style={overlayCard}>
            {sheet === 'report' ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Signaler</div>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
                  Choisis un motif. Notre équipe de modération examinera ce signalement.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {REPORT_REASONS.map((r) => (
                    <button key={r} onClick={() => submitReport(r)} className="tu-press" style={reasonBtn}>
                      <Flag size={15} stroke={C.prune} />
                      {r}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Bloquer {meta?.other?.first_name} ?</div>
                <p style={{ fontSize: 13.5, color: C.muted, marginBottom: 16, lineHeight: 1.45 }}>
                  Vous ne pourrez plus vous écrire et son contenu sera masqué de ton fil. Tu peux annuler ce blocage dans
                  Paramètres & sécurité.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setSheet(null)} style={ghostBtn}>
                    Annuler
                  </button>
                  <button onClick={confirmBlock} className="tu-press" style={dangerBtn}>
                    <Ban size={16} stroke="#fff" />
                    Bloquer
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {flash && (
        <div style={flashStyle}>
          <Check size={13} stroke="#fff" sw={3} />
          {flash}
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  flex: 'none',
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: C.card,
  border: `1px solid ${C.line}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: C.ink,
}

const menu: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 60,
  minWidth: 190,
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  padding: 6,
  boxShadow: '0 18px 40px -16px rgba(40,28,34,.4)',
}

function menuItem(danger: boolean): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '10px 10px',
    borderRadius: 9,
    border: 'none',
    background: 'transparent',
    color: danger ? '#A53F3F' : C.ink,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  }
}

const overlayCard: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 24,
  transform: 'translateX(-50%)',
  zIndex: 80,
  width: 'min(440px, calc(100vw - 32px))',
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 24px 60px -20px rgba(40,28,34,.5)',
}

const reasonBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  textAlign: 'left',
  background: C.paper,
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 600,
  color: C.ink,
  cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  flex: 1,
  padding: 13,
  borderRadius: 13,
  border: `1px solid ${C.line}`,
  background: C.card,
  color: C.ink,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const dangerBtn: React.CSSProperties = {
  flex: 1,
  padding: 13,
  borderRadius: 13,
  border: 'none',
  background: '#A53F3F',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

const flashStyle: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 26,
  transform: 'translateX(-50%)',
  background: C.ink,
  color: '#fff',
  borderRadius: 12,
  padding: '11px 18px',
  fontSize: 13.5,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 14px 34px -12px rgba(0,0,0,.5)',
  zIndex: 90,
}
