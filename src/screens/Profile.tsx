import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Profile as ProfileT, ProfilePhoto, Sport } from '../lib/types'
import { Check, Share, Dots, Heart } from '../components/icons'
import Avatar from '../components/Avatar'
import PhotoGallery, { validatePhoto } from '../components/PhotoGallery'
import { listGalleryPhotos, addGalleryPhoto, deleteGalleryPhoto } from '../lib/photos'
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
  const [playing, setPlaying] = useState<PlayingRow[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  // Sports inferred from past matches — used as a fallback for "Ce que je joue"
  // so the section never reads "Ajoute tes sports favoris" while a played match
  // sits right below in the history.
  const [historySports, setHistorySports] = useState<PlayingRow[]>([])
  // Whether this player organises at least one activity — drives the role label
  // (no more hardcoded "Organisateur" for accounts that have never created one).
  const [organizes, setOrganizes] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareErr, setShareErr] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Gallery (MES PHOTOS)
  const [photos, setPhotos] = useState<ProfilePhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [photosBusy, setPhotosBusy] = useState(false)
  const [photosError, setPhotosError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profile_sports')
      .select('level, sport:sports(*)')
      .eq('profile_id', profile.id)
      .then(({ data }) => setPlaying((data as unknown as PlayingRow[]) ?? []))

    // History = past matches I played in OR organised, merged & de-duplicated, so
    // an organiser's own sessions show up in their profile (not just players').
    type PastMatch = { id: string; starts_at: string; venue_name: string; sport: Sport; present: boolean; organized: boolean }
    Promise.all([
      supabase
        .from('activity_participants')
        .select('checked_in, activity:activities(id, starts_at, venue_name, sport:sports(*))')
        .eq('profile_id', profile.id),
      supabase
        .from('activities')
        .select('id, starts_at, venue_name, sport:sports(*)')
        .eq('organizer_id', profile.id),
    ]).then(([{ data: parts }, { data: org }]) => {
      const now = new Date()
      const byId = new Map<string, PastMatch>()

      for (const r of (parts as unknown as Array<{
        checked_in: boolean | null
        activity: { id: string; starts_at: string; venue_name: string; sport: Sport } | null
      }>) ?? []) {
        const a = r.activity
        if (!a || new Date(a.starts_at) >= now) continue
        byId.set(a.id, { ...a, present: r.checked_in !== false, organized: false })
      }

      for (const a of (org as unknown as Array<{ id: string; starts_at: string; venue_name: string; sport: Sport }>) ?? []) {
        if (new Date(a.starts_at) >= now) continue
        if (!byId.has(a.id)) byId.set(a.id, { ...a, present: true, organized: true })
      }

      setOrganizes(((org as unknown[]) ?? []).length > 0)

      const past = Array.from(byId.values()).sort((x, y) => +new Date(y.starts_at) - +new Date(x.starts_at))

      setHistory(
        past.slice(0, 4).map((m) => {
          const d = new Date(m.starts_at)
          const venue = m.venue_name.split(' · ')[0]
          return {
            sport: m.sport.label,
            meta: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${venue}${m.organized ? ' · organisé' : ''}`,
            present: m.present,
          }
        }),
      )

      // distinct sports played, newest first — pseudo "playing" rows (no level)
      const seen = new Set<string>()
      const derived: PlayingRow[] = []
      for (const m of past) {
        if (seen.has(m.sport.key)) continue
        seen.add(m.sport.key)
        derived.push({ level: '', sport: m.sport })
      }
      setHistorySports(derived)
    })
  }, [profile.id])

  useEffect(() => {
    let active = true
    setPhotosLoading(true)
    listGalleryPhotos(profile.id)
      .then((rows) => {
        if (active) setPhotos(rows)
      })
      .catch(() => {
        if (active) setPhotosError('Le chargement de tes photos a échoué.')
      })
      .finally(() => {
        if (active) setPhotosLoading(false)
      })
    return () => {
      active = false
    }
  }, [profile.id])

  async function addPhotos(files: File[]) {
    setPhotosError(null)
    setPhotosBusy(true)
    try {
      for (const file of files) {
        const invalid = validatePhoto(file)
        if (invalid) {
          setPhotosError(invalid)
          continue
        }
        await addGalleryPhoto(profile.id, file)
      }
      const rows = await listGalleryPhotos(profile.id)
      setPhotos(rows)
    } catch (err) {
      setPhotosError(err instanceof Error ? err.message : "L'ajout de la photo a échoué.")
    } finally {
      setPhotosBusy(false)
    }
  }

  async function removePhoto(photo: ProfilePhoto) {
    setPhotosError(null)
    const prev = photos
    setPhotos((cur) => cur.filter((p) => p.id !== photo.id))
    try {
      await deleteGalleryPhoto(photo)
    } catch (err) {
      setPhotos(prev) // rollback
      setPhotosError(err instanceof Error ? err.message : 'La suppression a échoué.')
    }
  }

  async function toggleOpen() {
    const next = !profile.open_to_meet
    setProfile({ ...profile, open_to_meet: next })
    await supabase.from('profiles').update({ open_to_meet: next }).eq('id', profile.id)
  }

  async function share() {
    const url = `${window.location.origin}/?profile=${profile.id}`
    const data = {
      title: `${profile.first_name} ${profile.last_initial} sur TeamUp`,
      text: 'Mon profil joueur sur TeamUp',
      url,
    }
    // Try the native share sheet first; if it's unavailable (desktop) or fails,
    // fall back to copying the link so the user always gets visible feedback.
    if (navigator.share) {
      try {
        await navigator.share(data)
        return
      } catch {
        // sheet dismissed or share failed — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareErr(true)
      setTimeout(() => setShareErr(false), 2500)
    }
  }

  // Prefer the sports the player declared; otherwise infer from their history.
  const sportsToShow = playing.length ? playing : historySports
  // Badges earned from real signals, not a fixed list shown identically to everyone:
  //  - Vérifié  → identity verified
  //  - Ponctuel → reliable attendance (≥ 90%) with no late cancels
  //  - Capitaine→ actually organises activities
  const badges = [
    profile.verified ? 'Vérifié' : null,
    profile.attendance_pct >= 90 && profile.late_cancels === 0 ? 'Ponctuel' : null,
    organizes ? 'Capitaine' : null,
  ].filter(Boolean) as string[]
  const circumference = 2 * Math.PI * 37
  const dash = (profile.attendance_pct / 100) * circumference

  return (
    <div>
      {/* page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 32, fontWeight: 500, letterSpacing: '-.01em' }}>Mon profil</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {copied && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: C.green,
                background: C.greenSoft,
                borderRadius: 999,
                padding: '7px 12px',
              }}
            >
              <Check size={12} stroke={C.green} sw={3} />
              Lien copié
            </span>
          )}
          {shareErr && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#A53F3F',
                background: '#F2E6E6',
                borderRadius: 999,
                padding: '7px 12px',
              }}
            >
              Copie impossible — copie le lien manuellement
            </span>
          )}
          <button style={iconBtn} onClick={share} title="Partager mon profil">
            <Share />
          </button>
          <div style={{ position: 'relative' }}>
            <button style={iconBtn} onClick={() => setMenuOpen((o) => !o)} title="Réglages">
              <Dots />
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 60,
                    minWidth: 180,
                    background: C.card,
                    border: `1px solid ${C.line}`,
                    borderRadius: 14,
                    padding: 6,
                    boxShadow: '0 18px 40px -16px rgba(40,28,34,.4)',
                  }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      go('edit')
                    }}
                    style={menuItemStyle}
                  >
                    Modifier le profil
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      go('settings')
                    }}
                    style={menuItemStyle}
                  >
                    Paramètres &amp; sécurité
                  </button>
                  {profile.is_moderator && (
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        go('moderation')
                      }}
                      style={menuItemStyle}
                    >
                      Modération
                    </button>
                  )}
                  <div style={{ height: 1, background: C.line, margin: '5px 4px' }} />
                  <button onClick={() => supabase.auth.signOut()} style={{ ...menuItemStyle, color: '#A53F3F' }}>
                    Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
          {organizes ? 'Organisateur' : 'Joueur'} · {profile.city} · Actif aujourd'hui
        </p>
      </div>

          {/* reliability */}
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

          {/* badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
        </div>

        {/* ── content column ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* what I play */}
          <Card label="CE QUE JE JOUE" labelColor={C.prune}>
        <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {sportsToShow.map((s) => (
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
          {sportsToShow.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Ajoute tes sports favoris.</span>}
        </div>
      </Card>

          {/* perfect match prompt */}
          {profile.perfect_match && (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 20 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: C.muted, fontWeight: 600 }}>
            LE MATCH PARFAIT POUR MOI
          </div>
          <p style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 22, lineHeight: 1.28, marginTop: 10, letterSpacing: '-.01em' }}>
            {profile.perfect_match}
          </p>
        </div>
      )}

          {/* history */}
          <div>
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
            <div style={{ padding: '16px 18px', fontSize: 13, color: C.muted }}>
              {profile.matches_played > 0 ? 'Aucun match récent à afficher.' : 'Pas encore de match joué.'}
            </div>
          )}
        </div>
      </div>

          {/* my photos (gallery) */}
          <Card label="MES PHOTOS" labelColor={C.prune}>
            <PhotoGallery
              photos={photos}
              loading={photosLoading}
              editable
              busy={photosBusy}
              onAdd={addPhotos}
              onDelete={removePhoto}
            />
            {photosError && (
              <div
                role="alert"
                style={{
                  marginTop: 12,
                  padding: '10px 13px',
                  borderRadius: 12,
                  background: '#FBECEC',
                  border: '1px solid #E7B8B8',
                  color: '#8A2A2A',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {photosError}
              </div>
            )}
          </Card>

          {/* open to meet toggle */}
          <div
            style={{
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
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 18 }}>
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

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '9px 10px',
  borderRadius: 9,
  border: 'none',
  background: 'transparent',
  color: C.ink,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
}
