import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { C } from '../lib/tokens'

// Lightweight OpenStreetMap map (Leaflet). Shows a single point with a prune
// marker — used to preview a chosen neighbourhood / venue. No API key needed.
// We draw the marker with a divIcon so we don't depend on Leaflet's PNG assets
// (which break under Vite's asset hashing).
export default function MapView({
  lat,
  lng,
  zoom = 13,
  height = 180,
  radiusKm,
}: {
  lat: number
  lng: number
  zoom?: number
  height?: number
  // Optional translucent circle (e.g. the 10 km search radius around home).
  radiusKm?: number
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  // Init once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { attributionControl: true, zoomControl: true }).setView([lat, lng], zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    // Leaflet needs a size recalc once the container has its final dimensions.
    setTimeout(() => map.invalidateSize(), 0)
    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep view + marker + radius in sync with props.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setView([lat, lng], zoom)

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;border-radius:50%;background:${C.prune};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]).setIcon(icon)
    else markerRef.current = L.marker([lat, lng], { icon }).addTo(map)

    if (circleRef.current) {
      circleRef.current.remove()
      circleRef.current = null
    }
    if (radiusKm && radiusKm > 0) {
      circleRef.current = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: C.prune,
        weight: 1,
        fillColor: C.prune,
        fillOpacity: 0.08,
      }).addTo(map)
      map.fitBounds(circleRef.current.getBounds(), { padding: [16, 16] })
    }
  }, [lat, lng, zoom, radiusKm])

  return (
    <div
      ref={elRef}
      style={{
        height,
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${C.line}`,
        zIndex: 0,
      }}
    />
  )
}
