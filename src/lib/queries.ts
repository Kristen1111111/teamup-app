// Shared PostgREST select for activities.
// NOTE: exact_address is intentionally excluded — column SELECT is revoked from
// anon/authenticated, so `select=*` would error. The address is fetched only via
// the guarded `activity_exact_address` RPC once a player is accepted.
//
// Kept as a single non-interpolated string literal on purpose: supabase-js infers
// the row type from the literal, so embedded relations (organizer, sport) type as
// objects. Interpolating other consts would widen this to `string` and break that.
export const ACTIVITY_SELECT = `
  id, organizer_id, sport_key, ask, venue_name, venue_code, starts_at, ends_at, level, mode, poste, total_slots, lat, lng, created_at,
  organizer:profiles!activities_organizer_id_fkey(*),
  sport:sports(*),
  participants:activity_participants(
    id, profile_id, status, checked_in, attendance,
    profile:profiles(id, first_name, last_initial, avatar_color, verified, attendance_pct, matches_played, late_cancels)
  )
`
