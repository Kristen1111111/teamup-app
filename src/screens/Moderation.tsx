import { useEffect, useMemo, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import type { Profile, ReportStatus } from '../lib/types'
import { timeAgo } from '../lib/notifs'
import { ChevronLeft, Shield, Flag, Check, Close, VerifiedDot } from '../components/icons'
import type { ScreenName } from '../App'

type Mini = { first_name: string; last_initial: string; avatar_color: string; verified?: boolean }
type Row = {
  id: string
  reason: string
  details: string | null
  status: ReportStatus
  created_at: string
  reporter: Mini | null
  reported: Mini | null
  activity: { ask: string; venue_code: string } | null
}

const STATUS_META: Record<ReportStatus, { label: string; color: string; tint: string }> = {
  open: { label: 'À traiter', color: '#B06A1B', tint: '#F6ECDD' },
  reviewing: { label: 'En cours', color: '#5C2049', tint: '#F1E6EC' },
  resolved: { label: 'Résolu', color: '#2E6B45', tint: '#E6EFE8' },
  dismissed: { label: 'Rejeté', color: '#8C8377', tint: '#ECE8DF' },
}

const TABS: { k: 'pending' | 'done'; l: string }[] = [
  { k: 'pending', l: 'À traiter' },
  { k: 'done', l: 'Traités' },
]

export default function Moderation({ profile, go }: { profile: Profile; go: (s: ScreenName) => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'done'>('pending')
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('reports')
      .select(
        `id, reason, details, status, created_at,
         reporter:profiles!reports_reporter_id_fkey(first_name, last_initial, avatar_color),
         reported:profiles!reports_reported_profile_id_fkey(first_name, last_initial, avatar_color, verified),
         activity:activities(ask, venue_code)`,
      )
      .order('created_at', { ascending: false })
    setRows((data as unknown as Row[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = useMemo(
    () =>
      rows.filter((r) => (tab === 'pending' ? r.status === 'open' || r.status === 'reviewing' : r.status === 'resolved' || r.status === 'dismissed')),
    [rows, tab],
  )
  const openCount = rows.filter((r) => r.status === 'open').length

  async function setStatus(id: string, status: ReportStatus) {
    setBusy(id)
    const patch: Record<string, unknown> = { status }
    if (status === 'resolved' || status === 'dismissed') {
      patch.resolved_at = new Date().toISOString()
      patch.resolved_by = profile.id
    } else {
      patch.resolved_at = null
      patch.resolved_by = null
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    await supabase.from('reports').update(patch).eq('id', id)
    setBusy(null)
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <button onClick={() => go('profile')} style={backBtn} title="Retour">
          <ChevronLeft />
        </button>
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
          <Shield size={19} stroke={C.prune} />
        </span>
        <h1 style={{ fontFamily: FONT.serif, fontSize: 28, fontWeight: 500, letterSpacing: '-.01em' }}>Modération</h1>
      </div>
      <p style={{ fontSize: 14, color: C.muted, fontWeight: 500, marginBottom: 18 }}>
        File des signalements. {openCount > 0 ? `${openCount} en attente de traitement.` : 'Rien à traiter pour l’instant.'}
      </p>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#EBE7DD', borderRadius: 14, padding: 4, maxWidth: 320 }}>
        {TABS.map((t) => {
          const on = tab === t.k
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRadius: 11,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: on ? C.card : 'transparent',
                color: on ? C.prune : C.muted,
                boxShadow: on ? '0 1px 3px rgba(40,28,34,.12)' : 'none',
              }}
            >
              {t.l}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ color: C.muted, fontSize: 14 }}>Chargement…</div>}
        {!loading && shown.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: C.muted,
              fontSize: 14,
              padding: '40px 0',
              background: C.card,
              border: `1px dashed ${C.faint}`,
              borderRadius: 20,
            }}
          >
            {tab === 'pending' ? 'Aucun signalement en attente.' : 'Aucun signalement traité.'}
          </div>
        )}

        {shown.map((r) => {
          const meta = STATUS_META[r.status]
          return (
            <div key={r.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '16px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Flag size={15} stroke={C.prune} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>{r.reason}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontFamily: FONT.mono,
                    fontSize: 9.5,
                    letterSpacing: '.6px',
                    fontWeight: 700,
                    color: meta.color,
                    background: meta.tint,
                    borderRadius: 999,
                    padding: '4px 9px',
                  }}
                >
                  {meta.label.toUpperCase()}
                </span>
              </div>

              {r.details && (
                <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.45, marginBottom: 12 }}>{r.details}</p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginBottom: 12 }}>
                <Party label="Signalé par" p={r.reporter} />
                <Party label="Concerne" p={r.reported} />
                {r.activity && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: '.6px', color: C.faint, fontWeight: 600 }}>
                      ACTIVITÉ
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.activity.venue_code}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 11.5, color: C.faint, fontWeight: 500, marginRight: 'auto' }}>{timeAgo(r.created_at)}</span>
                {(r.status === 'open' || r.status === 'reviewing') ? (
                  <>
                    {r.status === 'open' && (
                      <button onClick={() => setStatus(r.id, 'reviewing')} disabled={busy === r.id} style={ghostAction}>
                        Prendre en charge
                      </button>
                    )}
                    <button onClick={() => setStatus(r.id, 'dismissed')} disabled={busy === r.id} style={ghostAction}>
                      <Close size={14} stroke={C.muted} />
                      Rejeter
                    </button>
                    <button onClick={() => setStatus(r.id, 'resolved')} disabled={busy === r.id} style={primaryAction}>
                      <Check size={14} stroke="#fff" sw={3} />
                      Résoudre
                    </button>
                  </>
                ) : (
                  <button onClick={() => setStatus(r.id, 'open')} disabled={busy === r.id} style={ghostAction}>
                    Rouvrir
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Party({ label, p }: { label: string; p: Mini | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: '.6px', color: C.faint, fontWeight: 600 }}>
        {label.toUpperCase()}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
        {p ? (
          <>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: p.avatar_color,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {p.first_name[0]}
            </span>
            {p.first_name} {p.last_initial}
            {p.verified && <VerifiedDot size={13} />}
          </>
        ) : (
          <span style={{ color: C.muted }}>—</span>
        )}
      </span>
    </div>
  )
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

const ghostAction: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 10,
  border: `1px solid ${C.line}`,
  background: C.card,
  color: C.ink,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
}

const primaryAction: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 13px',
  borderRadius: 10,
  border: 'none',
  background: C.green,
  color: '#fff',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
}
