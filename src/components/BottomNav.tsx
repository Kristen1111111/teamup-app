import { C } from '../lib/tokens'
import { NavHome, NavUser, Plus } from './icons'
import type { ScreenName } from '../App'

export default function BottomNav({ screen, go }: { screen: ScreenName; go: (s: ScreenName) => void }) {
  const navFeed = screen === 'feed' ? C.prune : C.navIdle
  const navProfile = screen === 'profile' ? C.prune : C.navIdle

  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '10px 26px 26px',
        background: C.card,
        borderTop: `1px solid ${C.line}`,
      }}
    >
      <button onClick={() => go('feed')} style={navBtn}>
        <NavHome stroke={navFeed} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: navFeed }}>Activités</span>
      </button>

      <button onClick={() => go('create')} style={{ ...navBtn, marginTop: -2 }}>
        <span
          style={{
            width: 50,
            height: 38,
            borderRadius: 14,
            background: C.prune,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 18px -6px rgba(92,32,73,.6)',
          }}
        >
          <Plus size={22} stroke="#fff" sw={2.4} />
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: C.prune }}>Créer</span>
      </button>

      <button onClick={() => go('profile')} style={navBtn}>
        <NavUser stroke={navProfile} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: navProfile }}>Profil</span>
      </button>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
}
