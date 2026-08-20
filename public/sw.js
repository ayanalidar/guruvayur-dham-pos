// Service Worker for Hotel Guruvayur Dham POS
// - App shell caching (cache-first)
// - API requests (network-first, no cache for stale data)
// - Navigation (network-first with offline fallback)
// - Automatic cache cleanup on new version

const SW_VERSION = 'v1.0.0'
const STATIC_CACHE = `gvd-pos-static-${SW_VERSION}`
const RUNTIME_CACHE = `gvd-pos-runtime-${SW_VERSION}`
const OFFLINE_URL = '/offline.html'

// Assets to pre-cache on install (app shell)
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/gvd-logo.webp',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
]

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Use addAll but ignore failures for individual items (e.g. if start_url is dynamic)
      await Promise.allSettled(APP_SHELL.map(url => cache.add(url)))
      console.log('[SW] App shell cached')
    })
  )
  self.skipWaiting() // activate immediately on next load
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim() // take over immediately
})

// Fetch: route by request type
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET (we don't cache POST/PUT/PATCH/DELETE)
  if (request.method !== 'GET') return

  // Skip cross-origin (Vercel analytics, etc.)
  if (url.origin !== self.location.origin) return

  // Skip Next.js HMR in dev
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match(OFFLINE_URL)
        })
    )
    return
  }

  // API requests: network-first (data may change, don't serve stale)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful JSON responses
          if (response.ok) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request).then(c => c || new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })))
    )
    return
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        // Only cache successful, same-origin responses
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy))
        }
        return response
      }).catch(() => cached)
    })
  )
})

// Listen for messages from the page (e.g. SKIP_WAITING trigger)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
