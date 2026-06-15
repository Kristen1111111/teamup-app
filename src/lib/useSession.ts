import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(authId: string) {
    // Bootstrap demo content on first login, then read the profile back.
    await supabase.rpc('bootstrap_demo')
    // Bloc 2: seed "Mes activités" demo data + (re)generate due reminders.
    await supabase.rpc('bootstrap_bloc2')
    await supabase.rpc('generate_reminders')
    // Bloc 4: seed messagerie + file de modération (idempotent).
    await supabase.rpc('bootstrap_bloc4')
    const { data } = await supabase.from('profiles').select('*').eq('auth_id', authId).single()
    setProfile((data as Profile) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) await loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, profile, loading, setProfile, refreshProfile: () => session && loadProfile(session.user.id) }
}
