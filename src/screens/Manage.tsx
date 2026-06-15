import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Attendance, Participant, Profile } from '../lib/types'
import { confirmedCount, formatSlot, slotsLeft } from '../lib/format'
import { useActivity } from '../lib/useActivity'
import ShareBar from '../components/ShareBar'
import { ChevronLeft, Pin, Clock, Check, Close, Users, VerifiedDot } from '../components/icons'
import type { ScreenName } from '../App'

type Regular = Pick<Profile, 'id' | 'first_name' | 'last_initial' | 'avatar_color' | 'verified' | 'attendance_pct' | 'matches_played'>

export default function Manage({ id, profile, go }: { id: string; profile: Profile; go: (s: ScreenName) => void }) {
  const { activity, loading, notFound, reload } = useActivity(id)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [regulars, setRegulars] = useState<Regular[]>([])

  // Load the organizer's "regular players" — people they've played with before.
  useEffect(() => {
    let cancelled = false
    async function loadRegulars() {
      const { data: mine } = await supabase.from('activity_participants').select('activity_id').eq('profile_id', profile.id)
      const ids = (mine ?? []).map((r: { activity_id: string }) => r.activity_id)
      if (ids.length === 0) {
        if (!cancelled) setRegulars([])
        return
      }
      const { data } = await supabase
        .from('activity_participants')
        .select('profile:profiles(id, first_name, last_initial, avatar_color, verified, attendance_pct, matches_played)')
        .in('activity_id', ids)
        .neq('profile_id', profile.id)
      const seen = new Set<string>()
      const list: Regular[] = []
      for (const row of (data as unknown as Array<{ profile: Regular }>) ?? []) {
        if (row.profile && !seen.has(row.profile.id)) {
          seen.add(row.profile.id)
          list.push(row.profile)
        }
      }
      if (!cancelled) setRegulars(list.slice(0, 12))
    }
    loadRegulars()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  if (loading) return <Wrap><Center>Chargement…</Center></Wrap>
  if (notFound || !activity) return <Wrap><Center>Activité introuvable.</Center></Wrap>
  if (activity.organizer_id !== profile.id)
    return (
      <Wrap>
        <Back go={go} />
        <Center>Seul l'organisateur peut gérer cette activité.</Center>
      </Wrap>
    )

  const isPast = new Date(activity.starts_at) < new Date()
  const pending = activity.participants.filter((p) => p.status === 'pending')
  const confirmed = activity.participants.filter((p) => p.status === 'confirmed')
  const waitlist = activity.participants.filter((p) => p.status === 'waitlist')
  const left = slotsLeft(activity)
  const inActivity = new Set(activity.participants.map((p) => p.profile_id))
  const invitable = regulars.filter((r) => !inActivity.has(r.id))

  async function act(fn: () => PromiseLike<unknown>, key: string) {
    setBusyId(key)
    await fn()
    await reload()
    setBusyId(null)
  }

  const setStatus = (p: Participant, status: Participant['status']) =>
    act(() => supabase.from('activity_participants').update({ status }).eq('id', p.id!), p.id! + status)
  const refuse = (p: Participant) =>
    act(() => supabase.from('activity_participants').delete().eq('id', p.id!), p.id! + 'del')
  const invite = (r: Regular) =>
    act(
      () => supabase.from('activity_participants').insert({ activity_id: activity!.id, profile_id: r.id, status: 'confirmed' }),
      r.id,
    )
  const setAttendance = (p: Participant, attendance: Attendance) =>
    act(
      () =>
        supabase
          .from('activity_participants')
          .update({ attendance, checked_in: attendance === 'present' })
          .eq('id', p.id!),
      p.id! + attendance,
    )

  return (
    <Wrap>
      <Back go={go} />

      {/* summary + share */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 20, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 11,
              fontWeight: 600,
              color: activity.sport.color,
              background: activity.sport.tint,
              padding: '4px 8px',
              borderRadius: 7,
              letterSpacing: '.5px',
            }}
          >
            {activity.sport.code}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{activity.sport.label}</span>
        </div>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 24, fontWeight: 500, lineHeight: 1.12, marginTop: 11 }}>{activity.ask}</h1>
        <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Meta icon={<Pin />} text={activity.venue_name} />
          <Meta icon={<Clock />} text={formatSlot(activity)} />
        </div>

        {/* real-time slot counter */}
        <div
          style={{
            marginTop: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: 14,
            padding: '13px 16px',
          }}
        >
          <div style={{ textAlign: 'center', minWidth: 50 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 24, fontWeight: 600, lineHeight: 1, color: left > 0 ? C.prune : C.green }}>
              {left > 0 ? left : '✓'}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginTop: 2 }}>{left > 0 ? 'à compléter' : 'complet'}</div>
          </div>
          <div style={{ flex: 1, fontSize: 13, color: C.muted, fontWeight: 500 }}>
            <strong style={{ color: C.ink }}>{confirmedCount(activity)}</strong> / {activity.total_slots} confirmés ·{' '}
            <span style={{ color: C.green, fontWeight: 600 }}>live</span>
            <span style={{ display: 'block', fontSize: 11.5, color: C.faint }}>Compteur mis à jour en temps réel</span>
          </div>
        </div>

        {!isPast && (
          <div style={{ marginTop: 15 }}>
            <ShareBar activity={activity} />
          </div>
        )}
      </div>

      {/* ── CHECK-IN (past activity) ─────────────────────────── */}
      {isPast ? (
        <Section title="Check-in" hint="Marque la présence — les profils se recalculent automatiquement.">
          {confirmed.length === 0 && waitlist.length === 0 ? (
            <Empty>Personne n'était confirmé pour ce match.</Empty>
          ) : (
            [...confirmed, ...waitlist].map((p) => (
              <PlayerRow key={p.id} p={p}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <CheckBtn on={p.attendance === 'present'} tone="green" busy={busyId === p.id! + 'present'} onClick={() => setAttendance(p, 'present')}>
                    Présent
                  </CheckBtn>
                  <CheckBtn on={p.attendance === 'absent'} tone="red" busy={busyId === p.id! + 'absent'} onClick={() => setAttendance(p, 'absent')}>
                    Absent
                  </CheckBtn>
                  <CheckBtn on={p.attendance === 'late'} tone="amber" busy={busyId === p.id! + 'late'} onClick={() => setAttendance(p, 'late')}>
                    Annulé tard
                  </CheckBtn>
                </div>
              </PlayerRow>
            ))
          )}
        </Section>
      ) : (
        <>
          {/* ── PENDING REQUESTS ───────────────────────────── */}
          <Section title="Demandes en attente" count={pending.length}>
            {pending.length === 0 ? (
              <Empty>Aucune demande pour l'instant. Partage le lien pour attirer des joueurs.</Empty>
            ) : (
              pending.map((p) => (
                <PlayerRow key={p.id} p={p}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PillBtn tone="prune" busy={busyId === p.id! + 'confirmed'} onClick={() => setStatus(p, 'confirmed')}>
                      <Check size={11} stroke="#fff" /> Accepter
                    </PillBtn>
                    <PillBtn tone="soft" busy={busyId === p.id! + 'waitlist'} onClick={() => setStatus(p, 'waitlist')}>
                      Liste d'attente
                    </PillBtn>
                    <IconPill title="Refuser" busy={busyId === p.id! + 'del'} onClick={() => refuse(p)}>
                      <Close size={14} />
                    </IconPill>
                  </div>
                </PlayerRow>
              ))
            )}
          </Section>

          {/* ── CONFIRMED ──────────────────────────────────── */}
          <Section title="Confirmés" count={confirmed.length}>
            {confirmed.length === 0 ? (
              <Empty>Personne de confirmé pour le moment.</Empty>
            ) : (
              confirmed.map((p) => (
                <PlayerRow key={p.id} p={p}>
                  <IconPill title="Retirer" busy={busyId === p.id! + 'del'} onClick={() => refuse(p)}>
                    <Close size={14} />
                  </IconPill>
                </PlayerRow>
              ))
            )}
          </Section>

          {/* ── WAITLIST ───────────────────────────────────── */}
          {waitlist.length > 0 && (
            <Section title="Liste d'attente" count={waitlist.length}>
              {waitlist.map((p) => (
                <PlayerRow key={p.id} p={p}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PillBtn tone="prune" busy={busyId === p.id! + 'confirmed'} onClick={() => setStatus(p, 'confirmed')}>
                      <Check size={11} stroke="#fff" /> Accepter
                    </PillBtn>
                    <IconPill title="Refuser" busy={busyId === p.id! + 'del'} onClick={() => refuse(p)}>
                      <Close size={14} />
                    </IconPill>
                  </div>
                </PlayerRow>
              ))}
            </Section>
          )}

          {/* ── PRIORITY INVITE OF REGULARS ────────────────── */}
          <Section
            title="Inviter mes joueurs habituels"
            hint="Ajoute directement les joueurs fiables avec qui tu as l'habitude de jouer."
          >
            {invitable.length === 0 ? (
              <Empty>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Users size={16} stroke={C.muted} />
                  Aucun joueur habituel disponible pour l'instant.
                </span>
              </Empty>
            ) : (
              invitable.map((r) => (
                <PlayerRow key={r.id} p={asParticipant(r)}>
                  <PillBtn tone="prune" busy={busyId === r.id} onClick={() => invite(r)}>
                    <Users size={13} stroke="#fff" /> Inviter
                  </PillBtn>
                </PlayerRow>
              ))
            )}
          </Section>
        </>
      )}
    </Wrap>
  )
}

// Render a "regular" using the shared player row.
function asParticipant(r: Regular): Participant {
  return {
    profile_id: r.id,
    status: 'confirmed',
    checked_in: null,
    attendance: null,
    profile: { ...r, late_cancels: 0 },
  }
}

function PlayerRow({ p, children }: { p: Participant; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 4px',
        borderTop: `1px solid ${C.line}`,
      }}
    >
      <div
        style={{
          flex: 'none',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: p.profile.avatar_color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {p.profile.first_name[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14.5, fontWeight: 600 }}>
          {p.profile.first_name} {p.profile.last_initial}
          {p.profile.verified && <VerifiedDot />}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.green, fontWeight: 500, marginTop: 1 }}>
          {p.profile.attendance_pct}% présence · {p.profile.matches_played} matchs
        </div>
      </div>
      <div style={{ flex: 'none' }}>{children}</div>
    </div>
  )
}

function Section({
  title,
  count,
  hint,
  children,
}: {
  title: string
  count?: number
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 4px' }}>
        <h2 style={{ fontFamily: FONT.serif, fontSize: 20, fontWeight: 500 }}>{title}</h2>
        {count !== undefined && (
          <span style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 600, color: C.prune }}>{count}</span>
        )}
      </div>
      {hint && <p style={{ padding: '4px 4px 0', fontSize: 12.5, color: C.muted, fontWeight: 500, lineHeight: 1.4 }}>{hint}</p>}
      <div style={{ marginTop: 8, background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '4px 16px 8px' }}>
        {children}
      </div>
    </div>
  )
}

function PillBtn({
  children,
  tone,
  busy,
  onClick,
}: {
  children: React.ReactNode
  tone: 'prune' | 'soft'
  busy?: boolean
  onClick: () => void
}) {
  const prune = tone === 'prune'
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="tu-press"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        border: prune ? 'none' : `1px solid ${C.line}`,
        background: prune ? C.prune : C.card,
        color: prune ? '#fff' : C.ink,
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: busy ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

function IconPill({ children, title, busy, onClick }: { children: React.ReactNode; title: string; busy?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={title}
      className="tu-press"
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: `1px solid ${C.line}`,
        background: C.card,
        color: C.muted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

function CheckBtn({
  children,
  on,
  tone,
  busy,
  onClick,
}: {
  children: React.ReactNode
  on: boolean
  tone: 'green' | 'red' | 'amber'
  busy?: boolean
  onClick: () => void
}) {
  const palette = {
    green: { bg: C.green, soft: C.greenSoft, fg: C.green },
    red: { bg: '#A53F3F', soft: '#F2E6E6', fg: '#A53F3F' },
    amber: { bg: '#B7791F', soft: '#F6EEDD', fg: '#B7791F' },
  }[tone]
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="tu-press"
      style={{
        border: on ? 'none' : `1px solid ${C.line}`,
        background: on ? palette.bg : palette.soft,
        color: on ? '#fff' : palette.fg,
        borderRadius: 10,
        padding: '8px 11px',
        fontSize: 12,
        fontWeight: 600,
        cursor: busy ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Back({ go }: { go: (s: ScreenName) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={() => go('feed')}
        style={{
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
        }}
      >
        <ChevronLeft />
      </button>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Gestion de l'activité</div>
    </div>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 640, margin: '0 auto' }}>{children}</div>
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '40px 0' }}>{children}</div>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '14px 0', fontSize: 13, color: C.muted, fontWeight: 500 }}>{children}</div>
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: C.muted, fontWeight: 500 }}>
      {icon}
      <span>{text}</span>
    </div>
  )
}
