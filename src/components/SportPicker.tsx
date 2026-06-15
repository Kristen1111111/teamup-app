import { C, FONT } from '../lib/tokens'
import type { Sport } from '../lib/types'

// Player skill levels (stored verbatim in profile_sports.level).
export const PLAYER_LEVELS = ['Débutant', 'Intermédiaire', 'Confirmé'] as const
export type PlayerLevel = (typeof PLAYER_LEVELS)[number]

// Map of sport_key -> chosen level. Absence means the sport isn't selected.
export type SportSelection = Record<string, PlayerLevel>

export default function SportPicker({
  sports,
  value,
  onChange,
}: {
  sports: Sport[]
  value: SportSelection
  onChange: (next: SportSelection) => void
}) {
  function toggle(key: string) {
    const next = { ...value }
    if (next[key]) delete next[key]
    else next[key] = 'Intermédiaire'
    onChange(next)
  }

  function setLevel(key: string, level: PlayerLevel) {
    onChange({ ...value, [key]: level })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sports.map((sp) => {
        const on = !!value[sp.key]
        return (
          <div
            key={sp.key}
            style={{
              background: on ? C.pruneSoft : C.card,
              border: on ? `1.5px solid ${C.prune}` : `1px solid ${C.line}`,
              borderRadius: 16,
              padding: 13,
              transition: 'all .15s',
            }}
          >
            <button
              onClick={() => toggle(sp.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  fontWeight: 600,
                  color: sp.color,
                  background: sp.tint,
                  padding: '5px 9px',
                  borderRadius: 8,
                  letterSpacing: '.5px',
                }}
              >
                {sp.code}
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.ink }}>{sp.label}</span>
              <span
                style={{
                  flex: 'none',
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  border: on ? `none` : `2px solid ${C.faint}`,
                  background: on ? C.prune : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {on ? '✓' : ''}
              </span>
            </button>

            {on && (
              <div style={{ display: 'flex', gap: 4, background: '#EBE7DD', borderRadius: 12, padding: 4, marginTop: 11 }}>
                {PLAYER_LEVELS.map((lvl) => {
                  const sel = value[sp.key] === lvl
                  return (
                    <button
                      key={lvl}
                      onClick={() => setLevel(sp.key, lvl)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: 9,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none',
                        background: sel ? C.card : 'transparent',
                        color: sel ? C.prune : C.muted,
                        boxShadow: sel ? '0 1px 3px rgba(40,28,34,.12)' : 'none',
                        transition: 'all .15s',
                      }}
                    >
                      {lvl}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
