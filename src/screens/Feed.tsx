import { useEffect, useMemo, useState } from 'react'
import { C, FONT, MODE_LABEL } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Activity, Profile, Sport } from '../lib/types'
import { formatSlot, placesLabel, slotsLeft, activityDistanceKm, formatDistance, activityHeadline } from '../lib/format'
import { Pin, Clock, ChevronRight, Heart, VerifiedDot } from '../components/icons'
import { ACTIVITY_SELECT } from '../lib/queries'
import Avatar from '../components/Avatar'
import { navigate } from '../lib/router'
import { useGeo } from '../lib/useGeo'
import type { Go } from '../App'

type DateKey = 'all' | 'today' | 'week'
const DATE_DEFS: { k: DateKey; l: string }[] = [
  { k: 'all', l: 'Tous' },
  { k: 'today', l: "Aujourd'hui" },
  { k: 'week', l: 'Cette semaine' },
]
const LEVEL_DEFS = ['all', 'Débutant', 'Intermédiaire', 'Confirmé'] as const
type LevelKey = (typeof LEVEL_DEFS)[number]
const DIST_DEFS: { km: number | null; l: string }[] = [
  { km: 5, l: '5 km' },
  { km: 10, l: '10 km' },
  { km: 25, l: '25 km' },
  { km: null, l: 'Toutes' },
]

function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export default function Feed({ profile, go }: { profile: Profile; go: Go }) {
  const [sports, setSports] = useState<Sport[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [revoirCount, setRevoirCount] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)

  // Filters (F8): sport (existing) + date / level / available slots / distance.
  const [sport, setSport] = useState('all')
  const [dateKey, setDateKey] = useState<DateKey>('all')
  const [level, setLevel] = useState<LevelKey>('all')
  const [onlyAvail, setOnlyAvail] = useState(false)
  // Distance-first: default to a 10 km radius around the player's home zone.
  const [maxDist, setMaxDist] = useState<number | null>(10)
  const [verifiedOnly, setVerifiedOnly] = useState(false) // F10
  const [blocked, setBlocked] = useState<Set<string>>(new Set()) // F10
  const [panelOpen, setPanelOpen] = useState(false)

  const geo = useGeo()

  async function load() {
    const [{ data: sp }, { data: acts }, { data: intents }, { data: blocks }] = await Promise.all([
      supabase.from('sports').select('*').order('sort_order'),
      supabase
        .from('activities')
        .select(ACTIVITY_SELECT)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true }),
      supabase.from('meet_intents').select('from_profile').eq('to_profile', profile.id),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', profile.id),
    ])
    setSports((sp as Sport[]) ?? [])
    setActivities((acts as unknown as Activity[]) ?? [])
    setRevoirCount(new Set((intents ?? []).map((i: { from_profile: string }) => i.from_profile)).size)
    setBlocked(new Set((blocks ?? []).map((b: { blocked_id: string }) => b.blocked_id)))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const geoOn = geo.status === 'granted' && !!geo.coords
  // The feed is centred on the home neighbourhood by default; live GPS ("Près de
  // moi") overrides it when granted. Everything is distance-based from this point.
  const home =
    profile.home_lat != null && profile.home_lng != null
      ? { lat: profile.home_lat, lng: profile.home_lng }
      : null
  const center = geoOn ? geo.coords : home
  const hasCenter = !!center

  // Apply every filter, then sort by proximity when a centre exists, else by date.
  const shown = useMemo(() => {
    const todayEnd = endOfToday().getTime()
    const weekEnd = Date.now() + 7 * 24 * 3600 * 1000
    const rows = activities
      .map((a) => ({ a, dist: activityDistanceKm(a, center) }))
      .filter(({ a, dist }) => {
        if (blocked.has(a.organizer_id)) return false // F10 — masque les profils bloqués
        if (verifiedOnly && !a.organizer.verified) return false // F10 — vérifiés uniquement
        if (sport !== 'all' && a.sport_key !== sport) return false
        const t = +new Date(a.starts_at)
        if (dateKey === 'today' && t > todayEnd) return false
        if (dateKey === 'week' && t > weekEnd) return false
        if (level !== 'all' && a.level !== level && a.level !== 'Tous niveaux') return false
        if (onlyAvail && slotsLeft(a) <= 0) return false
        // Distance radius around the home/GPS centre (e.g. ≤ 10 km).
        if (hasCenter && maxDist != null && (dist == null || dist > maxDist)) return false
        return true
      })
    rows.sort((x, y) =>
      hasCenter && x.dist != null && y.dist != null
        ? x.dist - y.dist
        : +new Date(x.a.starts_at) - +new Date(y.a.starts_at),
    )
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, sport, dateKey, level, onlyAvail, maxDist, verifiedOnly, blocked, geoOn, geo.coords, profile.home_lat, profile.home_lng])

  // Only activities with a free place are actually "looking for players" — a full
  // one is still listed (waitlist stays open) but must not inflate the headline.
  const seekingCount = useMemo(() => shown.filter(({ a }) => slotsLeft(a) > 0).length, [shown])

  async function join(a: Activity) {
    if (new Date(a.starts_at).getTime() <= Date.now()) return // a started match no longer takes inscriptions
    setBusyId(a.id)
    const status = slotsLeft(a) <= 0 || a.mode === 'wait' ? 'waitlist' : a.mode === 'direct' ? 'confirmed' : 'pending'
    const { error } = await supabase.from('activity_participants').insert({ activity_id: a.id, profile_id: profile.id, status })
    if (error) {
      // Surface the failure instead of silently "succeeding": the CTA would
      // otherwise reset and the player would think they joined.
      setJoinError("Impossible de rejoindre cette activité. Réessaie dans un instant.")
      setBusyId(null)
      return
    }
    setJoinError(null)
    await load()
    setBusyId(null)
  }

  const filterDefs = [{ key: 'all', label: 'Tous' }, ...sports.map((s) => ({ key: s.key, label: s.label }))]
  const activeCount =
    (dateKey !== 'all' ? 1 : 0) +
    (level !== 'all' ? 1 : 0) +
    (onlyAvail ? 1 : 0) +
    (maxDist != null ? 1 : 0) +
    (verifiedOnly ? 1 : 0)

  return (
    <div>
      {joinError && (
        <div
          role="alert"
          onClick={() => setJoinError(null)}
          style={{
            background: '#F2E6E6',
            color: '#A53F3F',
            border: '1px solid #E2C9C9',
            borderRadius: 12,
            padding: '11px 14px',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
            cursor: 'pointer',
          }}
        >
          {joinError}
        </div>
      )}
      {/* hero */}
      <div style={{ paddingBottom: 4 }}>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 40, lineHeight: 1.06, fontWeight: 500, letterSpacing: '-.02em' }}>
          Près de toi, ce soir
        </h1>
        <p style={{ marginTop: 8, fontSize: 15, color: C.muted, fontWeight: 500 }}>
          {seekingCount > 0
            ? `${seekingCount} activité${seekingCount > 1 ? 's' : ''} cherche${seekingCount > 1 ? 'nt' : ''} encore des joueurs`
            : shown.length > 0
              ? `${shown.length} activité${shown.length > 1 ? 's' : ''} près de toi · liste d'attente ouverte`
              : 'Aucune activité pour le moment'}
          {hasCenter && shown.length > 0 && ' · triées par distance'}
        </p>
      </div>

      {/* sport chips */}
      <div className="tu-scroll" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '18px 0 12px' }}>
        {filterDefs.map((d) => {
          const on = sport === d.key
          return (
            <button key={d.key} onClick={() => setSport(d.key)} style={chip(on)}>
              {d.label}
            </button>
          )
        })}
      </div>

      {/* secondary toolbar: geo + filters toggle */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingBottom: 14 }}>
        <GeoButton geo={geo} active={geoOn} />
        <button
          onClick={() => setPanelOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '9px 14px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${panelOpen || activeCount ? C.prune : C.line}`,
            background: panelOpen || activeCount ? C.pruneSoft : C.card,
            color: C.prune,
            transition: 'all .15s',
          }}
        >
          Filtres
          {activeCount > 0 && (
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                fontWeight: 700,
                background: C.prune,
                color: '#fff',
                borderRadius: 999,
                minWidth: 18,
                height: 18,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
              }}
            >
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            onClick={() => {
              setDateKey('all')
              setLevel('all')
              setOnlyAvail(false)
              setMaxDist(null)
              setVerifiedOnly(false)
            }}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* expandable filter panel */}
      {panelOpen && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 18,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <FilterGroup label="QUAND">
            {DATE_DEFS.map((d) => (
              <Pill key={d.k} on={dateKey === d.k} onClick={() => setDateKey(d.k)}>
                {d.l}
              </Pill>
            ))}
          </FilterGroup>

          <FilterGroup label="NIVEAU">
            {LEVEL_DEFS.map((lv) => (
              <Pill key={lv} on={level === lv} onClick={() => setLevel(lv)}>
                {lv === 'all' ? 'Tous' : lv}
              </Pill>
            ))}
          </FilterGroup>

          <FilterGroup label="DISPONIBILITÉ">
            <Pill on={onlyAvail} onClick={() => setOnlyAvail((v) => !v)}>
              Places dispo
            </Pill>
          </FilterGroup>

          <FilterGroup label="SÉCURITÉ">
            <Pill on={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)}>
              Profils vérifiés uniquement
            </Pill>
          </FilterGroup>

          <FilterGroup label="DISTANCE">
            {hasCenter ? (
              DIST_DEFS.map((d) => (
                <Pill key={d.l} on={maxDist === d.km} onClick={() => setMaxDist(d.km)}>
                  {d.l}
                </Pill>
              ))
            ) : (
              <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>
                Renseigne ta zone (profil) ou active « Près de moi » pour filtrer par distance.
              </span>
            )}
          </FilterGroup>
        </div>
      )}

      {/* "ouvert à se revoir" banner */}
      <div style={{ paddingBottom: 22 }}>
        <button
          onClick={() => go('revoir')}
          className="tu-press"
          style={{
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'linear-gradient(100deg,#5C2049,#7A2E62)',
            border: 'none',
            borderRadius: 22,
            padding: '20px 22px',
            cursor: 'pointer',
            boxShadow: '0 16px 34px -16px rgba(92,32,73,.7)',
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
      <div className="tu-feed-grid">
        {shown.map(({ a, dist }) => (
          <Card
            key={a.id}
            a={a}
            dist={dist}
            me={profile.id}
            busy={busyId === a.id}
            onJoin={() => join(a)}
            onManage={() => go('manage', a.id)}
            onPlayer={(id) => go('player', id)}
          />
        ))}
      </div>
      {shown.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '40px 0' }}>
          Aucune activité pour ces filtres. Élargis ta recherche ou crée la tienne en 30 secondes.
        </div>
      )}
    </div>
  )
}

function GeoButton({ geo, active }: { geo: ReturnType<typeof useGeo>; active: boolean }) {
  if (geo.status === 'unsupported') return null
  const label =
    geo.status === 'locating'
      ? 'Localisation…'
      : geo.status === 'denied'
        ? 'Réessayer la localisation'
        : active
          ? 'Autour de moi'
          : 'Près de moi'
  return (
    <button
      onClick={() => (active ? geo.clear() : geo.request())}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 14px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        border: `1px solid ${active ? C.prune : C.line}`,
        background: active ? C.prune : C.card,
        color: active ? '#fff' : C.ink,
        transition: 'all .15s',
      }}
    >
      <Pin size={14} stroke={active ? '#fff' : C.prune} sw={1.9} />
      {label}
      {active && <span style={{ fontSize: 11, opacity: 0.85 }}>✓</span>}
    </button>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '1.2px', color: C.muted, fontWeight: 600, marginBottom: 9 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        border: `1px solid ${on ? C.prune : C.line}`,
        background: on ? C.prune : C.paper,
        color: on ? '#fff' : C.ink,
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  )
}

function chip(on: boolean): React.CSSProperties {
  return {
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
  }
}

function Card({
  a,
  dist,
  me,
  busy,
  onJoin,
  onManage,
  onPlayer,
}: {
  a: Activity
  dist: number | null
  me: string
  busy: boolean
  onJoin: () => void
  onManage: () => void
  onPlayer: (profileId: string) => void
}) {
  const left = slotsLeft(a)
  const soft = left <= 0 || a.mode === 'wait'
  const confirmed = a.participants.filter((p) => p.status === 'confirmed')
  const mine = a.participants.find((p) => p.profile_id === me)
  const isOrganizer = a.organizer_id === me

  const pending = a.participants.filter((p) => p.status === 'pending').length

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
      onClick={() => navigate(`/a/${a.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/a/${a.id}`)
        }
      }}
      style={{
        background: C.card,
        borderRadius: 24,
        border: `1px solid ${C.line}`,
        overflow: 'hidden',
        boxShadow: '0 2px 10px -4px rgba(40,28,34,.08)',
        cursor: 'pointer',
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
        {dist != null && (
          <div
            style={{
              position: 'absolute',
              right: 13,
              bottom: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255,255,255,.85)',
              backdropFilter: 'blur(4px)',
              borderRadius: 999,
              padding: '4px 9px',
              fontSize: 11.5,
              fontWeight: 700,
              color: C.prune,
            }}
          >
            <Pin size={11} stroke={C.prune} sw={2} />
            {formatDistance(dist)}
          </div>
        )}
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
          {activityHeadline(a)}
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
            role="link"
            tabIndex={0}
            title={`Voir le profil de ${a.organizer.first_name}`}
            onClick={(e) => {
              e.stopPropagation()
              onPlayer(a.organizer_id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onPlayer(a.organizer_id)
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
          >
            <Avatar
              url={a.organizer.avatar_url}
              color={a.organizer.avatar_color}
              letter={a.organizer.first_name[0]}
              size={34}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 600 }}>
                {a.organizer.first_name} {a.organizer.last_initial}
                {a.organizer.verified && <VerifiedDot />}
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '.3px', color: C.green, fontWeight: 500 }}>
                {a.organizer.attendance_pct}% présence · {a.organizer.matches_played} matchs
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {confirmed.slice(0, 4).map((p, i) => (
              <div
                key={p.profile_id}
                role="link"
                tabIndex={0}
                title={`Voir le profil de ${p.profile.first_name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayer(p.profile_id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onPlayer(p.profile_id)
                  }
                }}
                style={{
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  marginLeft: i === 0 ? 0 : -9,
                  position: 'relative',
                  zIndex: 10 - i,
                  cursor: 'pointer',
                }}
              >
                <Avatar
                  url={p.profile.avatar_url}
                  color={p.profile.avatar_color}
                  letter={p.profile.first_name[0]}
                  size={31}
                />
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

        {isOrganizer ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onManage()
            }}
            className="tu-press"
            style={{
              marginTop: 15,
              width: '100%',
              padding: 13,
              borderRadius: 13,
              border: 'none',
              background: C.prune,
              color: '#fff',
              fontSize: 14.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            Gérer l'activité
            {pending > 0 && (
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: 'rgba(255,255,255,.22)',
                  borderRadius: 999,
                  padding: '1px 8px',
                }}
              >
                {pending} en attente
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={
              mine
                ? (e) => e.stopPropagation()
                : (e) => {
                    e.stopPropagation()
                    onJoin()
                  }
            }
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
        )}
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
