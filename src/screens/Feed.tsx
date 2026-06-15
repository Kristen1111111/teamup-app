import { useEffect, useMemo, useState } from 'react'
import { C, FONT, MODE_LABEL } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Activity, Profile, Sport } from '../lib/types'
import { formatSlot, placesLabel, slotsLeft } from '../lib/format'
import { Pin, Clock, Chevron, ChevronRight, Heart, VerifiedDot } from '../components/icons'
import type { ScreenName } from '../App'

const ACTIVITY_SELECT = `
  *,
  organizer:profiles!activities_organizer_id_fkey(*),
  sport:sports(*),
  participants:activity_participants(
    profile_id, status, checked_in,
    profile:profiles(id, first_name, last_initial, avatar_color)
  )
`

export default function Feed({ profile, go }: { profile: Profile; go: (s: ScreenName) => void }) {
  const [sports, setSports] = useState<Sport[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [filter, setFilter] = useState('all')
  const [revoirCount, setRevoirCount] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    const [{ data: sp }, { data: acts }, { data: intents }] = await Promise.all([
      supabase.from('sports').select('*').order('sort_order'),
      supabase
        .from('activities')
        .select(ACTIVITY_SELECT)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true }),
      supabase.from('meet_intents').select('from_profile').eq('to_profile', profile.id),
    ])
    setSports((sp as Sport[]) ?? [])
    setActivities((acts as Activity[]) ?? [])
    setRevoirCount(new Set((intents ?? []).map((i: { from_profile: string }) => i.from_profile)).size)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = useMemo(
    () => activities.filter((a) => filter === 'all' || a.sport_key === filter),
    [activities, filter],
  )

  async function join(a: Activity) {
    setBusyId(a.id)
    const status = slotsLeft(a) <= 0 || a.mode === 'wait' ? 'waitlist' : a.mode === 'direct' ? 'confirmed' : 'pending'
    await supabase.from('activity_participants').insert({ activity_id: a.id, profile_id: profile.id, status })
    await load()
    setBusyId(null)
  }

  const filterDefs = [{ key: 'all', label: 'Tous' }, ...sports.map((s) => ({ key: s.key, label: s.label }))]

  return (
    <div>
      {/* header */}
      <div style={{ padding: '6px 22px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>
          Team<span style={{ color: C.prune }}>Up</span>
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 999,
            padding: '7px 12px',
            fontSize: 13,
            fontWeight: 600,
            color: C.ink,
            cursor: 'pointer',
          }}
        >
          <Pin size={14} stroke={C.prune} sw={1.9} />
          {profile.city}
          <Chevron size={11} />
        </button>
      </div>

      <div style={{ padding: '10px 22px 2px' }}>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 30, lineHeight: 1.08, fontWeight: 500, letterSpacing: '-.01em' }}>
          Près de toi, ce soir
        </h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: C.muted, fontWeight: 500 }}>
          {shown.length} activité{shown.length > 1 ? 's' : ''} cherche{shown.length > 1 ? 'nt' : ''} encore des joueurs
        </p>
      </div>

      {/* filter chips */}
      <div className="tu-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 22px 12px' }}>
        {filterDefs.map((d) => {
          const on = filter === d.key
          return (
            <button
              key={d.key}
              onClick={() => setFilter(d.key)}
              style={{
                padding: '9px 15px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: `1px solid ${on ? C.prune : C.line}`,
                background: on ? C.prune : C.card,
                color: on ? '#fff' : C.ink,
                transition: 'all .15s',
              }}
            >
              {d.label}
            </button>
          )
        })}
      </div>

      {/* "ouvert à se revoir" banner */}
      <div style={{ padding: '0 22px 6px' }}>
        <button
          onClick={() => go('revoir')}
          className="tu-press"
          style={{
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            background: 'linear-gradient(100deg,#5C2049,#7A2E62)',
            border: 'none',
            borderRadius: 20,
            padding: '15px 16px',
            cursor: 'pointer',
            boxShadow: '0 12px 26px -12px rgba(92,32,73,.7)',
          }}
        >
          <span
            style={{
              flex: 'none',
              width: 42,
              height: 42,
              borderRadius: 13,
              background: 'rgba(255,255,255,.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart size={22} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontFamily: FONT.mono, fontSize: 10, letterSpacing: '1.2px', color: 'rgba(255,255,255,.7)' }}>
              HIER · FOOT À 5
            </span>
            <span style={{ display: 'block', fontFamily: FONT.serif, fontSize: 17, color: '#fff', marginTop: 2, lineHeight: 1.2 }}>
              {revoirCount > 0
                ? `${revoirCount} joueur${revoirCount > 1 ? 's sont ouverts' : ' est ouvert'} à se revoir`
                : 'Découvre qui est ouvert à se revoir'}
            </span>
          </span>
          <ChevronRight />
        </button>
      </div>

      {/* activity cards */}
      <div style={{ padding: '14px 22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {shown.map((a) => (
          <Card key={a.id} a={a} me={profile.id} busy={busyId === a.id} onJoin={() => join(a)} />
        ))}
        {shown.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 13.5, padding: '20px 0' }}>
            Aucune activité pour ce filtre. Crée la tienne en 30 secondes.
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ a, me, busy, onJoin }: { a: Activity; me: string; busy: boolean; onJoin: () => void }) {
  const left = slotsLeft(a)
  const soft = left <= 0 || a.mode === 'wait'
  const confirmed = a.participants.filter((p) => p.status === 'confirmed')
  const mine = a.participants.find((p) => p.profile_id === me)

  const cta = mine
    ? mine.status === 'confirmed'
      ? 'Inscrit ✓'
      : mine.status === 'pending'
        ? 'Demande envoyée'
        : "Sur liste d'attente"
    : soft
      ? "Rejoindre la liste d'attente"
      : a.mode === 'direct'
        ? 'Rejoindre'
        : 'Demander à rejoindre'

  const ctaSoft = soft || !!mine
  const codeStyle: React.CSSProperties = {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 600,
    color: a.sport.color,
    background: a.sport.tint,
    padding: '3px 6px',
    borderRadius: 6,
    letterSpacing: '.5px',
  }

  return (
    <div
      style={{
        background: C.card,
        borderRadius: 24,
        border: `1px solid ${C.line}`,
        overflow: 'hidden',
        boxShadow: '0 2px 10px -4px rgba(40,28,34,.08)',
      }}
    >
      {/* striped tinted header */}
      <div style={{ height: 120, position: 'relative', background: a.sport.tint, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(125deg,rgba(28,24,21,.05) 0 1px,transparent 1px 13px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 13,
            top: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'rgba(255,255,255,.85)',
            backdropFilter: 'blur(4px)',
            borderRadius: 999,
            padding: '5px 11px 5px 6px',
          }}
        >
          <span style={codeStyle}>{a.sport.code}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>{a.sport.label}</span>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 13,
            top: 13,
            background: C.ink,
            color: '#fff',
            borderRadius: 999,
            padding: '6px 11px',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {placesLabel(a)}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 14,
            bottom: 11,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: '1px',
            color: 'rgba(28,24,21,.45)',
          }}
        >
          {a.venue_code}
        </div>
      </div>

      <div style={{ padding: '16px 17px 17px' }}>
        <h3 style={{ fontFamily: FONT.serif, fontSize: 22, fontWeight: 500, lineHeight: 1.12, letterSpacing: '-.01em' }}>
          {a.ask}
        </h3>

        <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Row icon={<Pin />} text={a.venue_name} />
          <Row icon={<Clock />} text={formatSlot(a)} />
        </div>

        <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
          <Tag>{a.level}</Tag>
          <Tag muted>{MODE_LABEL[a.mode]}</Tag>
        </div>

        <div style={{ height: 1, background: C.line, margin: '15px 0' }} />

        {/* organizer + avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              flex: 'none',
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: a.organizer.avatar_color,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {a.organizer.first_name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 600 }}>
              {a.organizer.first_name} {a.organizer.last_initial}
              {a.organizer.verified && <VerifiedDot />}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '.3px', color: C.green, fontWeight: 500 }}>
              {a.organizer.attendance_pct}% présence · {a.organizer.matches_played} matchs
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {confirmed.slice(0, 4).map((p, i) => (
              <div
                key={p.profile_id}
                style={{
                  width: 31,
                  height: 31,
                  borderRadius: '50%',
                  background: p.profile.avatar_color,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                  marginLeft: i === 0 ? 0 : -9,
                  position: 'relative',
                  zIndex: 10 - i,
                }}
              >
                {p.profile.first_name[0]}
              </div>
            ))}
            {Array.from({ length: Math.min(left, 3) }).map((_, i) => (
              <div
                key={`slot-${i}`}
                style={{
                  width: 31,
                  height: 31,
                  borderRadius: '50%',
                  border: `1.5px dashed ${C.faint}`,
                  marginLeft: confirmed.length === 0 && i === 0 ? 0 : -9,
                  background: C.paper,
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={mine ? undefined : onJoin}
          disabled={busy || !!mine}
          className="tu-press"
          style={{
            marginTop: 15,
            width: '100%',
            padding: 13,
            borderRadius: 13,
            border: ctaSoft ? `1px solid ${C.line}` : 'none',
            background: ctaSoft ? C.pruneSoft : C.prune,
            color: ctaSoft ? C.prune : '#fff',
            fontSize: 14.5,
            fontWeight: 600,
            cursor: mine ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? '…' : cta}
        </button>
      </div>
    </div>
  )
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: C.muted, fontWeight: 500 }}>
      {icon}
      <span>{text}</span>
    </div>
  )
}

function Tag({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        color: muted ? C.muted : C.ink,
        background: C.paper,
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        padding: '4px 9px',
      }}
    >
      {children}
    </span>
  )
}
