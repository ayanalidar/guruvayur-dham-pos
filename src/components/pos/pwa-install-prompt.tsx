'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Don't show if already installed as PWA, or if user dismissed it before
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true'
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    if (dismissed || standalone) return

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault() // Prevent the default browser prompt
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show our custom prompt after a short delay
      setTimeout(() => setShow(true), 2500)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      console.log('[PWA] User accepted install')
    }
    setDeferredPrompt(null)
    setShow(false)
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, 'true')
    setShow(false)
  }

  if (!show || !deferredPrompt) return null

  return (
    <div
      className="no-print fixed bottom-4 right-4 z-50 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="rounded-lg border bg-card shadow-xl p-4">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Install GVD POS App</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add to your home screen for fast, full-screen access — works offline too.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={install} className="h-7 text-xs">Install</Button>
              <Button size="sm" variant="ghost" onClick={dismiss} className="h-7 text-xs">Not now</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
