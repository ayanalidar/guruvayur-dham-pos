'use client'

import { useEffect } from 'react'

// Register the service worker on the client.
// Skips registration in dev to avoid caching dev server assets.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => console.log('[SW] registered', reg.scope))
        .catch(err => console.warn('[SW] registration failed', err))
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register)
  }, [])

  return null
}
