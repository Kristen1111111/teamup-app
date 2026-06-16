import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEV_ACCOUNTS, DEV_PASSWORD, type DevAccount } from '../lib/devAccounts'

// Floating DEV-only account switcher. Lets you sign in as any seeded test
// account (real session, RLS intact) without the magic-link e-mail — so you can
// test interactions between users by switching, or open two windows side by
// side. Rendered only when `import.meta.env.DEV` (see App.tsx / Login.tsx).
export default function DevSwitcher({ profileName }: { profileName?: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  const current = DEV_ACCOUNTS.find((a) => a.email === email)

  async function switchTo(acc: DevAccount) {
    setBusy(acc.email)
    setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email: acc.email, password: DEV_PASSWORD })
    if (error) {
      setBusy(null)
      setErr(error.message)
      return
    }
    // Full reload so useSession re-bootstraps cleanly as the new user.
    window.location.assign('/')
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999, fontFamily: 'monospace', fontSize: 12 }}>
      {open && (
        <div
          style={{
            marginBottom: 8,
            width: 240,
            background: '#1B1417',
            border: '1px solid #3A2E34',
            borderRadius: 12,
            padding: 8,
            boxShadow: '0 8px 28px rgba(0,0,0,.35)',
          }}
        >
          <div style={{ color: '#B79BAA', padding: '4px 8px 8px', letterSpacing: '.5px' }}>SE CONNECTER EN TANT QUE</div>
          {DEV_ACCOUNTS.map((a) => {
            const on = a.email === email
            return (
              <button
                key={a.email}
                onClick={() => switchTo(a)}
                disabled={!!busy}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1,
                  padding: '8px 9px',
                  marginBottom: 2,
                  borderRadius: 8,
                  border: 'none',
                  cursor: busy ? 'default' : 'pointer',
                  background: on ? '#3A2436' : 'transparent',
                  color: '#F4F2EC',
                  textAlign: 'left',
                  opacity: busy && busy !== a.email ? 0.5 : 1,
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {on ? '● ' : ''}
                  {a.name}
                  {busy === a.email ? ' …' : ''}
                </span>
                <span style={{ color: '#9C8794', fontSize: 11 }}>{a.note}</span>
              </button>
            )
          })}
          {email && (
            <button
              onClick={signOut}
              disabled={!!busy}
              style={{
                width: '100%',
                padding: '8px 9px',
                marginTop: 4,
                borderRadius: 8,
                border: '1px solid #3A2E34',
                background: 'transparent',
                color: '#C98C8C',
                cursor: 'pointer',
              }}
            >
              Se déconnecter
            </button>
          )}
          {err && <div style={{ color: '#E59A9A', padding: '6px 8px 0', fontSize: 11 }}>{err}</div>}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 12px',
          borderRadius: 999,
          border: '1px solid #3A2E34',
          background: '#1B1417',
          color: '#F4F2EC',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,.3)',
        }}
        title="Switcher de comptes (DEV)"
      >
        <span>🧪</span>
        <span style={{ fontWeight: 700 }}>{profileName ?? current?.name ?? (email ? 'connecté' : 'déconnecté')}</span>
        <span style={{ color: '#9C8794' }}>{open ? '▾' : '▸'}</span>
      </button>
    </div>
  )
}
