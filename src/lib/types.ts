export type Sport = {
  key: string
  label: string
  code: string
  color: string
  tint: string
  sort_order: number
}

export type NotifType = 'request' | 'accepted' | 'freed' | 'reminder' | 'mutual' | 'invite'

export type NotifPrefs = Record<NotifType, boolean>

export type Profile = {
  id: string
  auth_id: string | null
  first_name: string
  last_initial: string
  city: string
  home_lat: number | null
  home_lng: number | null
  avatar_color: string
  verified: boolean
  open_to_meet: boolean
  perfect_match: string | null
  matches_played: number
  attendance_pct: number
  late_cancels: number
  notif_prefs: NotifPrefs
  onboarded: boolean
  is_public: boolean
  hidden_from_search: boolean
  is_moderator: boolean
  cgu_accepted_at: string | null
}

export type Notification = {
  id: string
  recipient_id: string
  actor_id: string | null
  activity_id: string | null
  type: NotifType
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

export type Attendance = 'present' | 'absent' | 'late'

export type Participant = {
  id?: string
  profile_id: string
  status: 'confirmed' | 'pending' | 'waitlist'
  checked_in: boolean | null
  attendance: Attendance | null
  profile: Pick<
    Profile,
    'id' | 'first_name' | 'last_initial' | 'avatar_color' | 'verified' | 'attendance_pct' | 'matches_played' | 'late_cancels'
  >
}

export type Activity = {
  id: string
  organizer_id: string
  sport_key: string
  ask: string
  venue_name: string
  venue_code: string
  // Excluded from broad selects (column SELECT revoked); fetched via the
  // activity_exact_address RPC only once the viewer is accepted.
  exact_address?: string | null
  starts_at: string
  ends_at: string | null
  level: string
  mode: 'direct' | 'approve' | 'wait'
  poste: string | null
  total_slots: number
  lat: number | null
  lng: number | null
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

// ── Bloc 4 — messagerie, sécurité & modération ──────────────────────
export type ConversationKind = 'activity' | 'direct'

export type Message = {
  id: string
  conversation_id: string
  sender_id: string | null
  body: string
  created_at: string
}

// A conversation row as assembled client-side for the messaging list.
export type ConversationSummary = {
  id: string
  kind: ConversationKind
  activity_id: string | null
  title: string
  subtitle: string
  avatarColor: string
  avatarLetter: string
  lastBody: string | null
  lastAt: string | null
  unread: number
  // members other than me (for the thread header + report/block targets)
  others: Pick<Profile, 'id' | 'first_name' | 'last_initial' | 'avatar_color' | 'verified'>[]
}

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

export type Report = {
  id: string
  reporter_id: string | null
  reported_profile_id: string | null
  activity_id: string | null
  conversation_id: string | null
  message_id: string | null
  reason: string
  details: string | null
  status: ReportStatus
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}
