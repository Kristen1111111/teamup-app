// Zones available for a player's home area (the feed is centred on this).
// Single source of truth — TopNav, EditProfile and the feed all read this list,
// so the picker can never drift between screens.
export const CITIES = [
  'Paris 11e',
  'Paris 12e',
  'Paris 18e',
  'Paris 19e',
  'Lyon',
  'Marseille',
  'Bordeaux',
  'Toulouse',
  'Lille',
  'Nantes',
]

// A "city area" groups arrondissements: "Paris 11e" / "Paris 19e" → "Paris",
// "Lyon 7e" → "Lyon". The feed matches a player's home zone against an
// activity's venue on this area, so switching to Marseille really does swap
// the feed instead of showing the same Parisian list.
export function cityArea(city: string): string {
  return city.replace(/\s+\d+\s*(?:er|e|ème|eme)?\b.*$/i, '').trim() || city.trim()
}

export type Venue = { code: string; name: string; address: string; lat: number; lng: number }

// Lieux proposés à la création, groupés par ville. Le `code` doit correspondre à
// un cas connu du trigger `tg_activity_geocode` (sinon coords = centre de Paris) —
// c'est lui qui alimente le tri "Près de moi" / le badge distance du feed.
export const VENUES_BY_AREA: Record<string, Venue[]> = {
  Paris: [
    { code: 'CITY STADE LÉON', name: 'City Stade Léon · Paris 11e', address: '12 rue Léon, 75011 Paris', lat: 48.8575, lng: 2.376 },
    { code: 'PLAYGROUND JAURÈS', name: 'Playground Jaurès · Paris 19e', address: 'Av. Jean Jaurès, 75019 Paris', lat: 48.883, lng: 2.37 },
    { code: 'PADEL CLUB BASTILLE', name: 'Padel Club Bastille · Paris 12e', address: 'Bd de la Bastille, 75012 Paris', lat: 48.853, lng: 2.369 },
    { code: "CANAL DE L'OURCQ", name: "Canal de l'Ourcq · Paris 19e", address: 'Quai de la Marne, 75019 Paris', lat: 48.889, lng: 2.379 },
  ],
  Lyon: [
    { code: 'HALLE TONY GARNIER', name: 'Halle Tony Garnier · Lyon 7e', address: '20 Pl. Antonin Perrin, 69007 Lyon', lat: 45.732, lng: 4.82 },
    { code: 'BERGES DU RHÔNE', name: 'Berges du Rhône · Lyon 6e', address: 'Quai Victor Augagneur, 69003 Lyon', lat: 45.764, lng: 4.847 },
  ],
  Marseille: [
    { code: 'PLAINE SPORTIVE MICHELET', name: 'Plaine Sportive · Marseille 8e', address: 'Bd Michelet, 13008 Marseille', lat: 43.27, lng: 5.395 },
    { code: 'BEACH PRADO', name: 'Beach Sport Prado · Marseille 8e', address: 'Av. Pierre Mendès France, 13008 Marseille', lat: 43.262, lng: 5.376 },
  ],
  Bordeaux: [
    { code: 'PARC BORDELAIS', name: 'Parc Bordelais · Bordeaux', address: 'Rue du Bocage, 33000 Bordeaux', lat: 44.854, lng: -0.595 },
    { code: 'QUAI DES SPORTS BX', name: 'Quai des Sports · Bordeaux', address: 'Quai de Queyries, 33100 Bordeaux', lat: 44.848, lng: -0.55 },
  ],
  Toulouse: [
    { code: 'PRAIRIE DES FILTRES', name: 'Prairie des Filtres · Toulouse', address: 'Allées Paul Feuga, 31000 Toulouse', lat: 43.593, lng: 1.436 },
    { code: 'CITY STADE WALLON', name: 'City Stade Wallon · Toulouse', address: 'Av. des Arènes Romaines, 31300 Toulouse', lat: 43.623, lng: 1.408 },
  ],
  Lille: [
    { code: 'CITADELLE DE LILLE', name: 'Parc de la Citadelle · Lille', address: 'Av. du 43e RI, 59000 Lille', lat: 50.642, lng: 3.048 },
    { code: 'CITY STADE WAZEMMES', name: 'City Stade Wazemmes · Lille', address: 'Rue des Sarrazins, 59000 Lille', lat: 50.626, lng: 3.053 },
  ],
  Nantes: [
    { code: 'ÎLE DE NANTES', name: 'City Stade Île de Nantes · Nantes', address: 'Bd Léon Bureau, 44200 Nantes', lat: 47.205, lng: -1.565 },
    { code: 'PARC DE PROCÉ', name: 'Parc de Procé · Nantes', address: 'Rue des Dervallières, 44100 Nantes', lat: 47.223, lng: -1.58 },
  ],
}

// Venues offered when creating an activity in a given home zone (falls back to
// Paris for any zone without a dedicated catalogue).
export function venuesForCity(city: string): Venue[] {
  return VENUES_BY_AREA[cityArea(city)] ?? VENUES_BY_AREA.Paris
}

// The city label embedded in a venue name ("… · Paris 11e" → "Paris 11e").
export function venueCity(venueName: string): string {
  const parts = venueName.split(' · ')
  return parts[parts.length - 1] ?? venueName
}

// True when an activity's venue sits in the same metro area as `city`.
export function venueInCity(venueName: string, city: string): boolean {
  return cityArea(venueCity(venueName)) === cityArea(city)
}

// Back-compat flat list (the original Parisian venues).
export const VENUES = VENUES_BY_AREA.Paris
