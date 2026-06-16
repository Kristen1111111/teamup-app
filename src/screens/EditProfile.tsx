import { useEffect, useRef, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Profile, Sport } from '../lib/types'
import { ChevronLeft, Lock, Users, Trash } from '../components/icons'
import SportPicker, { type SportSelection } from '../components/SportPicker'
import LocationPicker from '../components/LocationPicker'
import Avatar from '../components/Avatar'
import { validatePhoto } from '../components/PhotoGallery'
import { uploadAvatar } from '../lib/photos'
import type { Place } from '../lib/geocode'
import type { Go } from '../App'

// Normalize the "initiale" field: keep a single uppercase letter and an
// optional trailing dot. "R." stays "R." (the dot is intentional), only
// surrounding whitespace is stripped. "r" -> "R", "R." -> "R.".
function normalizeInitial(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  const letter = s[0].toUpperCase()
  // Preserve a trailing dot if the user typed one.
  return s.slice(1).includes('.') ? `${letter}.` : letter
}

// Profile editing (F7): identity, zone, sports + level, and the privacy
// controls — public/private profile and "hide me from search".
export default function EditProfile({
  profile,
  setProfile,
  go,
}: {
  profile: Profile
  setProfile: (p: Profile) => void
  go: Go
}) {
  const [sports, setSports] = useState<Sport[]>([])
  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastInitial, setLastInitial] = useState(profile.last_initial)
  const [loc, setLoc] = useState<Place | null>(
    profile.home_lat != null && profile.home_lng != null
      ? { label: profile.city, lat: profile.home_lat, lng: profile.home_lng }
      : null,
  )
  const [perfectMatch, setPerfectMatch] = useState(profile.perfect_match ?? '')
  const [picked, setPicked] = useState<SportSelection>({})
  const [isPublic, setIsPublic] = useState(profile.is_public)
  const [hidden, setHidden] = useState(profile.hidden_from_search)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    const invalid = validatePhoto(file)
    if (invalid) {
      setPhotoError(invalid)
      return
    }
    setPhotoError(null)
    setPhotoBusy(true)
    try {
      const url = await uploadAvatar(profile.id, file)
      setProfile({ ...profile, avatar_url: url })
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "L'envoi de la photo a échoué.")
    } finally {
      setPhotoBusy(false)
    }
  }

  async function removeAvatar() {
    setPhotoError(null)
    setPhotoBusy(true)
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
    setPhotoBusy(false)
    if (dbErr) {
      setPhotoError('La suppression de la photo a échoué. Réessaie.')
      return
    }
    setProfile({ ...profile, avatar_url: null })
  }

  useEffect(() => {
    supabase
      .from('sports')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setSports((data as Sport[]) ?? []))

    supabase
      .from('profile_sports')
      .select('sport_key, level')
      .eq('profile_id', profile.id)
      .then(({ data }) => {
        const rows = (data as { sport_key: string; level: string }[]) ?? []
        const sel: SportSelection = {}
        for (const r of rows) {
          const lvl = (['Débutant', 'Intermédiaire', 'Confirmé'].includes(r.level) ? r.level : 'Intermédiaire') as SportSelection[string]
          sel[r.sport_key] = lvl
        }
        setPicked(sel)
      })
  }, [profile.id])

  const sportKeys = Object.keys(picked)
  const fname = firstName.trim()

  async function save() {
    if (!fname) return
    setBusy(true)
    setError(null)

    const del = await supabase.from('profile_sports').delete().eq('profile_id', profile.id)
    let insErr = null
    if (!del.error && sportKeys.length) {
      const ins = await supabase
        .from('profile_sports')
        .insert(sportKeys.map((key) => ({ profile_id: profile.id, sport_key: key, level: picked[key] })))
      insErr = ins.error
    }

    const patch = {
      first_name: fname,
      last_initial: normalizeInitial(lastInitial),
      city: loc?.label ?? profile.city,
      home_lat: loc?.lat ?? profile.home_lat,
      home_lng: loc?.lng ?? profile.home_lng,
      perfect_match: perfectMatch.trim() || null,
      is_public: isPublic,
      hidden_from_search: hidden,
    }
    const upd = await supabase.from('profiles').update(patch).eq('id', profile.id)

    setBusy(false)
    if (del.error || insErr || upd.error) {
      // Don't pretend it saved — keep the user on the form with their edits.
      setError("L'enregistrement a échoué. Vérifie ta connexion et réessaie.")
      return
    }

    setProfile({ ...profile, ...patch })
    go('profile')
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button onClick={() => go('profile')} style={backBtn} title="Retour">
          <ChevronLeft />
        </button>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 28, fontWeight: 500, letterSpacing: '-.01em' }}>Modifier le profil</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* profile photo */}
        <Card label="PHOTO DE PROFIL">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => !photoBusy && fileInput.current?.click()}
              title="Changer la photo"
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: photoBusy ? 'default' : 'pointer',
                borderRadius: '50%',
                position: 'relative',
                opacity: photoBusy ? 0.7 : 1,
              }}
            >
              <Avatar
                url={profile.avatar_url}
                color="linear-gradient(150deg,#5C2049,#8A3A6F)"
                letter={profile.first_name[0]}
                size={88}
              />
            </button>
            <input ref={fileInput} type="file" hidden accept="image/*" onChange={onPickAvatar} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={photoBusy}
                className="tu-press"
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: C.prune,
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: photoBusy ? 'default' : 'pointer',
                  opacity: photoBusy ? 0.6 : 1,
                }}
              >
                {photoBusy ? 'Envoi…' : profile.avatar_url ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              {profile.avatar_url && !photoBusy && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'transparent',
                    color: '#A53F3F',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Trash size={15} stroke="#A53F3F" />
                  Retirer la photo
                </button>
              )}
              <span style={{ fontSize: 11.5, color: C.faint, fontWeight: 500 }}>JPEG, PNG ou WebP · 2 Mo max.</span>
            </div>
          </div>
          {photoError && (
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
              {photoError}
            </div>
          )}
        </Card>

        {/* identity */}
        <Card label="IDENTITÉ">
          <div style={{ display: 'flex', gap: 10, marginTop: 13 }}>
            <Field label="Prénom" style={{ flex: 1 }}>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" maxLength={40} style={inputStyle} />
            </Field>
            <Field label="Initiale" style={{ width: 96 }}>
              <input
                value={lastInitial}
                onChange={(e) => setLastInitial(e.target.value)}
                maxLength={2}
                placeholder={fname ? `${fname[0].toUpperCase()}.` : 'Ex. K.'}
                style={inputStyle}
              />
            </Field>
          </div>
        </Card>

        {/* zone */}
        <Card label="MA ZONE">
          <div style={{ marginTop: 13 }}>
            <LocationPicker value={loc} onChange={setLoc} />
          </div>
        </Card>

        {/* sports */}
        <Card label="CE QUE JE JOUE">
          <div style={{ marginTop: 13 }}>
            <SportPicker sports={sports} value={picked} onChange={setPicked} />
          </div>
        </Card>

        {/* perfect match */}
        <Card label="LE MATCH PARFAIT POUR MOI">
          <textarea
            value={perfectMatch}
            onChange={(e) => setPerfectMatch(e.target.value)}
            rows={3}
            maxLength={160}
            placeholder="Un foot à 5 le jeudi soir — sérieux dans le jeu, détendu en dehors."
            style={{ ...inputStyle, marginTop: 13, resize: 'vertical', lineHeight: 1.5, fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 16 }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: C.faint, fontWeight: 500, marginTop: 6 }}>
            {perfectMatch.length}/160
          </div>
        </Card>

        {/* privacy */}
        <Card label="CONFIDENTIALITÉ" labelColor={C.prune}>
          <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <ToggleRow
              icon={<Users size={20} stroke={C.prune} />}
              title="Profil public"
              desc={isPublic ? 'Les autres joueurs peuvent voir ton profil' : 'Ton profil reste privé'}
              on={isPublic}
              onToggle={() => setIsPublic((v) => !v)}
            />
            <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
            <ToggleRow
              icon={<Lock size={18} stroke={C.prune} />}
              title="Me masquer de la recherche"
              desc={hidden ? 'Tu n’apparais pas dans les suggestions' : 'Tu peux être trouvé par d’autres joueurs'}
              on={hidden}
              onToggle={() => setHidden((v) => !v)}
            />
          </div>
        </Card>

        {error && (
          <div
            role="alert"
            style={{
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
        <button onClick={save} disabled={!fname || busy} className="tu-press" style={{
          width: '100%',
          padding: 15,
          borderRadius: 15,
          border: 'none',
          background: C.prune,
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: !fname || busy ? 'default' : 'pointer',
          opacity: !fname || busy ? 0.6 : 1,
        }}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

function ToggleRow({
  icon,
  title,
  desc,
  on,
  onToggle,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '8px 0' }}>
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
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{desc}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          flex: 'none',
          width: 46,
          height: 28,
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          padding: 3,
          display: 'flex',
          justifyContent: on ? 'flex-end' : 'flex-start',
          background: on ? C.prune : '#D8D2C6',
          transition: 'all .2s',
        }}
      >
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </button>
    </div>
  )
}

function Card({ label, labelColor, children }: { label: string; labelColor?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 18 }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: '1.2px', color: labelColor ?? C.muted, fontWeight: 600 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 13,
  border: `1px solid ${C.line}`,
  background: C.paper,
  fontSize: 15,
  color: C.ink,
  outline: 'none',
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
