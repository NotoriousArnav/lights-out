import { useOnlineStatus } from '../hooks/useOnlineStatus'

/**
 * Small connection notice for the game page. It only explains why server
 * features are unavailable; gameplay state stays untouched.
 */
export function OfflineNotice() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <p className="offline-notice" role="status">
      You&apos;re offline. Reconnect to use hints and scores.
    </p>
  )
}
