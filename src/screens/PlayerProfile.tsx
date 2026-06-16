import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Profile as ProfileT, ProfilePhoto, Sport } from '../lib/types'
import { ChevronLeft } from '../components/icons'
import Avatar from '../components/Avatar'
import PhotoGallery from '../components/PhotoGallery'
import { listGalleryPhotos } from '../lib/photos'
import type { Go } from '../App'

type PlayingRow = { level: string; sport: Sport }

// Read-only view of another player's profile (F? — photo + galerie). Mirrors the
// visual sub-blocks of Profile.tsx (identity, reliability, sports, photos) but
// with no editing affordances, no toggles, no upload.
export default function PlayerProfile({ profileId, meId, go }: { profileId: string; meId: string; go: Go }) {
  const [profile, setProfile] = useState<ProfileT | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [playing, setPlaying] = useState<PlayingRow[]>([])
  const [photos, setPhotos] = useState<ProfilePhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [dmPending, setDmPending] = useState(false)
  const [dmError, setDmError] = useState<string | null>(null)

  // Ouvre (ou crée) le fil 1-à-1 avec ce joueur, sans condition de match
  // préalable — le seul verrou serveur est le blocage mutuel.
  async function message() {
    setDmPending(true)
    setDmError(null)
    const { data, error } = await supabase.rpc('dm_conversation', { other: profileId })
    setDmPending(false)
    if (error || !data) {
      setDmError("La conversation n'a pas pu être ouverte. Réessaie.")
      return
    }
    go('messages', data as string)
  }

  useEffect(() => {
    let active = true

    supabase
      .from('profiles')
      // Explicit public columns: home_lat/home_lng/auth_id SELECT is revoked on
      // profiles for client roles, so `select('*')` on another player would error.
      .select(
        'id, first_name, last_initial, city, avatar_color, avatar_url, verified, open_to_meet, perfect_match, matches_played, attendance_pct, late_cancels, is_public, hidden_from_search, is_moderator, onboarded, created_at',
      )
      .eq('id', profileId)
      .single()
      .then(({ data }) => {
        if (!active) return
        if (data) setProfile(data as unknown as ProfileT)
        else setNotFound(true)
      })

    supabase
      .from('profile_sports')
      .select('level, sport:sports(*)')
      .eq('profile_id', profileId)
      .then(({ data }) => {
        if (active) setPlaying((data as unknown as PlayingRow[]) ?? [])
      })

    setPhotosLoading(true)
    listGalleryPhotos(profileId)
      .then((rows) => {
        if (active) setPhotos(rows)
      })
      .catch(() => {
        // RLS hides photos from non co-players → treat as empty, no error surfaced.
        if (active) setPhotos([])
      })
      .finally(() => {
        if (active) setPhotosLoading(false)
      })

    return () => {
      active = false
    }
  }, [profileId])

  if (notFound) {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <Header go={go} />
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '40px 0' }}>
          Ce profil est introuvable ou privé.
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <Header go={go} />
        <div style={{ color: C.muted, fontSize: 14, padding: '24px 0' }}>Chargement…</div>
      </div>
    )
  }

  const circumference = 2 * Math.PI * 37
  const dash = (profile.attendance_pct / 100) * circumference

  return (
    <div>
      <Header go={go} />

      <div className="tu-profile-grid">
        {/* ── identity rail ───────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* identity */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 22,
              padding: 24,
            }}
          >
            <Avatar
              url={profile.avatar_url}
              color="linear-gradient(150deg,#5C2049,#8A3A6F)"
              letter={profile.first_name[0]}
              size={88}
              verified={profile.verified}
            />
            <h1 style={{ fontFamily: FONT.serif, fontSize: 27, fontWeight: 500, marginTop: 12 }}>
              {profile.first_name} {profile.last_initial}
            </h1>
            <p style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 2 }}>
              Joueur · {profile.city}
            </p>

            {profileId !== meId && (
              <>
                <button
                  onClick={message}
                  disabled={dmPending}
                  className="tu-press"
                  style={{
                    marginTop: 16,
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: C.prune,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: dmPending ? 'default' : 'pointer',
                    opacity: dmPending ? 0.65 : 1,
                  }}
                >
                  {dmPending ? 'Ouverture…' : `Message à ${profile.first_name}`}
                </button>
                {dmError && (
                  <div role="alert" style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#8A2A2A' }}>
                    {dmError}
                  </div>
                )}
              </>
            )}
          </div>

          {/* reliability / presence */}
          <div
            style={{
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
        </div>

        {/* ── content column ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* what they play */}
          <Card label="CE QU'IL JOUE">
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
                  {s.level && (
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 500, color: C.muted }}>
                      {s.level.toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {playing.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Aucun sport renseigné.</span>}
            </div>
          </Card>

          {/* perfect match prompt */}
          {profile.perfect_match && (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 20 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.muted, fontWeight: 600 }}>
                LE MATCH PARFAIT POUR LUI
              </div>
              <p style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22, lineHeight: 1.28, marginTop: 10, letterSpacing: '-.01em' }}>
                {profile.perfect_match}
              </p>
            </div>
          )}

          {/* photos (read-only) */}
          <Card label="SES PHOTOS">
            <PhotoGallery photos={photos} loading={photosLoading} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function Header({ go }: { go: Go }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <button onClick={() => go('feed')} style={backBtn} title="Retour">
        <ChevronLeft />
      </button>
      <h1 style={{ fontFamily: FONT.serif, fontSize: 28, fontWeight: 500, letterSpacing: '-.01em' }}>Profil joueur</h1>
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

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 18 }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.prune, fontWeight: 600 }}>{label}</div>
      {children}
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
