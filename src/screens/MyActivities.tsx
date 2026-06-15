import { useEffect, useMemo, useState } from 'react'
import { C, FONT, MODE_LABEL } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { ACTIVITY_SELECT } from '../lib/queries'
import type { Activity, Profile } from '../lib/types'
import { formatSlot, placesLabel, confirmedCount } from '../lib/format'
import { Pin, Clock, Check, Close, Repeat, Calendar } from '../components/icons'
import type { ScreenName } from '../App'

type Tab = 'upcoming' | 'past'

export default function MyActivities({ profile, go }: { profile: Profile; go: (s: ScreenName) => void }) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const [acts, setActs] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  async function load() {
    // activities I organize + activities I joined, merged & de-duplicated
    const [{ data: mine }, { data: parts }] = await Promise.all([
      supabase.from('activities').select(ACTIVITY_SELECT).eq('organizer_id', profile.id),
      supabase.from('activity_participants').select('activity_id').eq('profile_id', profile.id),
    ])
    const joinedIds = (parts ?? []).map((p: { activity_id: string }) => p.activity_id)
    let joined: Activity[] = []
    if (joinedIds.length) {
      const { data } = await supabase.from('activities').select(ACTIVITY_SELECT).in('id', joinedIds)
      joined = (data as unknown as Activity[]) ?? []
    }
    const byId = new Map<string, Activity>()
    for (const a of [...((mine as unknown as Activity[]) ?? []), ...joined]) byId.set(a.id, a)
    setActs(Array.from(byId.values()))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const now = Date.now()
  const shown = useMemo(() => {
    const list = acts.filter((a) =>
      tab === 'upcoming' ? new Date(a.starts_at).getTime() >= now : new Date(a.starts_at).getTime() < now,
    )
    return list.sort((a, b) =>
      tab === 'upcoming'
        ? +new Date(a.starts_at) - +new Date(b.starts_at)
        : +new Date(b.starts_at) - +new Date(a.starts_at),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acts, tab])

  function toast(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3200)
  }

  async function confirmPresence(a: Activity) {
    setBusy(a.id + ':present')
    await supabase
      .from('activity_participants')
      .update({ checked_in: true })
      .eq('activity_id', a.id)
      .eq('profile_id', profile.id)
    await load()
    setBusy(null)
  }

  async function respond(participantId: string, accept: boolean) {
    setBusy(participantId)
    await supabase.rpc('respond_request', { p_participant: participantId, p_accept: accept })
    await load()
    setBusy(null)
    toast(accept ? 'Joueur confirmé ✓' : 'Demande refusée')
  }

  async function recreate(a: Activity) {
    setBusy(a.id + ':recreate')
    const { error } = await supabase.rpc('recreate_activity', { p_activity: a.id })
    await load()
    setBusy(null)
    if (error) toast('Impossible de recréer la session')
    else {
      setTab('upcoming')
      toast('Session recréée · habitués réinvités')
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 32, fontWeight: 500, letterSpacing: '-.01em' }}>Mes activités</h1>
      </div>
      <p style={{ fontSize: 14, color: C.muted, fontWeight: 500, marginBottom: 18 }}>
        Gère tes sessions, confirme ta présence et reprogramme tes habitudes en un tap.
      </p>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#EBE7DD', borderRadius: 14, padding: 4, maxWidth: 320 }}>
        {(['upcoming', 'past'] as Tab[]).map((t) => {
          const on = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRadius: 11,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: on ? C.card : 'transparent',
                color: on ? C.prune : C.muted,
                boxShadow: on ? '0 1px 3px rgba(40,28,34,.12)' : 'none',
                transition: 'all .15s',
              }}
            >
              {t === 'upcoming' ? 'À venir' : 'Passées'}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && <div style={{ color: C.muted, fontSize: 14 }}>Chargement…</div>}
        {!loading && shown.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: C.muted,
              fontSize: 14,
              padding: '40px 0',
              background: C.card,
              border: `1px dashed ${C.faint}`,
              borderRadius: 20,
            }}
          >
            {tab === 'upcoming' ? 'Aucune activité à venir. Crée ta prochaine session.' : 'Aucune session passée pour l’instant.'}
          </div>
        )}
        {shown.map((a) => (
          <Row
            key={a.id}
            a={a}
            me={profile.id}
            tab={tab}
            busy={busy}
            onConfirm={() => confirmPresence(a)}
            onRespond={respond}
            onRecreate={() => recreate(a)}
            go={go}
          />
        ))}
      </div>

      {flash && (
        <div
          style={{
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
            boxShadow: '0 14px 34px -12px rgba(0,0,0,.5)',
            zIndex: 80,
          }}
        >
          {flash}
        </div>
      )}
    </div>
  )
}

function Row({
  a,
  me,
  tab,
  busy,
  onConfirm,
  onRespond,
  onRecreate,
  go,
}: {
  a: Activity
  me: string
  tab: Tab
  busy: string | null
  onConfirm: () => void
  onRespond: (participantId: string, accept: boolean) => void
  onRecreate: () => void
  go: (s: ScreenName) => void
}) {
  const isOrganizer = a.organizer_id === me
  const mine = a.participants.find((p) => p.profile_id === me)
  const pending = a.participants.filter((p) => p.status === 'pending')
  const confirmed = confirmedCount(a)

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 22,
        padding: '18px 20px',
        boxShadow: '0 2px 10px -6px rgba(40,28,34,.08)',
      }}
    >
      {/* header line */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 12,
            fontWeight: 600,
            color: a.sport.color,
            background: a.sport.tint,
            padding: '5px 8px',
            borderRadius: 8,
            letterSpacing: '.5px',
            flex: 'none',
          }}
        >
          {a.sport.code}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: FONT.serif, fontSize: 20, fontWeight: 500, lineHeight: 1.15 }}>{a.ask}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 7 }}>
            <Meta icon={<Clock />} text={formatSlot(a)} />
            <Meta icon={<Pin />} text={a.venue_name} />
          </div>
        </div>
        <span
          style={{
            flex: 'none',
            fontSize: 11.5,
            fontWeight: 600,
            color: isOrganizer ? C.prune : C.muted,
            background: isOrganizer ? C.pruneSoft : C.paper,
            border: `1px solid ${isOrganizer ? 'transparent' : C.line}`,
            borderRadius: 999,
            padding: '5px 11px',
            whiteSpace: 'nowrap',
          }}
        >
          {isOrganizer ? 'Organisateur' : mine?.status === 'confirmed' ? 'Confirmé' : mine?.status === 'waitlist' ? "Liste d'attente" : 'En attente'}
        </span>
      </div>

      {/* stats line */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontFamily: FONT.mono, fontSize: 11.5, color: C.muted, fontWeight: 500 }}>
        <span>{confirmed} confirmé{confirmed > 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{placesLabel(a)}</span>
        <span>·</span>
        <span>{MODE_LABEL[a.mode]}</span>
      </div>

      {/* ── upcoming: organizer's pending requests (F6 nouvelle demande) ── */}
      {tab === 'upcoming' && isOrganizer && pending.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1px', color: C.prune, fontWeight: 600, marginBottom: 10 }}>
            {pending.length} DEMANDE{pending.length > 1 ? 'S' : ''} À TRAITER
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((p) => (
              <div key={p.id ?? p.profile_id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Avatar color={p.profile.avatar_color} letter={p.profile.first_name[0]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {p.profile.first_name} {p.profile.last_initial}
                  </div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.green, fontWeight: 500 }}>
                    {p.profile.attendance_pct}% présence · {p.profile.matches_played} matchs
                  </div>
                </div>
                <button
                  onClick={() => p.id && onRespond(p.id, false)}
                  disabled={busy === p.id}
                  title="Refuser"
                  style={smallBtn(false)}
                >
                  <Close size={15} stroke={C.muted} />
                </button>
                <button
                  onClick={() => p.id && onRespond(p.id, true)}
                  disabled={busy === p.id}
                  title="Accepter"
                  style={smallBtn(true)}
                >
                  <Check size={14} stroke="#fff" sw={3} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── upcoming: 1-tap presence confirmation (F5) ── */}
      {tab === 'upcoming' && mine?.status === 'confirmed' && (
        <div style={{ marginTop: 14 }}>
          {mine.checked_in ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: C.greenSoft,
                color: C.green,
                borderRadius: 13,
                padding: '11px 14px',
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <Check size={14} stroke={C.green} sw={3} />
              Présence confirmée — à très vite sur le terrain
            </div>
          ) : (
            <button
              onClick={onConfirm}
              disabled={busy === a.id + ':present'}
              className="tu-press"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 13,
                border: 'none',
                background: C.prune,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: busy === a.id + ':present' ? 0.7 : 1,
              }}
            >
              {busy === a.id + ':present' ? '…' : 'Je serai présent · confirmer en 1 tap'}
            </button>
          )}
        </div>
      )}

      {/* ── past: recreate (F4 duplication) ── */}
      {tab === 'past' && isOrganizer && (
        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onRecreate}
            disabled={busy === a.id + ':recreate'}
            className="tu-press"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 16px',
              borderRadius: 13,
              border: 'none',
              background: C.prune,
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: busy === a.id + ':recreate' ? 0.7 : 1,
            }}
          >
            <Repeat size={16} stroke="#fff" />
            {busy === a.id + ':recreate' ? 'Recréation…' : 'Recréer cette session'}
          </button>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Prochaine occurrence · habitués réinvités</span>
        </div>
      )}

      {tab === 'upcoming' && isOrganizer && pending.length === 0 && (
        <button
          onClick={() => go('feed')}
          style={{
            marginTop: 12,
            background: 'none',
            border: 'none',
            color: C.prune,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Calendar size={15} stroke={C.prune} />
          Voir dans le feed
        </button>
      )}
    </div>
  )
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted, fontWeight: 500 }}>
      {icon}
      {text}
    </span>
  )
}

function Avatar({ color, letter }: { color: string; letter: string }) {
  return (
    <div
      style={{
        flex: 'none',
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 15,
      }}
    >
      {letter}
    </div>
  )
}

function smallBtn(primary: boolean): React.CSSProperties {
  return {
    flex: 'none',
    width: 34,
    height: 34,
    borderRadius: 10,
    border: primary ? 'none' : `1px solid ${C.line}`,
    background: primary ? C.green : C.card,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }
}
