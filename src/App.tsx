import { useEffect, useState } from 'react'
import { C, FONT } from './lib/tokens'
import { supabase } from './lib/supabase'
import type { Profile as ProfileT } from './lib/types'
import { useSession } from './lib/useSession'
import StatusBar from './components/StatusBar'
import BottomNav from './components/BottomNav'
import Login from './screens/Login'
import Feed from './screens/Feed'
import Create from './screens/Create'
import Profile from './screens/Profile'
import Revoir from './screens/Revoir'

export type ScreenName = 'feed' | 'create' | 'profile' | 'revoir'

// DEV-only design QA: open ?preview=feed|create|profile|revoir to render a
// screen with the seeded demo profile, bypassing the magic-link step.
function usePreviewProfile(): { active: boolean; start: ScreenName; profile: ProfileT | null } {
  const params = new URLSearchParams(window.location.search)
  const start = (import.meta.env.DEV ? params.get('preview') : null) as ScreenName | null
  const [profile, setProfile] = useState<ProfileT | null>(null)
  useEffect(() => {
    if (!start) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .single()
      .then(({ data }) => setProfile(data as ProfileT))
  }, [start])
  return { active: !!start, start: start ?? 'feed', profile }
}

export default function App() {
  const { session, profile: realProfile, loading, refreshProfile, setProfile: setRealProfile } = useSession()
  const preview = usePreviewProfile()
  const profile = preview.active ? preview.profile : realProfile
  const setProfile = setRealProfile
  const [screen, setScreen] = useState<ScreenName>(preview.active ? preview.start : 'feed')

  const stage: React.CSSProperties = {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    background: 'radial-gradient(120% 90% at 50% 0%,#E2DFD6 0%,#D4D0C6 100%)',
  }

  const frame: React.CSSProperties = {
    width: 393,
    height: 852,
    maxHeight: '100dvh',
    background: C.paper,
    borderRadius: 42,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 50px 100px -28px rgba(40,28,34,.5),0 0 0 1px rgba(0,0,0,.05)',
    color: C.ink,
  }

  return (
    <div className="tu-stage" style={stage}>
      <div className="tu-frame" style={frame}>
        <StatusBar />

        {loading && !preview.active ? (
          <Splash />
        ) : !preview.active && (!session || !profile) ? (
          <Login />
        ) : !profile ? (
          <Splash />
        ) : (
          <>
            <div className="tu-scroll" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              {screen === 'feed' && <Feed profile={profile} go={setScreen} />}
              {screen === 'create' && <Create profile={profile} go={setScreen} />}
              {screen === 'profile' && (
                <Profile profile={profile} setProfile={setProfile} refreshProfile={refreshProfile} go={setScreen} />
              )}
              {screen === 'revoir' && <Revoir profile={profile} go={setScreen} />}
            </div>

            {(screen === 'feed' || screen === 'profile') && <BottomNav screen={screen} go={setScreen} />}
          </>
        )}
      </div>
    </div>
  )
}

function Splash() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>
          Team<span style={{ color: C.prune }}>Up</span>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted, marginTop: 8, letterSpacing: '1px' }}>
          CHARGEMENT…
        </div>
      </div>
    </div>
  )
}
