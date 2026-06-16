import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile() {
    // Demo seeding is OFF in production: a real signup must start with an empty
    // account. It is opt-in via VITE_DEMO_SEED=true (see .env.example) so the
    // demo profile (réputation, activités, messages, file de modération fictifs)
    // can still be filled on a dedicated demo deployment.
    if (import.meta.env.VITE_DEMO_SEED === 'true') {
      await supabase.rpc('bootstrap_demo')
      await supabase.rpc('bootstrap_bloc2')
      await supabase.rpc('generate_reminders')
      await supabase.rpc('bootstrap_bloc4')
    }
    // Own profile is read via a SECURITY DEFINER RPC: the home coordinates and
    // auth_id columns are SELECT-revoked on `profiles` for client roles (they must
    // not be readable on other users), so a `select('*')` would error. The RPC
    // returns the full own row (auth.uid()-scoped) including those private fields.
    const { data, error } = await supabase.rpc('my_profile_full')
    if (error) {
      console.error('loadProfile', error.message)
      return
    }
    setProfile((data as Profile) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile()
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) await loadProfile()
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, profile, loading, setProfile, refreshProfile: () => (session ? loadProfile() : undefined) }
}
