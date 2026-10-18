import { useEffect, useState } from 'react'

const DEFAULT_PAGE = 'overview'

function parseHash() {
  const [page, param] = window.location.hash.replace(/^#\/?/, '').split('/')
  return { page: page || DEFAULT_PAGE, param: param || null }
}

export function navigate(path) {
  window.location.hash = `/${path}`
}

export function useHashRoute() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return route
}
