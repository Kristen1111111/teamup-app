import { useEffect, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { NotifType, Notification as Notif, Profile } from '../lib/types'
import { NOTIF_META, PREF_ROWS, timeAgo, pushPermission, enablePush } from '../lib/notifs'
import { Bell, Check, ChevronLeft } from '../components/icons'
import type { ScreenName } from '../App'

// Where a tapped notification takes the user.
const TARGET: Record<NotifType, ScreenName> = {
  request: 'activities',
  accepted: 'activities',
  freed: 'activities',
  reminder: 'activities',
  invite: 'feed',
  mutual: 'revoir',
}

export default function Notifications({
  profile,
  setProfile,
  go,
  onChange,
}: {
  profile: Profile
  setProfile: (p: Profile) => void
  go: (s: ScreenName) => void
  onChange: () => void
}) {
  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [showPrefs, setShowPrefs] = useState(false)
  const [perm, setPerm] = useState(pushPermission())

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(60)
    setItems((data as Notif[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unread = items.filter((n) => !n.read_at).length

  async function markAll() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id)
    if (!ids.length) return
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })))
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
    onChange()
  }

  async function open(n: Notif) {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id)
      onChange()
    }
    go(TARGET[n.type])
  }

  async function togglePref(type: NotifType) {
    const next = { ...profile.notif_prefs, [type]: !profile.notif_prefs?.[type] }
    setProfile({ ...profile, notif_prefs: next }) // optimistic
    await supabase.from('profiles').update({ notif_prefs: next }).eq('id', profile.id)
  }

  async function turnOnPush() {
    const r = await enablePush()
    setPerm(r)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <button onClick={() => go('feed')} style={backBtn} title="Retour">
          <ChevronLeft />
        </button>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 30, fontWeight: 500, letterSpacing: '-.01em', flex: 1 }}>
          Notifications
        </h1>
        <button
          onClick={() => setShowPrefs((s) => !s)}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: showPrefs ? C.prune : C.muted,
            background: showPrefs ? C.pruneSoft : 'transparent',
            border: 'none',
            borderRadius: 10,
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          Préférences
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>
          {unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tu es à jour'}
        </p>
        {unread > 0 && (
          <button
            onClick={markAll}
            style={{ fontSize: 13, fontWeight: 600, color: C.prune, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* preferences panel (F6 activables par type + anti-spam + push) */}
      {showPrefs && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: 18, marginBottom: 18 }}>
          {/* browser push */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingBottom: 14,
              borderBottom: `1px solid ${C.line}`,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                flex: 'none',
                width: 38,
                height: 38,
                borderRadius: 11,
                background: C.pruneSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} stroke={C.prune} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Notifications du navigateur</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                {perm === 'unsupported'
                  ? 'Non disponible sur cet appareil'
                  : perm === 'granted'
                    ? 'Activées · tu seras alerté en direct'
                    : perm === 'denied'
                      ? 'Bloquées dans les réglages du navigateur'
                      : 'Reçois une alerte même quand l’onglet est en arrière-plan'}
              </div>
            </div>
            {perm !== 'granted' && perm !== 'unsupported' && perm !== 'denied' && (
              <button
                onClick={turnOnPush}
                className="tu-press"
                style={{
                  flex: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: C.prune,
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 13px',
                  cursor: 'pointer',
                }}
              >
                Activer
              </button>
            )}
            {perm === 'granted' && <Check size={16} stroke={C.green} sw={3} />}
          </div>

          {/* per-type toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PREF_ROWS.map((row) => {
              const on = profile.notif_prefs?.[row.type] ?? true
              return (
                <div key={row.type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{row.hint}</div>
                  </div>
                  <button
                    onClick={() => togglePref(row.type)}
                    aria-label={`${row.label}: ${on ? 'activé' : 'désactivé'}`}
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
            })}
          </div>
        </div>
      )}

      {/* list */}
      {loading && <div style={{ color: C.muted, fontSize: 14 }}>Chargement…</div>}
      {!loading && items.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: C.muted,
            fontSize: 14,
            padding: '48px 0',
            background: C.card,
            border: `1px dashed ${C.faint}`,
            borderRadius: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Bell size={26} stroke={C.faint} />
          </div>
          Aucune notification pour l’instant.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((n) => {
          const meta = NOTIF_META[n.type]
          return (
            <button
              key={n.id}
              onClick={() => open(n)}
              className="tu-press"
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 13,
                background: n.read_at ? C.card : '#FBF8F1',
                border: `1px solid ${n.read_at ? C.line : C.prune}`,
                borderRadius: 18,
                padding: '15px 16px',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  flex: 'none',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: meta.tint,
                  color: meta.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bell size={18} stroke={meta.color} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: '1px', color: meta.color, fontWeight: 600 }}>
                    {meta.label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: C.faint, fontWeight: 500 }}>· {timeAgo(n.created_at)}</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 3 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
              </div>
              {!n.read_at && (
                <span style={{ flex: 'none', width: 9, height: 9, borderRadius: '50%', background: C.prune, marginTop: 6 }} />
              )}
            </button>
          )
        })}
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
  flex: 'none',
}
