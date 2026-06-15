import { useEffect, useState } from 'react'

export type Route = { name: 'public'; id: string } | { name: 'app' }

const UUID = /^\/a\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/

function parse(path: string): Route {
  const m = path.match(UUID)
  return m ? { name: 'public', id: m[1] } : { name: 'app' }
}

// Minimal path router — no dependency, matches the codebase's lightweight style.
export function useRoute(): Route {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return parse(path)
}

export function navigate(to: string) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
