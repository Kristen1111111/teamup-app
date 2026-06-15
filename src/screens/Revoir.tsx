import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { ChevronLeft, Lock, Heart } from '../components/icons'
import type { Go } from '../App'

type Coplayer = { id: string; name: string; initial: string; color: string; meta: string }
type Kind = 'rejouer' | 'ami' | 'plus'
const KINDS: { k: Kind; l: string }[] = [
  { k: 'rejouer', l: 'Rejouer' },
  { k: 'ami', l: 'Ami·e' },
  { k: 'plus', l: 'Ouvert à plus' },
]
const DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']

function key(id: string, k: Kind) {
  return `${id}:${k}`
}

export default function Revoir({ profile, go }: { profile: Profile; go: Go }) {
  const [activityId, setActivityId] = useState<string | null>(null)
  const [meta, setMeta] = useState('APRÈS TON DERNIER MATCH')
  const [coplayers, setCoplayers] = useState<Coplayer[]>([])
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [incoming, setIncoming] = useState<Set<string>>(new Set())

  async function load() {
    // most recent past activity I took part in
    const { data: parts } = await supabase
      .from('activity_participants')
      .select('activity:activities(id, starts_at, venue_code)')
      .eq('profile_id', profile.id)
    const past = ((parts as unknown as Array<{ activity: { id: string; starts_at: string; venue_code: string } | null }>) ?? [])
      .map((p) => p.activity)
      .filter((a): a is { id: string; starts_at: string; venue_code: string } => !!a && new Date(a.starts_at) < new Date())
      .sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at))
    const match = past[0]
    if (!match) {
      setActivityId(null)
      return
    }
    setActivityId(match.id)

    const d = new Date(match.starts_at)
    const yest = new Date()
    yest.setDate(yest.getDate() - 1)
    const dayLabel = d.toDateString() === yest.toDateString() ? 'HIER' : DAYS[d.getDay()].toUpperCase()
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    setMeta(`${dayLabel} · ${hhmm} · ${match.venue_code}`)

    const [{ data: cop }, { data: intents }] = await Promise.all([
      supabase
        .from('activity_participants')
        .select('profile:profiles(id, first_name, last_initial, avatar_color, attendance_pct, matches_played)')
        .eq('activity_id', match.id)
        .neq('profile_id', profile.id),
      supabase.from('meet_intents').select('from_profile, to_profile, kind').eq('activity_id', match.id),
    ])

    setCoplayers(
      ((cop as unknown as Array<{ profile: { id: string; first_name: string; last_initial: string; avatar_color: string; attendance_pct: number; matches_played: number } }>) ?? []).map(
        (r) => ({
          id: r.profile.id,
          name: `${r.profile.first_name} ${r.profile.last_initial}`,
          initial: r.profile.first_name[0],
          color: r.profile.avatar_color,
          meta: `${r.profile.attendance_pct}% présence · ${r.profile.matches_played} matchs`,
        }),
      ),
    )

    const mineSet = new Set<string>()
    const inSet = new Set<string>()
    for (const i of (intents as unknown as Array<{ from_profile: string; to_profile: string; kind: Kind }>) ?? []) {
      if (i.from_profile === profile.id) mineSet.add(key(i.to_profile, i.kind))
      if (i.to_profile === profile.id) inSet.add(key(i.from_profile, i.kind))
    }
    setMine(mineSet)
    setIncoming(inSet)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // F9 — ouvre (ou crée) le fil 1-à-1 avec ce co-joueur et bascule sur la messagerie
  async function discuter(coId: string) {
    const { data, error } = await supabase.rpc('dm_conversation', { other: coId })
    if (!error && data) go('messages', data as string)
  }

  async function toggle(coId: string, k: Kind) {
    if (!activityId) return
    const kk = key(coId, k)
    const next = new Set(mine)
    if (next.has(kk)) {
      next.delete(kk)
      setMine(next)
      await supabase
        .from('meet_intents')
        .delete()
        .eq('from_profile', profile.id)
        .eq('to_profile', coId)
        .eq('kind', k)
    } else {
      next.add(kk)
      setMine(next)
      await supabase
        .from('meet_intents')
        .insert({ activity_id: activityId, from_profile: profile.id, to_profile: coId, kind: k })
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div style={{ paddingBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => go('feed')} style={backBtn}>
            <ChevronLeft />
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}>Ouvert à se revoir</div>
        </div>

        <div style={{ padding: '18px 0 0', maxWidth: 620 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.prune, fontWeight: 600 }}>{meta}</div>
          <h1 style={{ fontFamily: FONT.serif, fontSize: 27, fontWeight: 500, lineHeight: 1.14, marginTop: 8, letterSpacing: '-.01em' }}>
            Avec qui serais-tu partant pour rejouer ?
          </h1>
          <p style={{ fontSize: 13.5, color: C.muted, fontWeight: 500, marginTop: 8, lineHeight: 1.45 }}>
            Tu as joué avec {coplayers.length} personne{coplayers.length > 1 ? 's' : ''}. Choisis discrètement — personne
            n'est prévenu tant que ce n'est pas réciproque.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 11,
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              padding: '9px 12px',
              fontSize: 12,
              color: C.muted,
              fontWeight: 500,
            }}
          >
            <Lock size={14} stroke={C.prune} />
            Visible uniquement en cas d'intérêt mutuel
          </div>
        </div>

        <div className="tu-pair-grid" style={{ marginTop: 20 }}>
          {coplayers.map((c) => {
            const matchedKind = KINDS.find((kk) => mine.has(key(c.id, kk.k)) && incoming.has(key(c.id, kk.k)))?.k
            const matchText =
              matchedKind === 'rejouer'
                ? `${c.name} aussi veut rejouer avec toi !`
                : 'Vous voulez tous les deux rester en contact.'
            return (
              <div
                key={c.id}
                style={{
                  background: matchedKind ? '#F2F8F3' : C.card,
                  border: matchedKind ? `1.5px solid ${C.green}` : `1px solid ${C.line}`,
                  borderRadius: 20,
                  padding: '15px 16px',
                  transition: 'all .2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      flex: 'none',
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      background: c.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {c.initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.green, fontWeight: 500, marginTop: 1 }}>{c.meta}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 7, marginTop: 13 }}>
                  {KINDS.map((kk) => {
                    const on = mine.has(key(c.id, kk.k))
                    return (
                      <button
                        key={kk.k}
                        onClick={() => toggle(c.id, kk.k)}
                        style={{
                          flex: 1,
                          padding: '9px 4px',
                          borderRadius: 10,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: on ? `1.5px solid ${C.prune}` : `1px solid ${C.line}`,
                          background: on ? C.prune : C.card,
                          color: on ? '#fff' : C.ink,
                          transition: 'all .15s',
                        }}
                      >
                        {kk.l}
                      </button>
                    )
                  })}
                </div>

                {matchedKind && (
                  <div
                    style={{
                      marginTop: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: C.green,
                      borderRadius: 14,
                      padding: '11px 13px',
                    }}
                  >
                    <Heart size={17} />
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#fff', lineHeight: 1.25 }}>{matchText}</span>
                    <button
                      onClick={() => discuter(c.id)}
                      className="tu-press"
                      style={{
                        flex: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.green,
                        background: '#fff',
                        border: 'none',
                        borderRadius: 999,
                        padding: '6px 13px',
                        cursor: 'pointer',
                      }}
                    >
                      Discuter
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {coplayers.length === 0 && (
            <div style={{ textAlign: 'center', color: C.muted, fontSize: 13.5, padding: '20px 0' }}>
              Aucun match récent. Joue une activité, puis reviens ici.
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => go('feed')}
          className="tu-press"
          style={{
            minWidth: 300,
            padding: 15,
            borderRadius: 15,
            border: 'none',
            background: C.prune,
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Valider mes choix
        </button>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = {
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
