'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Delete, LogIn, Shield, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/format'
import { GuardianXBrand } from './guardianx-brand'

type Config = { name: string; posPin: string }

export function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast()
  const [pin, setPin] = useState('')
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiFetch<{ config: Config }>('/api/config')
      .then(d => setConfig({ name: d.config.name, posPin: d.config.posPin }))
      .catch(() => setConfig({ name: 'Hotel Guruvayur Dham', posPin: '1234' }))
      .finally(() => setLoading(false))
  }, [])

  function press(d: string) {
    if (pin.length >= 6) return
    const next = pin + d
    setPin(next)
    // Auto-submit when reaching 4 digits (default PIN length)
    if (next.length === 4 && config?.posPin.length === 4) {
      submitPin(next)
    }
  }

  function backspace() {
    setPin(p => p.slice(0, -1))
  }

  async function submitPin(value?: string) {
    const v = value ?? pin
    if (!config) return
    setSubmitting(true)
    // Small delay to avoid timing attacks / give visual feedback
    await new Promise(r => setTimeout(r, 250))
    if (v === config.posPin) {
      sessionStorage.setItem('posAuth', 'true')
      sessionStorage.setItem('posAuthAt', String(Date.now()))
      toast({ title: `Welcome to ${config.name}` })
      onSuccess()
    } else {
      toast({ title: 'Incorrect PIN', description: 'Please try again', variant: 'destructive' })
      setPin('')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4">
      <div className="w-full max-w-sm">
        {/* Hotel header */}
        <div className="text-center mb-6">
          <img
            src="/gvd-logo.webp"
            alt="Hotel Guruvayur Dham"
            className="h-24 w-32 object-contain mx-auto mb-3"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
          />
          <h1
            className="text-2xl font-bold leading-tight"
            style={{ color: '#B22222', fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {config?.name?.toUpperCase() || 'HOTEL GURUVAYUR DHAM'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Point of Sale</p>
        </div>

        <Card className="shadow-xl border-border/60">
          <CardContent className="p-6">
            <div className="text-center mb-5">
              <p className="text-sm font-medium mb-1">Enter PIN to continue</p>
              <p className="text-xs text-muted-foreground">Default PIN: <span className="font-mono font-semibold">1234</span></p>
            </div>

            {/* PIN dots */}
            <div className="flex justify-center gap-3 mb-6">
              {Array.from({ length: Math.max(4, config?.posPin?.length || 4) }).map((_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full border-2 transition-all ${
                    i < pin.length
                      ? 'bg-primary border-primary scale-110'
                      : 'bg-transparent border-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                <Button
                  key={d}
                  variant="outline"
                  size="lg"
                  className="h-14 text-xl font-semibold hover:bg-primary hover:text-primary-foreground"
                  disabled={submitting || pin.length >= 6}
                  onClick={() => press(d)}
                >
                  {d}
                </Button>
              ))}
              <Button variant="ghost" size="lg" className="h-14" disabled={submitting || !pin} onClick={backspace}>
                <Delete className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-xl font-semibold hover:bg-primary hover:text-primary-foreground"
                disabled={submitting || pin.length >= 6}
                onClick={() => press('0')}
              >
                0
              </Button>
              <Button
                size="lg"
                className="h-14 bg-primary hover:bg-primary/90"
                disabled={submitting || pin.length < 4}
                onClick={() => submitPin()}
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* GuardianX footer */}
        <div className="mt-8">
          <GuardianXBrand variant="light" />
          <p className="text-center text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Secured by GuardianX
          </p>
        </div>
      </div>
    </div>
  )
}
