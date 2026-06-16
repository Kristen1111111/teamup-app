import { C } from '../lib/tokens'
import { CITIES } from '../lib/cities'
import { Pin } from './icons'

// Free-form city input with quick-pick suggestions. Lets a player set their home
// zone to ANY city (typed), while the curated list stays as one-tap shortcuts.
// Used by onboarding and the profile editor so the two never drift.
export default function CityField({
  value,
  onChange,
  suggestions = CITIES,
}: {
  value: string
  onChange: (city: string) => void
  suggestions?: string[]
}) {
  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ta ville (ex. Strasbourg, Rennes, Annecy…)"
        autoComplete="address-level2"
        style={{
          width: '100%',
          padding: '13px 15px',
          borderRadius: 13,
          border: `1px solid ${C.line}`,
          background: C.card,
          fontSize: 15,
          color: C.ink,
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 12 }}>
        {suggestions.map((c) => {
          const on = c === value
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 13px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${on ? C.prune : C.line}`,
                background: on ? C.prune : C.card,
                color: on ? '#fff' : C.ink,
                transition: 'all .15s',
              }}
            >
              <Pin size={12} stroke={on ? '#fff' : C.prune} sw={1.9} />
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}
