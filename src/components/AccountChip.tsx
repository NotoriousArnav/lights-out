import { Show, UserButton } from '@clerk/tanstack-react-start'

import { clerkEnabled } from '../lib/clerk'

/**
 * Small fixed corner control. Signed-out guests still get the full game;
 * signing in is only required for account features (and later, the
 * leaderboard).
 */
export function AccountChip() {
  if (!clerkEnabled) return null

  return (
    <div className="account">
      <Show when="signed-out">
        <a className="account__signin" href="/sign-in">
          Sign in
        </a>
      </Show>

      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: '30px', height: '30px' },
            },
          }}
        />
      </Show>
    </div>
  )
}
