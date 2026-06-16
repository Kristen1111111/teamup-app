import { useEffect, useRef, useState } from 'react'
import { C, FONT } from '../lib/tokens'
import { searchPlaces, type Place } from '../lib/geocode'
import { Pin } from './icons'
import MapView from './MapView'

// Map-based location picker (OpenStreetMap). The player types a neighbourhood /
// arrondissement / city; we autocomplete via Photon and, on selection, store the
// label + real coordinates and show the spot on a map. No suggestion shortlist —
// any place in the world resolves to its center.
export default function LocationPicker({
  value,
  onChange,
  placeholder = 'Quartier, arrondissement ou ville…',
  showMap = true,
}: {
  value: Place | null
  onChange: (place: Place | null) => void
  placeholder?: string
  showMap?: boolean
}) {
  const [q, setQ] = useState(value?.label ?? '')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)

  // Debounced autocomplete. Editing the text invalidates any prior selection so
  // the caller can require a real (coordinate-backed) pick before continuing.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 3) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const mine = ++seq.current
    timer.current = setTimeout(async () => {
      const found = await searchPlaces(q)
      if (mine !== seq.current) return // a newer keystroke superseded this one
      setResults(found)
      setLoading(false)
      setOpen(true)
    }, 320)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [q])

  function pick(p: Place) {
    setQ(p.label)
    setResults([])
    setOpen(false)
    onChange(p)
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            if (value) onChange(null) // invalidate until a result is chosen
          }}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '13px 15px',
            borderRadius: 13,
            border: `1px solid ${value ? C.prune : C.line}`,
            background: C.card,
            fontSize: 15,
            color: C.ink,
            outline: 'none',
          }}
        />
        {(open || loading) && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 60,
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 14,
                padding: 6,
                boxShadow: '0 18px 40px -16px rgba(40,28,34,.4)',
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {loading && (
                <div style={{ padding: '10px 12px', fontSize: 13, color: C.muted, fontWeight: 500 }}>Recherche…</div>
              )}
              {!loading && results.length === 0 && q.trim().length >= 3 && (
                <div style={{ padding: '10px 12px', fontSize: 13, color: C.muted, fontWeight: 500 }}>
                  Aucun lieu trouvé.
                </div>
              )}
              {results.map((p, i) => (
                <button
                  key={`${p.lat},${p.lng},${i}`}
                  type="button"
                  onClick={() => pick(p)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '10px 11px',
                    borderRadius: 9,
                    border: 'none',
                    background: 'transparent',
                    color: C.ink,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.pruneSoft)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Pin size={14} stroke={C.prune} sw={1.9} />
                  <span style={{ flex: 1 }}>{p.label}</span>
                </button>
              ))}
              <div
                style={{
                  padding: '6px 11px 2px',
                  fontFamily: FONT.mono,
                  fontSize: 9.5,
                  letterSpacing: '.5px',
                  color: C.faint,
                }}
              >
                © OpenStreetMap
              </div>
            </div>
          </>
        )}
      </div>

      {showMap && value && (
        <div style={{ marginTop: 12 }}>
          <MapView lat={value.lat} lng={value.lng} zoom={13} height={170} />
        </div>
      )}
    </div>
  )
}
