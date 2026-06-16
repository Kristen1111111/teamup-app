import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { CITIES } from '../lib/cities'
import type { Profile, Sport } from '../lib/types'
import { Heart, Check, Pin, ChevronLeft } from '../components/icons'
import SportPicker, { type SportSelection } from '../components/SportPicker'

// Short 2-step onboarding (F7 · US1 + US10): sports + level, then zone + real
// CGU acceptance. Persists everything and flips profile.onboarded to true.
export default function Onboarding({
  profile,
  setProfile,
  onDone,
}: {
  profile: Profile
  setProfile: (p: Profile) => void
  onDone: () => void
}) {
  const [sports, setSports] = useState<Sport[]>([])
  const [step, setStep] = useState<1 | 2>(1)
  const [picked, setPicked] = useState<SportSelection>({})
  const [city, setCity] = useState(profile.city)
  const [cgu, setCgu] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('sports')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setSports((data as Sport[]) ?? []))

    // Pre-select sports the account may already carry (demo seed).
    supabase
      .from('profile_sports')
      .select('sport_key, level')
      .eq('profile_id', profile.id)
      .then(({ data }) => {
        const rows = (data as { sport_key: string; level: string }[]) ?? []
        if (rows.length) {
          const sel: SportSelection = {}
          for (const r of rows) {
            const lvl = (['Débutant', 'Intermédiaire', 'Confirmé'].includes(r.level) ? r.level : 'Intermédiaire') as SportSelection[string]
            sel[r.sport_key] = lvl
          }
          setPicked(sel)
        }
      })
  }, [profile.id])

  const sportKeys = Object.keys(picked)

  async function finish() {
    if (!cgu || sportKeys.length === 0) return
    setBusy(true)

    // Replace the player's sports with the chosen set.
    await supabase.from('profile_sports').delete().eq('profile_id', profile.id)
    await supabase
      .from('profile_sports')
      .insert(sportKeys.map((key) => ({ profile_id: profile.id, sport_key: key, level: picked[key] })))

    const cguAt = new Date().toISOString()
    await supabase
      .from('profiles')
      .update({ city, onboarded: true, cgu_accepted_at: cguAt })
      .eq('id', profile.id)

    setProfile({ ...profile, city, onboarded: true, cgu_accepted_at: cguAt })
    setBusy(false)
    onDone()
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.paper, color: C.ink }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 22px 80px' }}>
        {/* brand + progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step === 2 ? (
            <button onClick={() => setStep(1)} style={backBtn} title="Retour">
              <ChevronLeft />
            </button>
          ) : (
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(150deg,#5C2049,#8A3A6F)',
              }}
            >
              <Heart size={20} />
            </span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.muted, fontWeight: 600 }}>
              ÉTAPE {step} / 2
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[1, 2].map((n) => (
                <span
                  key={n}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 999,
                    background: n <= step ? C.prune : C.line,
                    transition: 'background .2s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {step === 1 && (
          <div style={{ marginTop: 26 }}>
            <h1 style={{ fontFamily: FONT.serif, fontSize: 30, fontWeight: 500, letterSpacing: '-.01em', lineHeight: 1.1 }}>
              Bienvenue {profile.first_name} 👋
            </h1>
            <p style={{ marginTop: 8, fontSize: 14.5, color: C.muted, fontWeight: 500, lineHeight: 1.5 }}>
              Choisis les sports que tu pratiques et ton niveau pour chacun. Tu pourras tout modifier plus tard.
            </p>

            <div style={{ marginTop: 22 }}>
              <SportPicker sports={sports} value={picked} onChange={setPicked} />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={sportKeys.length === 0}
              className="tu-press"
              style={primaryBtn(sportKeys.length === 0)}
            >
              Continuer
            </button>
            {sportKeys.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: C.faint, fontWeight: 500, marginTop: 10 }}>
                Sélectionne au moins un sport.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ marginTop: 26 }}>
            <h1 style={{ fontFamily: FONT.serif, fontSize: 30, fontWeight: 500, letterSpacing: '-.01em', lineHeight: 1.1 }}>
              Ta zone de jeu
            </h1>
            <p style={{ marginTop: 8, fontSize: 14.5, color: C.muted, fontWeight: 500, lineHeight: 1.5 }}>
              On te montre en priorité les activités près de cette zone.
            </p>

            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 18 }}>
              {Array.from(new Set([profile.city, ...CITIES])).map((c) => {
                const on = c === city
                return (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 14px',
                      borderRadius: 999,
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: `1px solid ${on ? C.prune : C.line}`,
                      background: on ? C.prune : C.card,
                      color: on ? '#fff' : C.ink,
                      transition: 'all .15s',
                    }}
                  >
                    <Pin size={13} stroke={on ? '#fff' : C.prune} sw={1.9} />
                    {c}
                  </button>
                )
              })}
            </div>

            {/* real CGU acceptance */}
            <button
              onClick={() => setCgu((v) => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginTop: 24,
                background: C.card,
                border: `1px solid ${cgu ? C.prune : C.line}`,
                borderRadius: 16,
                padding: '15px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all .15s',
              }}
            >
              <span
                style={{
                  flex: 'none',
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  border: cgu ? 'none' : `2px solid ${C.faint}`,
                  background: cgu ? C.prune : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {cgu && <Check size={12} />}
              </span>
              <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 500, lineHeight: 1.5 }}>
                J'ai lu et j'accepte les{' '}
                <a
                  href="/cgu"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: C.prune, fontWeight: 600 }}
                >
                  Conditions Générales d'Utilisation
                </a>{' '}
                et la{' '}
                <a
                  href="/confidentialite"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: C.prune, fontWeight: 600 }}
                >
                  politique de confidentialité
                </a>
                .
              </span>
            </button>

            <button onClick={finish} disabled={!cgu || busy} className="tu-press" style={primaryBtn(!cgu || busy)}>
              {busy ? 'Création de ton profil…' : 'Commencer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    marginTop: 22,
    padding: 15,
    borderRadius: 15,
    border: 'none',
    background: C.prune,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
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
