import { useState } from 'react'
import type { Coords } from './format'

export type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported'

// Browser geolocation, opt-in. The user taps to share their position, which
// then powers proximity sort + the distance filter in the feed.
export function useGeo() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [status, setStatus] = useState<GeoStatus>('idle')

  function request() {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('granted')
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    )
  }

  function clear() {
    setCoords(null)
    setStatus('idle')
  }

  return { coords, status, request, clear }
}
