import { useEffect, useState } from 'react'

export type Route =
  | { name: 'public'; id: string }
  | { name: 'legal'; doc: 'cgu' | 'confidentialite' }
  | { name: 'app' }

const UUID = /^\/a\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/

function parse(path: string): Route {
  const m = path.match(UUID)
  if (m) return { name: 'public', id: m[1] }
  if (path === '/cgu') return { name: 'legal', doc: 'cgu' }
  if (path === '/confidentialite') return { name: 'legal', doc: 'confidentialite' }
  return { name: 'app' }
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
