import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_INTERVAL_MS = 5000

// `resetKey` restarts polling when the inputs of `fetcher` change.
export function usePolling(fetcher, { intervalMs = DEFAULT_INTERVAL_MS, resetKey = '' } = {}) {
  const [state, setState] = useState({ data: null, error: null, updatedAt: null })
  const [reloadCount, setReloadCount] = useState(0)
  const fetcherRef = useRef(fetcher)

  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    let isCancelled = false
    let timerId

    async function poll() {
      if (!document.hidden) {
        try {
          const data = await fetcherRef.current()
          if (!isCancelled) setState({ data, error: null, updatedAt: new Date() })
        } catch (error) {
          if (!isCancelled) setState((previous) => ({ ...previous, error }))
        }
      }
      if (!isCancelled) timerId = setTimeout(poll, intervalMs)
    }

    poll()

    return () => {
      isCancelled = true
      clearTimeout(timerId)
    }
  }, [intervalMs, resetKey, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return {
    ...state,
    isLoading: state.data === null && state.error === null,
    reload,
  }
}
