import { auth, clerkClient } from '@clerk/tanstack-react-start/server'

import type { PlayerProfile } from './db/scores'

/** Null when Clerk is not configured or the request has no session. */
export async function currentUserId(): Promise<string | null> {
  try {
    const session = await auth()
    return session.userId ?? null
  } catch {
    return null
  }
}

/** Display fields for the leaderboard. Never falls back to an email address. */
export async function clerkProfile(userId: string): Promise<PlayerProfile> {
  try {
    const user = await clerkClient().users.getUser(userId)
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
    return {
      id: userId,
      username: user.username ?? null,
      displayName: user.username || fullName || 'Player',
      imageUrl: user.imageUrl ?? null,
    }
  } catch {
    return {
      id: userId,
      username: null,
      displayName: 'Player',
      imageUrl: null,
    }
  }
}
