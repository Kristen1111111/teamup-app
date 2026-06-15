// SVG icons ported from TeamUp.dc.html
import type { CSSProperties } from 'react'

type P = { size?: number; stroke?: string; fill?: string; style?: CSSProperties; sw?: number }

export const Pin = ({ size = 15, stroke = 'currentColor', sw = 1.7 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21c4-4.5 6-7.7 6-10.5A6 6 0 0 0 6 10.5C6 13.3 8 16.5 12 21Z" />
    <circle cx="12" cy="10.5" r="2" />
  </svg>
)

export const Clock = ({ size = 15, stroke = 'currentColor', sw = 1.7 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
)

export const Chevron = ({ size = 11, stroke = 'currentColor', sw = 2 }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8l5 5 5-5" />
  </svg>
)

export const ChevronRight = ({ size = 18, stroke = '#fff', sw = 1.9 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export const ChevronLeft = ({ size = 18, stroke = 'currentColor', sw = 2 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 6l-6 6 6 6" />
  </svg>
)

export const Heart = ({ size = 22, fill = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
    <path d="M12 20.5C6.5 16.5 4 13.2 4 9.8 4 7 6 5 8.5 5c1.7 0 3 .9 3.5 2 .5-1.1 1.8-2 3.5-2C18 5 20 7 20 9.8c0 3.4-2.5 6.7-8 10.7Z" />
  </svg>
)

export const HeartGradient = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
    <path d="M12 20.5C6.5 16.5 4 13.2 4 9.8 4 7 6 5 8.5 5c1.7 0 3 .9 3.5 2 .5-1.1 1.8-2 3.5-2C18 5 20 7 20 9.8c0 3.4-2.5 6.7-8 10.7Z" />
  </svg>
)

export const Check = ({ size = 9, stroke = '#fff', sw = 3.4 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5 10 17 19 7" />
  </svg>
)

export const Lock = ({ size = 13, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const Close = ({ size = 18, stroke = 'currentColor', sw = 2 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const Minus = ({ size = 18, stroke = 'currentColor', sw = 2.2 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round">
    <path d="M5 12h14" />
  </svg>
)

export const Plus = ({ size = 18, stroke = 'currentColor', sw = 2.2 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const Timer = ({ size = 12, stroke = 'currentColor', sw = 2 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 13V9M9 2h6" />
  </svg>
)

export const NavHome = ({ size = 24, stroke = 'currentColor', sw = 1.9 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9.5h13V10" />
  </svg>
)

export const NavUser = ({ size = 24, stroke = 'currentColor', sw = 1.9 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
  </svg>
)

export const Share = ({ size = 17, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15V4M8.5 7.5 12 4l3.5 3.5" />
    <path d="M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" />
  </svg>
)

export const Dots = ({ size = 17, fill = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
)

// Verified badge pill (prune circle + white check)
export const VerifiedDot = ({ size = 15 }: { size?: number }) => (
  <span
    style={{
      display: 'inline-flex',
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#5C2049',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Check size={size * 0.6} />
  </span>
)
