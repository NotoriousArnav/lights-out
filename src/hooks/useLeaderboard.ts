import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'

import type { Size } from '../game/types'
import { fetchLeaderboard } from '../server/game-fns'
import type { LeaderboardEntry } from '../server/db/scores'

export interface LeaderboardState {
  rows: LeaderboardEntry[]
  total: number
  loading: boolean
  loadingMore: boolean
  error: boolean
  loadMore: () => void
  refresh: () => void
}

export function useLeaderboard(size: Size, refreshKey: number): LeaderboardState {
  const fetchFn = useServerFn(fetchLeaderboard)
  const [rows, setRows] = useState<LeaderboardEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  const request = useRef(0)
  const sizeRef = useRef(size)
  sizeRef.current = size

  const loadFirst = useCallback(async () => {
    const requestId = ++request.current
    setLoading(true)
    setError(false)

    try {
      const result = await fetchFn({ data: { size, page: 0 } })
      if (requestId !== request.current) return
      if (!result.ok) {
        setRows([])
        setTotal(0)
        setError(true)
        return
      }
      setRows(result.rows)
      setTotal(result.total)
      setPage(0)
    } catch {
      if (requestId !== request.current) return
      setRows([])
      setTotal(0)
      setError(true)
    } finally {
      if (requestId === request.current) setLoading(false)
    }
  }, [fetchFn, size])

  useEffect(() => {
    void loadFirst()
  }, [loadFirst, refreshKey])

  // Returning to the tab is a natural moment to pick up new scores.
  useEffect(() => {
    const onFocus = () => {
      void loadFirst()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadFirst])

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return
    const targetSize = size
    const requestId = ++request.current
    setLoadingMore(true)

    void fetchFn({ data: { size: targetSize, page: page + 1 } })
      .then((result) => {
        if (requestId !== request.current || sizeRef.current !== targetSize) return
        if (!result.ok) return
        setRows((current) => [...current, ...result.rows])
        setTotal(result.total)
        setPage((current) => current + 1)
      })
      .catch(() => {
        // Keep the rows already on screen.
      })
      .finally(() => {
        if (requestId === request.current) setLoadingMore(false)
      })
  }, [fetchFn, loading, loadingMore, page, size])

  return { rows, total, loading, loadingMore, error, loadMore, refresh: loadFirst }
}
