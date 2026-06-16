import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(url, key, {
  auth: {
    // On NE retient PAS la session (ni en dev, ni en prod) : à chaque
    // ouverture/rechargement on repart de l'écran de connexion, comme un vrai
    // utilisateur. Pratique pour tester l'inscription et jongler entre plusieurs
    // comptes, y compris sur le site déployé.
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Dev only: expose the client so the local preview harness can drive auth.
if (import.meta.env.DEV) {
  ;(window as unknown as { supabase: typeof supabase }).supabase = supabase
}
