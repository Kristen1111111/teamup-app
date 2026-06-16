import { useState } from 'react'
import { C } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { Pin, Chevron, Plus, Check, Bell, Message } from './icons'
import type { ScreenName } from '../App'
import type { Profile } from '../lib/types'
import { CITIES } from '../lib/cities'

const LINKS: { k: ScreenName; l: string }[] = [
  { k: 'feed', l: 'Activités' },
  { k: 'activities', l: 'Mes activités' },
  { k: 'revoir', l: 'Se revoir' },
  { k: 'profile', l: 'Profil' },
]

export default function TopNav({
  screen,
  go,
  profile,
  setProfile,
  unread = 0,
  msgUnread = 0,
}: {
  screen: ScreenName
  go: (s: ScreenName) => void
  profile: Profile
  setProfile: (p: Profile) => void
  unread?: number
  msgUnread?: number
}) {
  const [cityOpen, setCityOpen] = useState(false)
  const [typed, setTyped] = useState('')

  // de-duplicated list that always contains the current city
  const cities = Array.from(new Set([profile.city, ...CITIES]))

  async function pickCity(city: string) {
    const next = city.trim()
    setCityOpen(false)
    setTyped('')
    if (!next || next === profile.city) return
    setProfile({ ...profile, city: next }) // optimistic
    await supabase.from('profiles').update({ city: next }).eq('id', profile.id)
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 26,
        }}
      >
        <button onClick={() => go('feed')} style={logoBtn}>
          Team<span style={{ color: C.prune }}>Up</span>
        </button>

        <nav className="tu-nav-links" style={{ display: 'flex', gap: 4, flex: 1 }}>
          {LINKS.map((d) => {
            const on = screen === d.k || (screen === 'create' && d.k === 'feed')
            return (
              <button
                key={d.k}
                onClick={() => go(d.k)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: on ? C.pruneSoft : 'transparent',
                  color: on ? C.prune : C.muted,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                {d.l}
              </button>
            )
          })}
        </nav>

        {/* messages (F9) — with unread badge */}
        <button
          onClick={() => go('messages')}
          title="Messagerie"
          style={{
            position: 'relative',
            flex: 'none',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: screen === 'messages' ? C.pruneSoft : C.card,
            border: `1px solid ${screen === 'messages' ? C.prune : C.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: screen === 'messages' ? C.prune : C.ink,
          }}
        >
          <Message size={19} stroke={screen === 'messages' ? C.prune : C.ink} />
          {msgUnread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 999,
                background: C.prune,
                color: '#fff',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff',
              }}
            >
              {msgUnread > 9 ? '9+' : msgUnread}
            </span>
          )}
        </button>

        {/* notification bell (F6) — always visible, with unread badge */}
        <button
          onClick={() => go('notifications')}
          title="Notifications"
          style={{
            position: 'relative',
            flex: 'none',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: screen === 'notifications' ? C.pruneSoft : C.card,
            border: `1px solid ${screen === 'notifications' ? C.prune : C.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: screen === 'notifications' ? C.prune : C.ink,
          }}
        >
          <Bell size={19} stroke={screen === 'notifications' ? C.prune : C.ink} />
          {unread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 999,
                background: C.prune,
                color: '#fff',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff',
              }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* city selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setCityOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: cityOpen ? C.pruneSoft : C.card,
              border: `1px solid ${cityOpen ? C.prune : C.line}`,
              borderRadius: 999,
              padding: '7px 12px',
              fontSize: 13,
              fontWeight: 600,
              color: C.ink,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            <Pin size={14} stroke={C.prune} sw={1.9} />
            {profile.city}
            <Chevron size={11} />
          </button>

          {cityOpen && (
            <>
              <div onClick={() => setCityOpen(false)} style={backdrop} />
              <div style={popover}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10,
                    letterSpacing: '1px',
                    color: C.muted,
                    fontWeight: 600,
                    padding: '4px 10px 8px',
                  }}
                >
                  CHANGER DE VILLE
                </div>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') pickCity(typed)
                  }}
                  placeholder="Autre ville… (Entrée)"
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    margin: '0 0 6px',
                    borderRadius: 9,
                    border: `1px solid ${C.line}`,
                    background: C.paper,
                    fontSize: 13.5,
                    color: C.ink,
                    outline: 'none',
                  }}
                />
                {cities.map((c) => {
                  const on = c === profile.city
                  return (
                    <button key={c} onClick={() => pickCity(c)} style={menuItem(on)}>
                      <span>{c}</span>
                      {on && <Check size={12} stroke={C.prune} sw={3} />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => go('create')}
          className="tu-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: C.prune,
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '9px 15px 9px 13px',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 18px -8px rgba(92,32,73,.6)',
          }}
        >
          <Plus size={16} stroke="#fff" sw={2.4} />
          Créer
        </button>

        <button
          onClick={() => go('profile')}
          title="Mon profil"
          style={{
            flex: 'none',
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(150deg,#5C2049,#8A3A6F)',
            color: '#fff',
            border: screen === 'profile' ? `2px solid ${C.prune}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {profile.first_name[0]}
        </button>
      </div>
    </header>
  )
}

const logoBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 21,
  fontWeight: 700,
  letterSpacing: '-.02em',
  color: C.ink,
  padding: 0,
}

const backdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 40,
}

const popover: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 60,
  minWidth: 200,
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  padding: 6,
  boxShadow: '0 18px 40px -16px rgba(40,28,34,.4)',
}

function menuItem(on: boolean): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '9px 10px',
    borderRadius: 9,
    border: 'none',
    background: on ? C.pruneSoft : 'transparent',
    color: on ? C.prune : C.ink,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  }
}
