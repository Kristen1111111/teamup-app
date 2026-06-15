// iOS-style status bar from the design (9:41 + signal/wifi/battery)
export default function StatusBar() {
  return (
    <div
      style={{
        height: 50,
        flex: 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 28px 7px',
        zIndex: 20,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.3px' }}>9:41</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="4.5" y="5" width="3" height="7" rx="1" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="1" />
          <rect x="13.5" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.1c2.5 0 4.8 1 6.5 2.7l-1.4 1.4A7 7 0 0 0 8 4.2 7 7 0 0 0 2.9 6.2L1.5 4.8A9.3 9.3 0 0 1 8 2.1Z" />
          <path d="M8 6.1c1.4 0 2.7.6 3.6 1.5l-1.4 1.5A2.7 2.7 0 0 0 8 8.3a2.7 2.7 0 0 0-2.2.8L4.4 7.6A5.2 5.2 0 0 1 8 6.1Z" />
          <circle cx="8" cy="10.4" r="1.3" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" strokeOpacity=".4" />
          <rect x="2.2" y="2.2" width="16" height="7.6" rx="1.6" fill="currentColor" />
          <rect x="23" y="4" width="1.6" height="4" rx=".8" fill="currentColor" fillOpacity=".4" />
        </svg>
      </div>
    </div>
  )
}
