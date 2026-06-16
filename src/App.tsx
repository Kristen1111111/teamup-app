// Composant racine de l'app TeamUp : gère session, routing et navigation.
import { useEffect, useState } from 'react'
import { C, FONT } from './lib/tokens'
import { supabase } from './lib/supabase'
import type { Profile as ProfileT } from './lib/types'
import { useSession } from './lib/useSession'
import { useRoute } from './lib/router'
import { useUnread } from './lib/notifs'
import { useUnreadMessages } from './lib/messages'
import TopNav from './components/TopNav'
import Login from './screens/Login'
import Feed from './screens/Feed'
import Create from './screens/Create'
import Profile from './screens/Profile'
import Revoir from './screens/Revoir'
import Manage from './screens/Manage'
import MyActivities from './screens/MyActivities'
import Notifications from './screens/Notifications'
import PublicActivity from './screens/PublicActivity'
import Onboarding from './screens/Onboarding'
import EditProfile from './screens/EditProfile'
import PlayerProfile from './screens/PlayerProfile'
import Messages from './screens/Messages'
import Settings from './screens/Settings'
import Moderation from './screens/Moderation'
import Legal from './screens/Legal'
import DevSwitcher from './components/DevSwitcher'

export type ScreenName =
  | 'feed'
  | 'create'
  | 'profile'
  | 'revoir'
  | 'manage'
  | 'activities'
  | 'notifications'
  | 'edit'
  | 'player'
  | 'messages'
  | 'settings'
  | 'moderation'
export type Go = (s: ScreenName, id?: string) => void

// DEV-only design QA: open ?preview=feed|create|profile|revoir to render a
// screen with the seeded demo profile, bypassing the magic-link step.
function usePreviewProfile(): {
  active: boolean
  start: ScreenName
  profile: ProfileT | null
  setProfile: (p: ProfileT | null) => void
} {
  const params = new URLSearchParams(window.location.search)
  const start = (import.meta.env.DEV ? params.get('preview') : null) as ScreenName | null
  const [profile, setProfile] = useState<ProfileT | null>(null)
  useEffect(() => {
    if (!start) return
    supabase
      .from('profiles')
      // Explicit public columns (home_lat/home_lng/auth_id SELECT is revoked on
      // profiles for client roles, so `select('*')` would error). DEV preview only.
      .select(
        'id, first_name, last_initial, city, avatar_color, avatar_url, verified, open_to_meet, perfect_match, matches_played, attendance_pct, late_cancels, is_public, hidden_from_search, is_moderator, onboarded, created_at',
      )
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .single()
      .then(({ data }) => setProfile((data as unknown as ProfileT) ?? null))
  }, [start])
  return { active: !!start, start: start ?? 'feed', profile, setProfile }
}

export default function App() {
  const route = useRoute()
  const { session, profile: realProfile, loading, refreshProfile, setProfile: setRealProfile } = useSession()
  const preview = usePreviewProfile()
  const profile = preview.active ? preview.profile : realProfile
  // In preview mode, route updates to the preview profile so optimistic UI
  // (toggles, prefs) actually re-renders; otherwise drive the real session.
  const setProfile = preview.active ? preview.setProfile : setRealProfile
  const [screen, setScreen] = useState<ScreenName>(preview.active ? preview.start : 'feed')
  const [manageId, setManageId] = useState<string | null>(null)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const { unread, refresh: refreshUnread } = useUnread(profile?.id ?? null)
  const { unread: msgUnread, refresh: refreshMsgUnread } = useUnreadMessages(profile?.id ?? null)

  // The id argument is generic across screens (manage activity, message thread…);
  // reset it on every navigation so a stale id never leaks into the next screen.
  const go: Go = (s, id) => {
    setManageId(id ?? null)
    setScreen(s)
  }

  // Deep links resolved once the profile is ready:
  //  - /?manage=<id>  → organizer view (from the public page "Gérer")
  //  - /?profile=<id> → a shared player profile (from Profile "Partager")
  useEffect(() => {
    if (!profile) return
    const params = new URLSearchParams(window.location.search)
    const mid = params.get('manage')
    if (mid) {
      setManageId(mid)
      setScreen('manage')
      window.history.replaceState({}, '', '/')
      return
    }
    const pid = params.get('profile')
    if (pid) {
      setManageId(pid)
      setScreen('player')
      window.history.replaceState({}, '', '/')
    }
  }, [profile])

  // Public, shareable activity page — renders without an account.
  if (route.name === 'public') {
    return <PublicActivity id={route.id} session={session} profile={realProfile} sessionLoading={loading} />
  }

  // Static legal pages (/cgu, /confidentialite) — no account required.
  if (route.name === 'legal') {
    return <Legal doc={route.doc} />
  }

  if (loading && !preview.active) return <Splash />
  if (!preview.active && (!session || !profile))
    return (
      <>
        <Login />
        {import.meta.env.DEV && <DevSwitcher />}
      </>
    )
  if (!profile) return <Splash />

  // Short onboarding gate for new accounts (preview it via ?preview=onboarding).
  const previewOnboarding =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'onboarding'
  if (!onboardingDone && ((!preview.active && !profile.onboarded) || previewOnboarding)) {
    return (
      <>
        <Onboarding
          profile={profile}
          setProfile={setProfile}
          onDone={() => {
            setOnboardingDone(true)
            setScreen('feed')
          }}
        />
        {import.meta.env.DEV && <DevSwitcher profileName={profile.first_name} />}
      </>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.paper, color: C.ink }}>
      <TopNav
        screen={screen}
        go={go}
        profile={profile}
        setProfile={setProfile}
        unread={unread}
        msgUnread={msgUnread}
      />
      <main className="tu-main">
        {screen === 'feed' && <Feed profile={profile} go={go} />}
        {screen === 'create' && <Create profile={profile} go={go} />}
        {screen === 'profile' && (
          <Profile profile={profile} setProfile={setProfile} refreshProfile={refreshProfile} go={go} />
        )}
        {screen === 'revoir' && <Revoir profile={profile} go={go} />}
        {screen === 'edit' && <EditProfile profile={profile} setProfile={setProfile} go={go} />}
        {screen === 'player' && manageId && <PlayerProfile profileId={manageId} go={go} />}
        {screen === 'manage' && manageId && <Manage id={manageId} profile={profile} go={go} />}
        {screen === 'activities' && <MyActivities profile={profile} go={go} />}
        {screen === 'notifications' && (
          <Notifications profile={profile} setProfile={setProfile} go={go} onChange={refreshUnread} />
        )}
        {screen === 'messages' && (
          <Messages profile={profile} initialThreadId={manageId} onChange={refreshMsgUnread} go={go} />
        )}
        {screen === 'settings' && <Settings profile={profile} setProfile={setProfile} go={go} />}
        {screen === 'moderation' && <Moderation profile={profile} go={go} />}
      </main>
      {import.meta.env.DEV && <DevSwitcher profileName={profile.first_name} />}
    </div>
  )
}

function Splash() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.paper,
      }}
    >
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
