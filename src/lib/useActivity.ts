import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ACTIVITY_SELECT } from './queries'
import type { Activity } from './types'

// Loads one activity by id and keeps its participant list live via Supabase
// Realtime — powering the real-time slot counter on the public & manage views.
export function useActivity(id: string | null) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const reload = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('activities').select(ACTIVITY_SELECT).eq('id', id).maybeSingle()
    if (!data) setNotFound(true)
    // Embeds infer as any[] (no generated Database types) — cast through unknown.
    setActivity((data as unknown as Activity) ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    reload()

    const channel = supabase
      .channel(`activity:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_participants', filter: `activity_id=eq.${id}` },
        () => reload(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, reload])

  return { activity, loading, notFound, reload, setActivity }
}
