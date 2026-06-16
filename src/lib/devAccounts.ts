// DEV-only test accounts for exercising multi-user interactions without the
// magic-link round-trip. Each one is a real Supabase auth user (email+password,
// confirmed) linked to a seeded profile, so RLS stays fully intact — logging in
// as any of them is a genuine session, just without the e-mail step.
//
// These are NEVER used in production: the switcher that consumes them is gated
// behind `import.meta.env.DEV`. The magic-link remains the only prod auth path.
export const DEV_PASSWORD = 'teamup123'

export type DevAccount = { email: string; name: string; note: string }

export const DEV_ACCOUNTS: DevAccount[] = [
  { email: 'karim@teamup.app', name: 'Karim L.', note: 'Organisateur · 18 matchs' },
  { email: 'salome@teamup.app', name: 'Salomé R.', note: '100% présence · 8 matchs' },
  { email: 'leo@teamup.app', name: 'Léo D.', note: 'Paris 11e · 14 matchs' },
  { email: 'kristen@teamup.app', name: 'Kristen', note: 'Paris 11e' },
  { email: 'kristen.jeu@gmail.com', name: 'Kristen.jeu', note: 'Paris 11e' },
  { email: 'roprupru95@gmail.com', name: 'Roprupru95', note: 'Paris 12e' },
]
