import { useCallback, useEffect, useRef, useState } from 'react'

// Tiny stale-while-revalidate cache. Opening a page again shows the last data immediately and
// only refetches quietly in the background (and only when it is older than STALE_MS).
const STALE_MS = 30_000
const store = new Map() // key -> { data, at }
const inflight = new Map() // key -> Promise (shared by components asking for the same key)

/** Drop everything cached. Call after any create/update/delete: one write can change many lists. */
export const invalidateAll = () => {
  store.clear()
  inflight.clear()
}

function fetchInto(key, fetcher) {
  if (inflight.has(key)) return inflight.get(key)
  const p = fetcher()
    .then((data) => {
      // a write that happened while this was in flight cleared `inflight`; don't cache stale data
      if (inflight.get(key) === p) store.set(key, { data, at: Date.now() })
      return data
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key)
    })
  inflight.set(key, p)
  return p
}

/**
 * useQuery(key, fetcher, { enabled })
 * -> { data, loading, refreshing, error, reload }
 * `loading` is true only when there is nothing to show yet; `refreshing` is a background refetch.
 */
export function useQuery(key, fetcher, { enabled = true } = {}) {
  const cached = key ? store.get(key) : undefined
  const [state, setState] = useState({ key, data: cached?.data, error: '', fetching: false })
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const run = useCallback(
    (force) => {
      if (!key || !enabled) return
      const hit = store.get(key)
      if (hit && !force && Date.now() - hit.at < STALE_MS) {
        setState({ key, data: hit.data, error: '', fetching: false })
        return
      }
      setState((s) => ({ key, data: hit ? hit.data : s.key === key ? s.data : undefined, error: '', fetching: true }))
      fetchInto(key, () => fetcherRef.current()).then(
        (data) => setState((s) => (s.key === key ? { key, data, error: '', fetching: false } : s)),
        (e) =>
          setState((s) =>
            s.key === key
              ? { ...s, error: hit || s.data !== undefined ? '' : e.friendly || 'Could not load data.', fetching: false }
              : s,
          ),
      )
    },
    [key, enabled],
  )

  useEffect(() => {
    run(false)
  }, [run])

  // While the key just changed, `state` still belongs to the old key for one render.
  const current = state.key === key ? state : { data: store.get(key)?.data, error: '', fetching: Boolean(key && enabled) }
  const data = current.data
  return {
    data,
    loading: enabled && data === undefined && !current.error,
    refreshing: current.fetching && data !== undefined,
    error: current.error,
    reload: () => run(true),
  }
}
