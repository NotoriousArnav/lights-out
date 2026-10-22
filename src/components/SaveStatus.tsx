import type { SaveState } from '../hooks/useGame'
import { Spinner } from './Spinner'

interface SaveStatusProps {
  save: SaveState
  signedIn: boolean
}

export function SaveStatus({ save, signedIn }: SaveStatusProps) {
  if (save.status === 'idle') return null

  if (save.status === 'guest') {
    if (signedIn) return null
    return (
      <p className="save-status" role="status">
        <a href="/sign-in">Sign in</a> to post this score.
      </p>
    )
  }

  if (save.status === 'saving') {
    return (
      <p className="save-status save-status--saving" role="status">
        <Spinner size="sm" />
        <span>Saving score…</span>
      </p>
    )
  }

  if (save.status === 'saved') {
    return (
      <p className="save-status save-status--ok" role="status">
        {save.place != null ? `Rank #${save.place} of ${save.total}` : 'Score saved'}
        {' · '}
        {save.score.toLocaleString('en-US')} pts
      </p>
    )
  }

  const message =
    save.reason === 'unauthenticated'
      ? 'Your session expired. Sign in again to save this run.'
      : save.reason === 'expired'
        ? 'This run expired before it could be saved.'
        : save.reason === 'duplicate'
          ? 'This run was already saved.'
          : save.reason === 'invalid'
            ? 'The server could not verify this run.'
            : 'Scores are unavailable right now.'

  return (
    <p className="save-status save-status--error" role="status">
      {message}
    </p>
  )
}
