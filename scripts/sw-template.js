/* This file is a template. scripts/build-sw.mjs injects the precache list
   and a content-based cache version during the Vite build. */

const VERSION = '__SW_VERSION__'
const PRECACHE = __SW_PRECACHE__

const CACHE_NAME = `lights-out-${VERSION}`
const CACHE_PREFIX = 'lights-out-'
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = Array.from(new Set([...PRECACHE, OFFLINE_URL]))

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(PRECACHE_URLS)

      // First installs can activate immediately. Updates wait for the
      // registration UI so an in-progress game is not interrupted.
      if (!self.registration.active) {
        await self.skipWaiting()
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Auth and server functions need a live connection. The leaderboard is
  // fetched through the app's server functions, so it stays uncached too.
  if (
    url.pathname.startsWith('/__clerk') ||
    url.pathname.startsWith('/_serverFn') ||
    url.pathname.startsWith('/api')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          return (await caches.match(OFFLINE_URL)) || Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached

      try {
        const response = await fetch(request)
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, response.clone())
        }
        return response
      } catch {
        return Response.error()
      }
    })(),
  )
})
