import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Profile as ProfileT, Sport } from '../lib/types'
import { Check, Share, Dots, Heart } from '../components/icons'
import type { ScreenName } from '../App'

type PlayingRow = { level: string; sport: Sport }
type HistoryRow = { sport: string; meta: string; present: boolean }

const DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
const MONTHS = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.']

export default function Profile({
  profile,
  setProfile,
  go,
}: {
  profile: ProfileT
  setProfile: (p: ProfileT) => void
  refreshProfile: () => void
  go: (s: ScreenName) => void
}) {
  void go
  const [playing, setPlaying] = useState<PlayingRow[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])

  useEffect(() => {
    supabase
      .from('profile_sports')
      .select('level, sport:sports(*)')
      .eq('profile_id', profile.id)
      .then(({ data }) => setPlaying((data as unknown as PlayingRow[]) ?? []))

    supabase
      .from('activity_participants')
      .select('checked_in, status, activity:activities(starts_at, venue_name, sport:sports(label))')
      .eq('profile_id', profile.id)
      .then(({ data }) => {
        const rows = ((data as unknown as Array<{
          checked_in: boolean | null
          activity: { starts_at: string; venue_name: string; sport: { label: string } } | null
        }>) ?? [])
          .filter((r) => r.activity && new Date(r.activity.starts_at) < new Date())
          .sort((a, b) => +new Date(b.activity!.starts_at) - +new Date(a.activity!.starts_at))
          .slice(0, 4)
          .map((r) => {
            const d = new Date(r.activity!.starts_at)
            const venue = r.activity!.venue_name.split(' · ')[0]
            return {
              sport: r.activity!.sport.label,
              meta: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${venue}`,
              present: r.checked_in !== false,
            }
          })
        setHistory(rows)
      })
  }, [profile.id])

  async function toggleOpen() {
    const next = !profile.open_to_meet
    setProfile({ ...profile, open_to_meet: next })
    await supabase.from('profiles').update({ open_to_meet: next }).eq('id', profile.id)
  }

  const badges = [profile.verified ? 'Vérifié' : null, 'Ponctuel', 'Capitaine'].filter(Boolean) as string[]
  const circumference = 2 * Math.PI * 37
  const dash = (profile.attendance_pct / 100) * circumference

  return (
    <div style={{ paddingBottom: 26 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 22px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Profil</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={iconBtn} title="Partager">
            <Share />
          </button>
          <button style={iconBtn} onClick={() => supabase.auth.signOut()} title="Déconnexion / réglages">
            <Dots />
          </button>
        </div>
      </div>

      {/* identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 22px 4px', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 88, height: 88 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: 'linear-gradient(150deg,#5C2049,#8A3A6F)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT.serif,
              fontSize: 36,
            }}
          >
            {profile.first_name[0]}
          </div>
          {profile.verified && (
            <span
              style={{
                position: 'absolute',
                right: 0,
                bottom: 2,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: C.prune,
                border: `3px solid ${C.paper}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={13} />
            </span>
          )}
        </div>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 27, fontWeight: 500, marginTop: 12 }}>
          {profile.first_name} {profile.last_initial}
        </h1>
        <p style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 2 }}>
          Organisateur · {profile.city} · Actif aujourd'hui
        </p>
      </div>

      {/* reliability */}
      <div
        style={{
          margin: '14px 22px 0',
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 22,
          padding: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div style={{ position: 'relative', flex: 'none', width: 84, height: 84 }}>
          <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="42" cy="42" r="37" fill="none" stroke={C.line} strokeWidth="8" />
            <circle
              cx="42"
              cy="42"
              r="37"
              fill="none"
              stroke={C.green}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash.toFixed(1)} ${(circumference - dash).toFixed(1)}`}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 20, fontWeight: 600, color: C.green }}>{profile.attendance_pct}%</span>
            <span style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>présence</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Stat n={profile.matches_played} label="matchs joués cette saison" />
          <div style={{ height: 1, background: C.line }} />
          <Stat n={profile.late_cancels} label="annulation tardive" />
        </div>
      </div>

      {/* badges */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 22px 0', flexWrap: 'wrap' }}>
        {badges.map((b) => (
          <span
            key={b}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 999,
              padding: '7px 13px',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.prune }} />
            {b}
          </span>
        ))}
      </div>

      {/* what I play */}
      <Card label="CE QUE JE JOUE" labelColor={C.prune}>
        <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {playing.map((s) => (
            <div key={s.sport.key} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  fontWeight: 600,
                  color: s.sport.color,
                  background: s.sport.tint,
                  padding: '5px 9px',
                  borderRadius: 8,
                  letterSpacing: '.5px',
                }}
              >
                {s.sport.code}
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{s.sport.label}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 500, color: C.muted }}>
                {s.level.toUpperCase()}
              </span>
            </div>
          ))}
          {playing.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Ajoute tes sports favoris.</span>}
        </div>
      </Card>

      {/* perfect match prompt */}
      {profile.perfect_match && (
        <div style={{ margin: '14px 22px 0', background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 20 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.muted, fontWeight: 600 }}>
            LE MATCH PARFAIT POUR MOI
          </div>
          <p style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22, lineHeight: 1.28, marginTop: 10, letterSpacing: '-.01em' }}>
            {profile.perfect_match}
          </p>
        </div>
      )}

      {/* history */}
      <div style={{ margin: '18px 22px 0' }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.muted, fontWeight: 600, paddingLeft: 4 }}>
          DERNIERS MATCHS
        </div>
        <div style={{ marginTop: 10, background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, overflow: 'hidden' }}>
          {history.map((h, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderTop: i === 0 ? 'none' : `1px solid ${C.line}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{h.sport}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{h.meta}</div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: h.present ? C.green : '#A53F3F',
                  background: h.present ? C.greenSoft : '#F2E6E6',
                  borderRadius: 999,
                  padding: '5px 11px',
                }}
              >
                {h.present ? 'Présent' : 'Absent'}
              </span>
            </div>
          ))}
          {history.length === 0 && (
            <div style={{ padding: '16px 18px', fontSize: 13, color: C.muted }}>Pas encore de match joué.</div>
          )}
        </div>
      </div>

      {/* open to meet toggle */}
      <div
        style={{
          margin: '18px 22px 0',
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 22,
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 13,
        }}
      >
        <span
          style={{
            flex: 'none',
            width: 40,
            height: 40,
            borderRadius: 12,
            background: C.pruneSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart size={20} fill={C.prune} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Ouvert à se revoir</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
            {profile.open_to_meet ? 'Activé · proposé après chaque match' : 'Désactivé par défaut'}
          </div>
        </div>
        <button
          onClick={toggleOpen}
          style={{
            flex: 'none',
            width: 46,
            height: 28,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            padding: 3,
            display: 'flex',
            justifyContent: profile.open_to_meet ? 'flex-end' : 'flex-start',
            background: profile.open_to_meet ? C.prune : '#D8D2C6',
            transition: 'all .2s',
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
        </button>
      </div>
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function Card({ label, labelColor, children }: { label: string; labelColor: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '18px 22px 0', background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 18 }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: labelColor, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: C.card,
  border: `1px solid ${C.line}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: C.ink,
}
