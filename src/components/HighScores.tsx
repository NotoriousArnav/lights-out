import { useId } from 'react'

import type { Size } from '../game/types'
import { SIZES } from '../game/types'
import type { LeaderboardEntry } from '../server/db/scores'

interface HighScoresProps {
  size: Size
  onSize: (size: Size) => void
  rows: LeaderboardEntry[]
  total: number
  loading: boolean
  loadingMore: boolean
  error: boolean
  signedIn: boolean
  currentUserId?: string
  onLoadMore: () => void
  onRefresh: () => void
}

function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function formatScore(score: number): string {
  return score.toLocaleString('en-US')
}

export function HighScores({
  size,
  onSize,
  rows,
  total,
  loading,
  loadingMore,
  error,
  signedIn,
  currentUserId,
  onLoadMore,
  onRefresh,
}: HighScoresProps) {
  const titleId = useId()

  return (
    <section className="scores" aria-labelledby={titleId}>
      <header className="scores__head">
        <div>
          <h2 id={titleId}>High Scores</h2>
          <p>Fewest moves, fewest hints, fastest time.</p>
        </div>
        <button
          type="button"
          className="scores__refresh"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh high scores"
        >
          Refresh
        </button>
      </header>

      <div className="scores__tabs" role="tablist" aria-label="Board size">
        {SIZES.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={option === size}
            className={option === size ? 'active' : ''}
            onClick={() => onSize(option)}
          >
            {option}×{option}
          </button>
        ))}
      </div>

      <div className="scores__list-wrap">
        {loading ? (
          <div className="scores__skeleton" aria-label="Loading scores">
            {[0, 1, 2, 3].map((row) => (
              <span key={row} />
            ))}
          </div>
        ) : error ? (
          <p className="scores__empty">Scores are unavailable right now.</p>
        ) : rows.length === 0 ? (
          <p className="scores__empty">
            No scores yet. Be the first to finish a {size}×{size} puzzle.
          </p>
        ) : (
          <ol className="scores__list">
            {rows.map((row) => (
              <li
                key={row.userId}
                className={[
                  'score-row',
                  row.userId === currentUserId ? 'score-row--me' : '',
                  row.place <= 3 ? 'score-row--top' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="score-row__place">{row.place}</span>
                <span className="score-row__who">
                  <span className="score-row__name">{row.displayName}</span>
                  <span className="score-row__meta">
                    {row.moves} moves · {row.hints} hints · {formatTime(row.elapsedMs)}
                  </span>
                </span>
                <span className="score-row__score">{formatScore(row.score)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {!loading && !error && rows.length > 0 && (
        <footer className="scores__foot">
          <span>
            {rows.length} of {total} players
          </span>
          {rows.length < total && (
            <button type="button" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </footer>
      )}

      {!signedIn && (
        <p className="scores__cta">
          <a href="/sign-in">Sign in</a> to post your score.
        </p>
      )}
    </section>
  )
}
