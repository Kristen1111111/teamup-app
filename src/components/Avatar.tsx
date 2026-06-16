import { useState } from 'react'
import { C } from '../lib/tokens'
import { Check } from './icons'

type AvatarProps = {
  url?: string | null
  color: string
  letter: string
  size: number
  verified?: boolean
  radius?: number | string
}

// Shared avatar: photo when available, otherwise the solid-color + initial
// fallback canonicalised in MyActivities (background = color, fontWeight 700,
// fontSize ≈ size * 0.4). The optional verified badge mirrors Profile's pastille.
export default function Avatar({
  url,
  color,
  letter,
  size,
  verified = false,
  radius = '50%',
}: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(url) && !failed

  // Proportional verified badge (Profile uses 26 / 3 / size 13 at size 88).
  const badgeSize = Math.max(14, Math.round(size * 0.295))
  const badgeBorder = Math.max(2, Math.round(size * 0.034))
  const checkSize = Math.max(8, Math.round(size * 0.148))

  return (
    <div style={{ position: 'relative', flex: 'none', width: size, height: size }}>
      {showImage ? (
        <img
          src={url as string}
          alt=""
          onError={() => setFailed(true)}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: color,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: Math.round(size * 0.4),
          }}
        >
          {letter}
        </div>
      )}
      {verified && (
        <span
          style={{
            position: 'absolute',
            right: 0,
            bottom: Math.round(size * 0.023),
            width: badgeSize,
            height: badgeSize,
            borderRadius: '50%',
            background: C.prune,
            border: `${badgeBorder}px solid ${C.paper}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={checkSize} />
        </span>
      )}
    </div>
  )
}
