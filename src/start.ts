import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

// Clerk's middleware throws when no secret key is configured. Keeping the app
// usable without one means a fresh clone still runs as a guest-only game.
const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY)

export const startInstance = createStart(() => {
  return {
    requestMiddleware: clerkConfigured
      ? [csrfMiddleware, clerkMiddleware()]
      : [csrfMiddleware],
  }
})
