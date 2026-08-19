'use client'

import { Shield } from 'lucide-react'

export function GuardianXBrand({ variant = 'light', className = '' }: { variant?: 'light' | 'dark' | 'inline'; className?: string }) {
  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${className}`}>
        <Shield className="h-3 w-3" />
        <span>Made &amp; Maintained by </span>
        <strong className="font-semibold">GuardianX</strong>
      </span>
    )
  }
  const isDark = variant === 'dark'
  return (
    <div className={`text-center ${className}`}>
      <p className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-sidebar-foreground/50' : 'text-muted-foreground'}`}>
        Made &amp; Maintained by
      </p>
      <p className={`text-sm font-bold flex items-center justify-center gap-1 mt-0.5 ${isDark ? 'text-sidebar-foreground' : 'text-foreground'}`}>
        <Shield className="h-3.5 w-3.5" />
        GuardianX
      </p>
    </div>
  )
}
