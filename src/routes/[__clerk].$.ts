import { clerkFrontendApiProxy } from '@clerk/backend/proxy'
import { createFileRoute } from '@tanstack/react-router'

const proxy = (request: Request) =>
  clerkFrontendApiProxy(request, {
    proxyPath: '/__clerk',
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })

/**
 * Clerk's production Frontend API proxy. On `*.vercel.app` the SDKs
 * automatically route Clerk requests through this same-origin path, so the
 * Vercel deployment does not need a custom domain or DNS records.
 */
export const Route = createFileRoute('/__clerk/$')({
  server: {
    handlers: {
      GET: ({ request }) => proxy(request),
      POST: ({ request }) => proxy(request),
      PUT: ({ request }) => proxy(request),
      PATCH: ({ request }) => proxy(request),
      DELETE: ({ request }) => proxy(request),
      OPTIONS: ({ request }) => proxy(request),
      HEAD: ({ request }) => proxy(request),
    },
  },
})
