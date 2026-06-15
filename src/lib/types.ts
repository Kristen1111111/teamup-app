export type Sport = {
  key: string
  label: string
  code: string
  color: string
  tint: string
  sort_order: number
}

export type Profile = {
  id: string
  auth_id: string | null
  first_name: string
  last_initial: string
  city: string
  avatar_color: string
  verified: boolean
  open_to_meet: boolean
  perfect_match: string | null
  matches_played: number
  attendance_pct: number
  late_cancels: number
}

export type Participant = {
  profile_id: string
  status: 'confirmed' | 'pending' | 'waitlist'
  checked_in: boolean | null
  profile: Pick<Profile, 'id' | 'first_name' | 'last_initial' | 'avatar_color'>
}

export type Activity = {
  id: string
  organizer_id: string
  sport_key: string
  ask: string
  venue_name: string
  venue_code: string
  exact_address: string | null
  starts_at: string
  ends_at: string | null
  level: string
  mode: 'direct' | 'approve' | 'wait'
  poste: string | null
  total_slots: number
  organizer: Profile
  sport: Sport
  participants: Participant[]
}

export type MeetIntent = {
  id: string
  activity_id: string | null
  from_profile: string
  to_profile: string
  kind: 'rejouer' | 'ami' | 'plus'
}
