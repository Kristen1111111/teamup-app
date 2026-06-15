import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { ChevronLeft, Check, Shield, Download, Trash, Ban, Lock } from '../components/icons'
import type { ScreenName } from '../App'

type BlockedRow = { blocked_id: string; profile: { first_name: string; last_initial: string; avatar_color: string } | null }

export default function Settings({
  profile,
  setProfile,
  go,
}: {
  profile: Profile
  setProfile: (p: Profile) => void
  go: (s: ScreenName) => void
}) {
  const [blocked, setBlocked] = useState<BlockedRow[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  function toast(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3000)
  }

  async function loadBlocked() {
    const { data } = await supabase
      .from('blocks')
      .select('blocked_id, profile:profiles!blocks_blocked_id_fkey(first_name, last_initial, avatar_color)')
      .eq('blocker_id', profile.id)
    setBlocked((data as unknown as BlockedRow[]) ?? [])
  }

  useEffect(() => {
    loadBlocked()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function patch(fields: Partial<Profile>) {
    setProfile({ ...profile, ...fields }) // optimistic
    await supabase.from('profiles').update(fields).eq('id', profile.id)
  }

  async function acceptCgu() {
    const now = new Date().toISOString()
    await patch({ cgu_accepted_at: now })
    toast('Consentement enregistré')
  }

  async function unblock(id: string) {
    setBlocked((prev) => prev.filter((b) => b.blocked_id !== id))
    await supabase.from('blocks').delete().eq('blocker_id', profile.id).eq('blocked_id', id)
    toast('Profil débloqué')
  }

  async function exportData() {
    setExporting(true)
    const { data, error } = await supabase.rpc('export_my_data')
    setExporting(false)
    if (error || !data) {
      toast("L'export a échoué")
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'teamup-mes-donnees.json'
    a.click()
    URL.revokeObjectURL(url)
    toast('Tes données ont été exportées')
  }

  async function deleteAccount() {
    setDeleting(true)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setDeleting(false)
      toast('La suppression a échoué')
      return
    }
    await supabase.auth.signOut()
    // onAuthStateChange ramène l'app à l'écran de connexion
  }

  const cguDate = profile.cgu_accepted_at
    ? new Date(profile.cgu_accepted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <button onClick={() => go('profile')} style={backBtn} title="Retour">
          <ChevronLeft />
        </button>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 28, fontWeight: 500, letterSpacing: '-.01em' }}>
          Paramètres &amp; sécurité
        </h1>
      </div>
      <p style={{ fontSize: 14, color: C.muted, fontWeight: 500, marginBottom: 22 }}>
        Maîtrise tes données personnelles, ta visibilité et tes consentements.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Consentement (RGPD) ─────────────────────────────── */}
        <Section icon={<Check size={15} stroke={C.prune} sw={3} />} title="Consentement">
          <Line
            title="Conditions générales & politique de confidentialité"
            hint={cguDate ? `Acceptées le ${cguDate}` : 'À accepter pour continuer à utiliser TeamUp'}
          >
            {cguDate ? (
              <span style={badgeOk}>
                <Check size={12} stroke={C.green} sw={3} /> Accepté
              </span>
            ) : (
              <button onClick={acceptCgu} className="tu-press" style={primaryBtn}>
                Accepter
              </button>
            )}
          </Line>
        </Section>

        {/* ── Confidentialité ─────────────────────────────────── */}
        <Section icon={<Lock size={15} stroke={C.prune} />} title="Confidentialité">
          <Toggle
            title="Profil public"
            hint="Ton profil est visible via un lien de partage."
            on={profile.is_public}
            onChange={() => patch({ is_public: !profile.is_public })}
          />
          <Divider />
          <Toggle
            title="Masquer de la recherche"
            hint="Tu n'apparais pas dans les suggestions « se revoir » et la découverte."
            on={profile.hidden_from_search}
            onChange={() => patch({ hidden_from_search: !profile.hidden_from_search })}
          />
        </Section>

        {/* ── Profils bloqués ─────────────────────────────────── */}
        <Section icon={<Ban size={15} stroke={C.prune} />} title="Profils bloqués">
          {blocked.length === 0 ? (
            <p style={{ fontSize: 13.5, color: C.muted }}>Tu n'as bloqué personne.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {blocked.map((b) => (
                <div key={b.blocked_id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span
                    style={{
                      flex: 'none',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: b.profile?.avatar_color ?? C.muted,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {b.profile?.first_name?.[0] ?? '?'}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                    {b.profile ? `${b.profile.first_name} ${b.profile.last_initial}` : 'Profil'}
                  </span>
                  <button onClick={() => unblock(b.blocked_id)} style={ghostBtn}>
                    Débloquer
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Mes données (RGPD) ──────────────────────────────── */}
        <Section icon={<Download size={15} stroke={C.prune} />} title="Mes données">
          <Line title="Exporter mes données" hint="Télécharge l'ensemble de tes données au format JSON.">
            <button onClick={exportData} disabled={exporting} className="tu-press" style={primaryBtn}>
              <Download size={15} stroke="#fff" />
              {exporting ? 'Export…' : 'Exporter'}
            </button>
          </Line>
        </Section>

        {/* ── Zone de danger ──────────────────────────────────── */}
        <div style={{ background: '#FBF1F1', border: '1px solid #E7C9C9', borderRadius: 20, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <Shield size={16} stroke="#A53F3F" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#A53F3F' }}>Supprimer mon compte</span>
          </div>
          <p style={{ fontSize: 13, color: '#9B6A6A', lineHeight: 1.45, marginBottom: 14 }}>
            Action définitive et irréversible : ton profil, tes activités, tes messages et ton historique seront
            effacés conformément au RGPD.
          </p>
          <button onClick={() => setConfirmDelete(true)} className="tu-press" style={dangerBtn}>
            <Trash size={15} stroke="#fff" />
            Supprimer définitivement mon compte
          </button>
        </div>
      </div>

      {/* confirm delete modal */}
      {confirmDelete && (
        <>
          <div onClick={() => !deleting && setConfirmDelete(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,24,21,.45)', zIndex: 70 }} />
          <div style={modalCard}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Confirmer la suppression</div>
            <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginBottom: 18 }}>
              Cette action est <strong>irréversible</strong>. Toutes tes données seront définitivement supprimées et tu
              seras déconnecté·e.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={ghostBtnWide}>
                Annuler
              </button>
              <button onClick={deleteAccount} disabled={deleting} className="tu-press" style={dangerBtnWide}>
                {deleting ? 'Suppression…' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </>
      )}

      {flash && (
        <div style={flashStyle}>
          <Check size={13} stroke="#fff" sw={3} />
          {flash}
        </div>
      )}
    </div>
  )
}

// ── building blocks ─────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span
          style={{
            flex: 'none',
            width: 30,
            height: 30,
            borderRadius: 9,
            background: C.pruneSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 15.5, fontWeight: 700 }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Line({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>{hint}</div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ title, hint, on, onChange }: { title: string; hint: string; on: boolean; onChange: () => void }) {
  return (
    <Line title={title} hint={hint}>
      <button
        onClick={onChange}
        aria-label={`${title}: ${on ? 'activé' : 'désactivé'}`}
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
    </Line>
  )
}

function Divider() {
  return <div style={{ height: 1, background: C.line, margin: '14px 0' }} />
}

const backBtn: React.CSSProperties = {
  flex: 'none',
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

const primaryBtn: React.CSSProperties = {
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  background: C.prune,
  border: 'none',
  borderRadius: 10,
  padding: '9px 14px',
  cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  flex: 'none',
  fontSize: 12.5,
  fontWeight: 600,
  color: C.ink,
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: '8px 13px',
  cursor: 'pointer',
}

const badgeOk: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12.5,
  fontWeight: 600,
  color: C.green,
  background: C.greenSoft,
  borderRadius: 999,
  padding: '7px 12px',
}

const dangerBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 16px',
  borderRadius: 12,
  border: 'none',
  background: '#A53F3F',
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
}

const modalCard: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%,-50%)',
  zIndex: 80,
  width: 'min(420px, calc(100vw - 32px))',
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 22,
  padding: 24,
  boxShadow: '0 24px 60px -20px rgba(40,28,34,.5)',
}

const ghostBtnWide: React.CSSProperties = {
  flex: 1,
  padding: 13,
  borderRadius: 13,
  border: `1px solid ${C.line}`,
  background: C.card,
  color: C.ink,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const dangerBtnWide: React.CSSProperties = {
  flex: 1,
  padding: 13,
  borderRadius: 13,
  border: 'none',
  background: '#A53F3F',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const flashStyle: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 26,
  transform: 'translateX(-50%)',
  background: C.ink,
  color: '#fff',
  borderRadius: 12,
  padding: '11px 18px',
  fontSize: 13.5,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 14px 34px -12px rgba(0,0,0,.5)',
  zIndex: 90,
}
