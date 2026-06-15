import { useState } from 'react'
import { C, FONT } from '../lib/tokens'
import type { Activity } from '../lib/types'
import { activityUrl, copyLink, nativeShare, smsUrl, whatsappUrl } from '../lib/share'
import { WhatsApp, Message, Instagram, Link, Share, Check } from './icons'

// Native sharing block used on the public activity page and the manage screen.
export default function ShareBar({ activity, compact }: { activity: Activity; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const url = activityUrl(activity.id)

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  async function onCopy() {
    const ok = await copyLink(activity.id)
    setCopied(ok)
    flash(ok ? 'Lien copié' : 'Copie impossible — sélectionne le lien')
    window.setTimeout(() => setCopied(false), 1600)
  }

  // Instagram has no link-prefill intent: we copy the link so it can be pasted
  // into a story/DM, which is the honest, working behaviour.
  async function onInstagram() {
    const ok = await copyLink(activity.id)
    flash(ok ? 'Lien copié — colle-le dans ta story' : 'Copie impossible')
  }

  return (
    <div>
      {!compact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: 13,
            padding: '11px 14px',
          }}
        >
          <Link size={16} stroke={C.prune} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: FONT.mono,
              fontSize: 12.5,
              color: C.muted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {url.replace(/^https?:\/\//, '')}
          </span>
          <button
            onClick={onCopy}
            className="tu-press"
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              borderRadius: 9,
              padding: '7px 11px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: copied ? C.green : C.prune,
              color: '#fff',
            }}
          >
            {copied ? <Check size={11} /> : <Link size={13} stroke="#fff" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 9, marginTop: compact ? 0 : 11, flexWrap: 'wrap' }}>
        <Channel label="WhatsApp" color="#1FA855" href={whatsappUrl(activity)} icon={<WhatsApp size={17} fill="#fff" />} />
        <Channel label="SMS" color="#2E7BD6" href={smsUrl(activity)} icon={<Message size={16} stroke="#fff" />} />
        <Channel
          label="Instagram"
          color="#C13584"
          onClick={onInstagram}
          icon={<Instagram size={16} stroke="#fff" sw={2} />}
        />
        <Channel
          label="Partager…"
          color={C.ink}
          onClick={async () => {
            const ok = await nativeShare(activity)
            if (!ok) onCopy()
          }}
          icon={<Share size={15} stroke="#fff" />}
        />
      </div>

      {toast && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12.5,
            fontWeight: 600,
            color: C.green,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Check size={11} stroke={C.green} />
          {toast}
        </div>
      )}
    </div>
  )
}

function Channel({
  label,
  color,
  icon,
  href,
  onClick,
}: {
  label: string
  color: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
}) {
  const inner = (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: color,
        color: '#fff',
        borderRadius: 12,
        padding: '11px 15px',
        fontSize: 13.5,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </span>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="tu-press" style={{ textDecoration: 'none', flex: '1 1 auto' }}>
        {inner}
      </a>
    )
  }
  return (
    <button onClick={onClick} className="tu-press" style={{ border: 'none', background: 'none', padding: 0, flex: '1 1 auto' }}>
      {inner}
    </button>
  )
}
