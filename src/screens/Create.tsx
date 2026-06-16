import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { venuesForCity } from '../lib/cities'
import type { Profile, Sport } from '../lib/types'
import { Close, Timer, Pin, Lock, Minus, Plus, Chevron } from '../components/icons'
import type { Go } from '../App'

const WHEN = [
  { k: 'soir', l: 'Ce soir' },
  { k: 'demain', l: 'Demain' },
  { k: 'sam', l: 'Samedi' },
  { k: 'dim', l: 'Dimanche' },
]
const LEVELS = [
  { k: 'deb', l: 'Débutant', full: 'Débutant' },
  { k: 'inter', l: 'Inter.', full: 'Intermédiaire' },
  { k: 'conf', l: 'Confirmé', full: 'Confirmé' },
  { k: 'tous', l: 'Tous', full: 'Tous niveaux' },
]
const POSTES = [
  { k: 'any', l: 'Peu importe' },
  { k: 'gk', l: 'Gardien' },
  { k: 'def', l: 'Défenseur' },
  { k: 'mid', l: 'Milieu' },
  { k: 'att', l: 'Attaquant' },
]
const MODES = [
  { k: 'direct', l: 'Inscription directe', d: 'Les joueurs rejoignent sans validation' },
  { k: 'approve', l: 'Demande à approuver', d: 'Tu acceptes chaque joueur' },
  { k: 'wait', l: "Liste d'attente", d: 'Les places se libèrent automatiquement' },
]

function fmt(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// Build a concrete start Date from the chosen "when" + minutes-of-day
function startDate(when: string, minutes: number): Date {
  const d = new Date()
  d.setSeconds(0, 0)
  if (when === 'demain') d.setDate(d.getDate() + 1)
  else if (when === 'sam') d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
  else if (when === 'dim') d.setDate(d.getDate() + ((0 - d.getDay() + 7) % 7 || 7))
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return d
}

export default function Create({ profile, go }: { profile: Profile; go: Go }) {
  const [sports, setSports] = useState<Sport[]>([])
  const [cSport, setCSport] = useState('foot')
  const [cWhen, setCWhen] = useState('soir')
  const [cTime, setCTime] = useState(1170) // 19:30
  const [cLevel, setCLevel] = useState('inter')
  const [cPlaces, setCPlaces] = useState(2)
  const [cPoste, setCPoste] = useState('any')
  const [cMode, setCMode] = useState('approve')
  const [cVenue, setCVenue] = useState(0)
  const [venueOpen, setVenueOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Venues are scoped to the player's home zone, so a Marseille user creates a
  // Marseille activity (which then shows up in the Marseille feed).
  const venues = venuesForCity(profile.city)
  const venue = venues[cVenue] ?? venues[0]
  // Resolve the concrete start so we can warn before publishing a slot that's
  // already in the past (e.g. "Ce soir 19:30" created at 20:45) — such a match
  // would land straight in "Passées" and never surface in the feed.
  const start = startDate(cWhen, cTime)
  const startInPast = start.getTime() <= Date.now()

  useEffect(() => {
    supabase
      .from('sports')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setSports((data as Sport[]) ?? []))
  }, [])

  async function publish() {
    if (startInPast) {
      setError('Ce créneau est déjà passé. Choisis une heure à venir.')
      return
    }
    setBusy(true)
    setError(null)
    const end = new Date(start.getTime() + 90 * 60 * 1000)
    const level = LEVELS.find((l) => l.k === cLevel)!.full
    const poste = cPoste === 'any' ? null : POSTES.find((p) => p.k === cPoste)!.l
    const { data, error: insertError } = await supabase
      .from('activities')
      .insert({
        organizer_id: profile.id,
        sport_key: cSport,
        ask: `Il manque ${cPlaces} joueur${cPlaces > 1 ? 's' : ''}`,
        venue_name: venue.name,
        venue_code: venue.code,
        exact_address: venue.address,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        level,
        mode: cMode,
        poste,
        total_slots: cPlaces,
      })
      .select('id')
      .single()
    setBusy(false)
    if (insertError || !data) {
      // Surface the failure instead of navigating away as if it succeeded.
      setError("La publication a échoué. Vérifie ta connexion et réessaie.")
      return
    }
    // Land on the management view — that's where the shareable link lives.
    go('manage', (data as { id: string }).id)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ paddingBottom: 18 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 6px' }}>
          <button onClick={() => go('feed')} style={roundBtn}>
            <Close />
          </button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Nouvelle activité</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: FONT.mono,
              fontSize: 11,
              fontWeight: 600,
              color: C.prune,
              background: C.pruneSoft,
              borderRadius: 999,
              padding: '5px 9px',
            }}
          >
            <Timer />
            ≈30s
          </div>
        </div>

        {/* sport */}
        <Section title="Quel sport ?">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
            {sports.map((sp) => {
              const on = cSport === sp.key
              return (
                <button
                  key={sp.key}
                  onClick={() => setCSport(sp.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                    alignItems: 'flex-start',
                    padding: 13,
                    borderRadius: 16,
                    cursor: 'pointer',
                    background: on ? C.pruneSoft : C.card,
                    border: on ? `1.5px solid ${C.prune}` : `1px solid ${C.line}`,
                    transition: 'all .15s',
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color: sp.color,
                      background: sp.tint,
                      padding: '4px 8px',
                      borderRadius: 8,
                      letterSpacing: '.5px',
                    }}
                  >
                    {sp.code}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.1, textAlign: 'left', color: C.ink, whiteSpace: 'nowrap' }}>
                    {sp.label}
                  </span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* when */}
        <Section title="Quand ?">
          <div style={{ display: 'flex', gap: 8, marginBottom: 11 }}>
            {WHEN.map((w) => {
              const on = cWhen === w.k
              return (
                <button key={w.k} onClick={() => setCWhen(w.k)} style={pillStyle(on)}>
                  {w.l}
                </button>
              )
            })}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              padding: '12px 16px',
            }}
          >
            <span style={{ fontSize: 13.5, color: C.muted, fontWeight: 600 }}>Heure de début</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setCTime((t) => Math.max(360, t - 30))} style={stepperBtn}>
                <Minus size={14} />
              </button>
              <span style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 600, minWidth: 58, textAlign: 'center' }}>
                {fmt(cTime)}
              </span>
              <button onClick={() => setCTime((t) => Math.min(1380, t + 30))} style={stepperBtn}>
                <Plus size={14} />
              </button>
            </div>
          </div>
          {startInPast && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 13px',
                borderRadius: 12,
                background: '#FBF1E6',
                border: '1px solid #E7C9A0',
                color: '#8A5A1E',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              Ce créneau est déjà passé — choisis « Demain » ou une heure plus tardive.
            </div>
          )}
        </Section>

        {/* where */}
        <Section title="Où ?">
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden' }}>
            <button
              onClick={() => setVenueOpen((v) => !v)}
              aria-expanded={venueOpen}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.ink,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14.5, fontWeight: 600 }}>
                <Pin size={16} stroke={C.prune} sw={1.8} />
                {venue.name}
              </span>
              <span style={{ display: 'inline-flex', transform: venueOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
                <Chevron size={12} stroke={C.muted} />
              </span>
            </button>
            {venueOpen && (
              <div style={{ borderTop: `1px solid ${C.line}` }}>
                {venues.map((v, i) => {
                  const on = i === cVenue
                  return (
                    <button
                      key={v.code}
                      onClick={() => {
                        setCVenue(i)
                        setVenueOpen(false)
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '11px 16px',
                        background: on ? C.pruneSoft : 'none',
                        border: 'none',
                        borderBottom: i < venues.length - 1 ? `1px solid ${C.line}` : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: on ? C.prune : C.ink,
                      }}
                    >
                      <Pin size={15} stroke={on ? C.prune : C.muted} sw={1.8} />
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{v.name}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginTop: 1 }}>{v.address}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: C.paper,
                borderTop: `1px solid ${C.line}`,
                fontSize: 12,
                color: C.muted,
                fontWeight: 500,
              }}
            >
              <Lock />
              {cMode === 'direct'
                ? "L'adresse exacte s'affiche dès qu'un joueur rejoint"
                : cMode === 'wait'
                  ? "L'adresse exacte est partagée une fois la place confirmée"
                  : "L'adresse exacte n'est partagée qu'après acceptation"}
            </div>
          </div>
        </Section>

        {/* level (segmented) */}
        <Section title="Quel niveau ?">
          <div style={{ display: 'flex', gap: 4, background: '#EBE7DD', borderRadius: 14, padding: 4 }}>
            {LEVELS.map((l) => {
              const on = cLevel === l.k
              return (
                <button
                  key={l.k}
                  onClick={() => setCLevel(l.k)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: on ? C.card : 'transparent',
                    color: on ? C.prune : C.muted,
                    boxShadow: on ? '0 1px 3px rgba(40,28,34,.12)' : 'none',
                    transition: 'all .15s',
                  }}
                >
                  {l.l}
                </button>
              )
            })}
          </div>
        </Section>

        {/* places stepper */}
        <div style={{ padding: '22px 22px 0' }}>
          <h2 style={{ fontFamily: FONT.serif, fontSize: 19, fontWeight: 500, marginBottom: 4 }}>
            Combien de joueurs cherches-tu ?
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 16,
              padding: '14px 18px',
              marginTop: 9,
            }}
          >
            <button onClick={() => setCPlaces((p) => Math.max(1, p - 1))} style={bigStepper(false)}>
              <Minus />
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{cPlaces}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 3 }}>places à compléter</div>
            </div>
            <button onClick={() => setCPlaces((p) => Math.min(12, p + 1))} style={bigStepper(true)}>
              <Plus stroke="#fff" />
            </button>
          </div>
        </div>

        {/* poste */}
        <div style={{ padding: '22px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 11 }}>
            <h2 style={{ fontFamily: FONT.serif, fontSize: 19, fontWeight: 500 }}>Poste recherché</h2>
            <span style={{ fontSize: 12, color: C.faint, fontWeight: 600 }}>optionnel</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {POSTES.map((p) => (
              <button key={p.k} onClick={() => setCPoste(p.k)} style={chipStyle(cPoste === p.k)}>
                {p.l}
              </button>
            ))}
          </div>
        </div>

        {/* mode */}
        <Section title="Qui peut rejoindre ?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {MODES.map((m) => {
              const on = cMode === m.k
              return (
                <button
                  key={m.k}
                  onClick={() => setCMode(m.k)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 15,
                    cursor: 'pointer',
                    background: on ? C.pruneSoft : C.card,
                    border: on ? `1.5px solid ${C.prune}` : `1px solid ${C.line}`,
                    transition: 'all .15s',
                  }}
                >
                  <span
                    style={{
                      flex: 'none',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: on ? `6px solid ${C.prune}` : `2px solid ${C.faint}`,
                      transition: 'all .15s',
                    }}
                  />
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: C.ink }}>{m.l}</span>
                    <span style={{ display: 'block', fontSize: 12, color: C.muted, marginTop: 1 }}>{m.d}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Section>
      </div>

      {/* publish footer */}
      <div
        style={{
          margin: '22px 22px 0',
          padding: '18px 20px',
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 20,
        }}
      >
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 12,
              padding: '11px 14px',
              borderRadius: 12,
              background: '#FBECEC',
              border: '1px solid #E7B8B8',
              color: '#8A2A2A',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
        <button
          onClick={publish}
          disabled={busy || startInPast}
          className="tu-press"
          style={{
            width: '100%',
            padding: 15,
            borderRadius: 15,
            border: 'none',
            background: C.prune,
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: busy || startInPast ? 'default' : 'pointer',
            opacity: busy || startInPast ? 0.7 : 1,
          }}
        >
          {busy ? 'Publication…' : 'Publier et obtenir le lien'}
        </button>
        <div style={{ textAlign: 'center', fontSize: 11.5, color: C.muted, fontWeight: 500, marginTop: 8 }}>
          Lien partageable · WhatsApp · SMS · Instagram
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '22px 22px 0' }}>
      <h2 style={{ fontFamily: FONT.serif, fontSize: 19, fontWeight: 500, marginBottom: 11 }}>{title}</h2>
      {children}
    </div>
  )
}

const roundBtn: React.CSSProperties = {
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

const stepperBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  border: `1px solid ${C.line}`,
  background: C.paper,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: C.ink,
}

function bigStepper(primary: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: primary ? 'none' : `1px solid ${C.line}`,
    background: primary ? C.prune : C.paper,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: primary ? '#fff' : C.ink,
  }
}

function pillStyle(on: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '11px 6px',
    borderRadius: 12,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    border: on ? `1.5px solid ${C.prune}` : `1px solid ${C.line}`,
    background: on ? C.pruneSoft : C.card,
    color: on ? C.prune : C.ink,
    transition: 'all .15s',
  }
}

function chipStyle(on: boolean): React.CSSProperties {
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
