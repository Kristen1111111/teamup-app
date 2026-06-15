// Design tokens ported verbatim from TeamUp.dc.html
// Hinge (cream + serif + prune) · Linear (clean grotesk UI) · Strava (mono data)

export const C = {
  paper: '#F4F2EC',
  card: '#FFFFFF',
  ink: '#1C1815',
  muted: '#8C8377',
  faint: '#BCB5A8',
  line: '#E9E4DA',
  prune: '#5C2049',
  prune2: '#7A2E62',
  pruneSoft: '#F1E6EC',
  green: '#2E6B45',
  greenSoft: '#E6EFE8',
  navIdle: '#9A9183',
} as const

export const FONT = {
  sans: "'Hanken Grotesk',-apple-system,sans-serif",
  serif: "'Newsreader',Georgia,serif",
  mono: "'JetBrains Mono',monospace",
} as const

// Mode labels shown on cards / used at creation
export const MODE_LABEL: Record<string, string> = {
  direct: 'Inscription directe',
  approve: 'À approuver',
  wait: "Liste d'attente",
}
