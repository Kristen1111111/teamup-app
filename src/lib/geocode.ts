// Geocoding via Photon (https://photon.komoot.io), an OpenStreetMap-based,
// key-free geocoder. Used to turn a typed neighbourhood/city or a venue address
// into real coordinates — the whole feed is distance-based on these.
//
// Attribution: data © OpenStreetMap contributors.

export type Place = {
  label: string
  lat: number
  lng: number
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] } // [lng, lat]
  properties: {
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    district?: string
    county?: string
    state?: string
    country?: string
    osm_value?: string
  }
}

// Build a concise, human label: "Strasbourg, Grand Est" / "Paris 11e, Île-de-France"
// / "12 rue Léon, 75011 Paris".
function labelOf(f: PhotonFeature): string {
  const p = f.properties
  const head = [p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street, p.name]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i) // de-dupe when name === street
    .join(' ')
    .trim()
  const place = p.city || p.district || p.county || ''
  const region = p.state || p.country || ''
  const parts = [head || place, head && place && place !== head ? place : '', region]
    .filter((v, i, a) => v && a.indexOf(v) === i)
  // Keep it short: at most "<head/place>, <region>"
  return parts.slice(0, 2).join(', ')
}

// Autocomplete search for the location picker. Returns up to `limit` places.
export async function searchPlaces(query: string, limit = 6): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=fr&limit=${limit}`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as { features?: PhotonFeature[] }
    const seen = new Set<string>()
    return (data.features ?? [])
      .filter((f) => f.geometry?.coordinates?.length === 2)
      .map((f) => ({
        label: labelOf(f),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }))
      .filter((p) => {
        if (!p.label || seen.has(p.label)) return false
        seen.add(p.label)
        return true
      })
  } catch {
    return []
  }
}

// Best-match coordinates for a single address (e.g. a venue) — first hit, or null.
export async function geocodeOne(query: string): Promise<Place | null> {
  const [first] = await searchPlaces(query, 1)
  return first ?? null
}
