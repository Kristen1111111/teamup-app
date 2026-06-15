import { useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { Heart, Check } from '../components/icons'

const POINTS = [
  'Des joueurs fiables, notés sur leur présence',
  'Crée une activité et obtiens un lien en 30 secondes',
  'Reste en contact avec ceux avec qui tu as aimé jouer',
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="tu-login">
      {/* brand panel */}
      <div
        className="tu-login-brand"
        style={{
          background: 'linear-gradient(150deg,#5C2049,#7A2E62)',
          color: '#fff',
          padding: '64px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>TeamUp</div>

        <div>
          <h1 style={{ fontFamily: FONT.serif, fontSize: 46, lineHeight: 1.05, fontWeight: 500, letterSpacing: '-.02em' }}>
            Complète ton match en quelques minutes.
          </h1>
          <p style={{ marginTop: 16, fontSize: 16, color: 'rgba(255,255,255,.78)', fontWeight: 500, lineHeight: 1.5, maxWidth: 440 }}>
            Trouve rapidement des joueurs fiables près de chez toi pour le sport amateur.
          </p>
          <ul style={{ listStyle: 'none', marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {POINTS.map((p) => (
              <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14.5, fontWeight: 500 }}>
                <span
                  style={{
                    flex: 'none',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={13} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: '1px', color: 'rgba(255,255,255,.5)' }}>
          SPORT AMATEUR · ENTRE JOUEURS
        </div>
      </div>

      {/* form panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
          background: C.paper,
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(150deg,#5C2049,#8A3A6F)',
              boxShadow: '0 12px 26px -12px rgba(92,32,73,.7)',
            }}
          >
            <Heart size={28} />
          </span>

          <h2 style={{ fontFamily: FONT.serif, fontSize: 28, fontWeight: 500, letterSpacing: '-.01em', marginTop: 22 }}>
            Connexion
          </h2>
          <p style={{ marginTop: 8, fontSize: 14, color: C.muted, fontWeight: 500, lineHeight: 1.5 }}>
            On t'envoie un lien de connexion sécurisé par email — pas de mot de passe.
          </p>

          {sent ? (
            <div
              style={{
                marginTop: 26,
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 18,
                padding: 20,
              }}
            >
              <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.green, fontWeight: 600 }}>
                LIEN ENVOYÉ
              </div>
              <p style={{ marginTop: 8, fontSize: 14.5, fontWeight: 600 }}>Vérifie ta boîte mail</p>
              <p style={{ marginTop: 4, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                On a envoyé un lien de connexion à <strong style={{ color: C.ink }}>{email}</strong>. Ouvre-le sur cet
                appareil pour continuer.
              </p>
              <button
                onClick={() => setSent(false)}
                className="tu-press"
                style={{
                  marginTop: 14,
                  background: 'none',
                  border: 'none',
                  color: C.prune,
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <form onSubmit={send} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '15px 16px',
                  borderRadius: 15,
                  border: `1px solid ${C.line}`,
                  background: C.card,
                  fontSize: 15,
                  color: C.ink,
                  outline: 'none',
                }}
              />
              {error && <div style={{ fontSize: 12.5, color: '#A53F3F', fontWeight: 500 }}>{error}</div>}
              <button
                type="submit"
                disabled={busy}
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
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? 'Envoi…' : 'Recevoir mon lien de connexion'}
              </button>
            </form>
          )}

          <p style={{ marginTop: 28, fontSize: 11.5, color: C.faint, fontWeight: 500, lineHeight: 1.5 }}>
            En continuant, tu acceptes les CGU et la politique de confidentialité.
          </p>
        </div>
      </div>
    </div>
  )
}
