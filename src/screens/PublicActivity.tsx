import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { C, FONT, MODE_LABEL } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Activity, Profile } from '../lib/types'
import { activityHeadline, formatSlot, placesLabel, slotsLeft, confirmedCount } from '../lib/format'
import { useActivity } from '../lib/useActivity'
import { navigate } from '../lib/router'
import ShareBar from '../components/ShareBar'
import { Pin, Clock, Lock, Check, VerifiedDot } from '../components/icons'

// Public, shareable activity page (/a/:id). Consultable without an account.
// The exact address stays hidden until the viewer is the organizer or accepted.
export default function PublicActivity({
  id,
  session,
  profile,
  sessionLoading,
}: {
  id: string
  session: Session | null
  profile: Profile | null
  sessionLoading: boolean
}) {
  const { activity, loading, notFound, reload } = useActivity(id)
  const [busy, setBusy] = useState(false)
  const [address, setAddress] = useState<string | null>(null)

  const me = profile?.id
  const mine = activity?.participants.find((p) => p.profile_id === me)
  const isOrganizer = !!me && activity?.organizer_id === me
  const accepted = isOrganizer || mine?.status === 'confirmed'

  // Reflect the activity in the browser tab (in-app context; crawlers use the
  // static OG tags in index.html).
  useEffect(() => {
    if (activity) document.title = `${activity.sport.label} · ${activity.venue_name} — TeamUp`
    return () => {
      document.title = 'TeamUp — Compléter un match en quelques minutes'
    }
  }, [activity])

  // Reveal the exact address only once accepted — via the guarded RPC.
  useEffect(() => {
    if (!accepted) {
      setAddress(null)
      return
    }
    supabase.rpc('activity_exact_address', { aid: id }).then(({ data }) => setAddress((data as string) ?? null))
  }, [accepted, id])

  if (loading) return <PublicShell><Centered>Chargement…</Centered></PublicShell>
  if (notFound || !activity)
    return (
      <PublicShell>
        <Centered>
          <div style={{ fontFamily: FONT.serif, fontSize: 24, fontWeight: 500 }}>Activité introuvable</div>
          <p style={{ color: C.muted, marginTop: 8, fontSize: 14 }}>Ce lien a peut-être expiré.</p>
          <LinkBtn onClick={() => navigate('/')}>Découvrir TeamUp</LinkBtn>
        </Centered>
      </PublicShell>
    )

  const left = slotsLeft(activity)
  const soft = left <= 0 || activity.mode === 'wait'
  // Once the slot has started, the match no longer accepts inscriptions — the DB
  // enforces this too (participants_insert RLS), this is the matching UI guard.
  const isPast = new Date(activity.starts_at).getTime() <= Date.now()

  async function join() {
    if (!activity || !me || isPast) return
    setBusy(true)
    const status = soft ? 'waitlist' : activity.mode === 'direct' ? 'confirmed' : 'pending'
    const { error } = await supabase
      .from('activity_participants')
      .insert({ activity_id: activity.id, profile_id: me, status })
    await reload()
    setBusy(false)
    if (error) return // RLS guard (e.g. the match just started) — UI already reflects it after reload
  }

  return (
    <PublicShell>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 26,
          overflow: 'hidden',
          boxShadow: '0 10px 36px -18px rgba(40,28,34,.25)',
        }}
      >
        {/* tinted sport header */}
        <div style={{ height: 132, position: 'relative', background: activity.sport.tint, overflow: 'hidden' }}>
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
              left: 16,
              top: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,.85)',
              backdropFilter: 'blur(4px)',
              borderRadius: 999,
              padding: '6px 13px 6px 7px',
            }}
          >
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                fontWeight: 600,
                color: activity.sport.color,
                background: activity.sport.tint,
                padding: '3px 7px',
                borderRadius: 6,
                letterSpacing: '.5px',
              }}
            >
              {activity.sport.code}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{activity.sport.label}</span>
          </div>
          <div
            style={{
              position: 'absolute',
              right: 16,
              top: 16,
              background: C.ink,
              color: '#fff',
              borderRadius: 999,
              padding: '7px 13px',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {placesLabel(activity)}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 17,
              bottom: 12,
              fontFamily: FONT.mono,
              fontSize: 10,
              letterSpacing: '1px',
              color: 'rgba(28,24,21,.45)',
            }}
          >
            {activity.venue_code}
          </div>
        </div>

        <div style={{ padding: '20px 22px 24px' }}>
          <h1 style={{ fontFamily: FONT.serif, fontSize: 27, fontWeight: 500, lineHeight: 1.12, letterSpacing: '-.01em' }}>
            {activityHeadline(activity)}
          </h1>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Row icon={<Pin />} text={activity.venue_name} />
            <Row icon={<Clock />} text={formatSlot(activity)} />
          </div>

          <div style={{ display: 'flex', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
            <Tag>{activity.level}</Tag>
            <Tag muted>{MODE_LABEL[activity.mode]}</Tag>
            {activity.poste && <Tag muted>{activity.poste}</Tag>}
          </div>

          {/* slot counter */}
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: C.paper,
              border: `1px solid ${C.line}`,
              borderRadius: 16,
              padding: '14px 16px',
            }}
          >
            <div style={{ textAlign: 'center', minWidth: 54 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 26, fontWeight: 600, lineHeight: 1, color: left > 0 ? C.prune : C.green }}>
                {left > 0 ? left : '✓'}
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginTop: 3 }}>
                {left > 0 ? 'place' + (left > 1 ? 's' : '') : 'complet'}
              </div>
            </div>
            <div style={{ flex: 1, fontSize: 13, color: C.muted, fontWeight: 500, lineHeight: 1.4 }}>
              {confirmedCount(activity)} / {activity.total_slots} joueurs confirmés
              <span style={{ display: 'block', fontSize: 11.5, color: C.faint }}>Mis à jour en temps réel</span>
            </div>
          </div>

          {/* address: masked before acceptance */}
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: accepted ? C.greenSoft : C.paper,
              border: `1px solid ${accepted ? C.green : C.line}`,
              borderRadius: 14,
              padding: '12px 15px',
              fontSize: 13,
              fontWeight: 500,
              color: accepted ? C.green : C.muted,
            }}
          >
            {accepted ? <Check size={14} stroke={C.green} /> : <Lock size={14} stroke={C.prune} />}
            {accepted ? address ?? 'Adresse exacte disponible' : maskedAddressCopy(activity.mode)}
          </div>

          <div style={{ height: 1, background: C.line, margin: '18px 0' }} />

          {/* organizer + reliability */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                flex: 'none',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: activity.organizer.avatar_color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {activity.organizer.first_name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14.5, fontWeight: 600 }}>
                {activity.organizer.first_name} {activity.organizer.last_initial}
                {activity.organizer.verified && <VerifiedDot />}
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.green, fontWeight: 500, marginTop: 1 }}>
                {activity.organizer.attendance_pct}% présence · {activity.organizer.matches_played} matchs · organisateur
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 18 }}>
            <Cta
              sessionLoading={sessionLoading}
              hasSession={!!session}
              isOrganizer={isOrganizer}
              isPast={isPast}
              mine={mine?.status ?? null}
              soft={soft}
              mode={activity.mode}
              busy={busy}
              onJoin={join}
              onManage={() => navigate(`/?manage=${activity.id}`)}
              onLogin={() => navigate('/')}
            />
          </div>

          {/* share */}
          <div style={{ marginTop: 22 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.muted, fontWeight: 600, marginBottom: 11 }}>
              PARTAGER SANS FRICTION
            </div>
            <ShareBar activity={activity} />
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11.5, color: C.faint, fontWeight: 500, marginTop: 18 }}>
        Propulsé par <strong style={{ color: C.muted }}>TeamUp</strong> · compléter un match en quelques minutes
      </p>
    </PublicShell>
  )
}

function Cta({
  sessionLoading,
  hasSession,
  isOrganizer,
  isPast,
  mine,
  soft,
  mode,
  busy,
  onJoin,
  onManage,
  onLogin,
}: {
  sessionLoading: boolean
  hasSession: boolean
  isOrganizer: boolean
  isPast: boolean
  mine: string | null
  soft: boolean
  mode: Activity['mode']
  busy: boolean
  onJoin: () => void
  onManage: () => void
  onLogin: () => void
}) {
  if (sessionLoading) return <Primary disabled>…</Primary>

  if (isOrganizer)
    return (
      <Primary onClick={onManage}>Gérer l'activité</Primary>
    )

  // A finished match no longer takes inscriptions — show the state to everyone
  // (your own status still wins below, so a confirmed player keeps their badge).
  if (isPast && !mine) return <Soft>Cette activité est terminée</Soft>

  if (mine) {
    const label =
      mine === 'confirmed' ? 'Tu es inscrit ✓' : mine === 'pending' ? 'Demande envoyée — en attente' : "Sur liste d'attente"
    return <Soft>{label}</Soft>
  }

  if (!hasSession)
    return (
      <>
        <Primary onClick={onLogin}>Se connecter pour rejoindre</Primary>
        <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 9, fontWeight: 500 }}>
          Consultation libre · un compte est requis pour rejoindre.
        </p>
      </>
    )

  const label = soft ? "Rejoindre la liste d'attente" : mode === 'direct' ? 'Rejoindre' : 'Demander à rejoindre'
  return (
    <Primary onClick={onJoin} disabled={busy} soft={soft}>
      {busy ? '…' : label}
    </Primary>
  )
}

function Primary({
  children,
  onClick,
  disabled,
  soft,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  soft?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="tu-press"
      style={{
        width: '100%',
        padding: 15,
        borderRadius: 15,
        border: soft ? `1px solid ${C.line}` : 'none',
        background: soft ? C.pruneSoft : C.prune,
        color: soft ? C.prune : '#fff',
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Soft({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        padding: 14,
        borderRadius: 15,
        textAlign: 'center',
        background: C.pruneSoft,
        color: C.prune,
        fontSize: 14.5,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: C.paper }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(255,255,255,.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: '0 22px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', color: C.ink }}>
            Team<span style={{ color: C.prune }}>Up</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="tu-press"
            style={{
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 999,
              padding: '8px 15px',
              fontSize: 13,
              fontWeight: 600,
              color: C.ink,
              cursor: 'pointer',
            }}
          >
            Se connecter
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '26px 22px 60px' }}>{children}</main>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: 'center', padding: '60px 0' }}>{children}</div>
}

function LinkBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tu-press"
      style={{ marginTop: 18, background: C.prune, color: '#fff', border: 'none', borderRadius: 13, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}

// Address-masking copy, matched to the join model so the message never
// contradicts when the address actually unlocks:
//  - direct  → revealed as soon as you join (no validation step)
//  - approve → revealed once the organizer accepts you
//  - wait    → revealed once a freed place confirms you
function maskedAddressCopy(mode: Activity['mode']): string {
  if (mode === 'direct') return "L'adresse exacte s'affiche dès que tu rejoins"
  if (mode === 'wait') return "L'adresse exacte est communiquée une fois ta place confirmée"
  return "L'adresse exacte est communiquée après acceptation"
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: C.muted, fontWeight: 500 }}>
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
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        padding: '4px 9px',
      }}
    >
      {children}
    </span>
  )
}
