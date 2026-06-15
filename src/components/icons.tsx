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

export const WhatsApp = ({ size = 18, fill = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
    <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm0 18.3a8.3 8.3 0 0 1-4.2-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.3 8.3 0 1 1 12 20.3Zm4.6-6.2c-.300-.13-1.5-.74-1.7-.82-.23-.08-.4-.13-.56.13-.17.25-.64.82-.79.99-.14.17-.29.19-.54.06a6.8 6.8 0 0 1-2-1.24 7.5 7.5 0 0 1-1.38-1.72c-.14-.25 0-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.43 1.03 2.6.13.17 1.78 2.72 4.3 3.81.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.29Z" />
  </svg>
)

export const Message = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16v11H8l-4 3.5V5Z" />
  </svg>
)

export const Instagram = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="1.1" fill={stroke} stroke="none" />
  </svg>
)

export const Link = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M10 6.5 11.7 4.8a4 4 0 0 1 5.7 5.7L15.7 12" />
    <path d="M14 17.5 12.3 19.2a4 4 0 0 1-5.7-5.7L8.3 12" />
  </svg>
)

export const Users = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6" />
    <path d="M17.5 13.4A5.5 5.5 0 0 1 20.5 18.4" />
  </svg>
)

export const Bell = ({ size = 20, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 2 7H4c.5-.5 2-2 2-7Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
)

export const Calendar = ({ size = 20, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
)

export const Repeat = ({ size = 18, stroke = 'currentColor', sw = 1.9 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9a5 5 0 0 1 5-5h8l-2.5-2.5M20 15a5 5 0 0 1-5 5H7l2.5 2.5" />
  </svg>
)

export const Send = ({ size = 18, stroke = 'currentColor', sw = 1.9 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 3 11 13" />
    <path d="M21 3 14.5 21l-3.5-8-8-3.5L21 3Z" />
  </svg>
)

export const Flag = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 21V4" />
    <path d="M5 4.5c4-2 7 2 11 0v8c-4 2-7-2-11 0" />
  </svg>
)

export const Ban = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6 18.4 18.4" />
  </svg>
)

export const Shield = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
  </svg>
)

export const Trash = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
)

export const Download = ({ size = 18, stroke = 'currentColor', sw = 1.8 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11M8 11l4 4 4-4" />
    <path d="M5 19h14" />
  </svg>
)

export const Gear = ({ size = 18, stroke = 'currentColor', sw = 1.7 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
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
