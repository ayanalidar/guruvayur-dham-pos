'use client'

import { useState, useEffect } from 'react'
import { DashboardPanel } from '@/components/pos/dashboard-panel'
import { RoomsPanel } from '@/components/pos/rooms-panel'
import { KitchenPanel } from '@/components/pos/kitchen-panel'
import { OrdersPanel } from '@/components/pos/orders-panel'
import { InvoicesPanel } from '@/components/pos/invoices-panel'
import { LoginScreen } from '@/components/pos/login-screen'
import { GuardianXBrand } from '@/components/pos/guardianx-brand'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Bed, Utensils, ClipboardList, Receipt, Hotel, Settings, LogOut } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/format'

type Tab = 'dashboard' | 'rooms' | 'kitchen' | 'orders' | 'invoices'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'rooms',     label: 'Rooms',     icon: <Bed className="h-4 w-4" /> },
  { id: 'kitchen',   label: 'Kitchen',   icon: <Utensils className="h-4 w-4" /> },
  { id: 'orders',    label: 'Orders',    icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'invoices',  label: 'Invoices',  icon: <Receipt className="h-4 w-4" /> },
]

export default function Home() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Lazy initialiser reads sessionStorage once on first render (client-side)
  // — no flash, no extra render, no eslint warning.
  const [authed, setAuthed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('posAuth') === 'true'
  })

  function handleLogin() {
    setAuthed(true)
  }

  function handleLogout() {
    sessionStorage.removeItem('posAuth')
    sessionStorage.removeItem('posAuthAt')
    setAuthed(false)
  }

  if (!authed) return <LoginScreen onSuccess={handleLogin} />

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-16 lg:w-60 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-3 lg:p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Hotel className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-sm font-bold leading-tight truncate">GuruVayurDham</p>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Hotel POS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 lg:px-3 py-2 rounded-md text-sm transition-colors ${
                tab === item.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
              title={item.label}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline ml-2">Settings</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-rose-500/20 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline ml-2">Lock POS</span>
          </Button>
          {/* GuardianX brand at bottom of sidebar */}
          <div className="hidden lg:block pt-2 border-t border-sidebar-border/50">
            <GuardianXBrand variant="dark" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b bg-card px-4 lg:px-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base lg:text-lg font-semibold capitalize">{tab === 'kitchen' ? 'Kitchen & Menu' : tab}</h1>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {tab === 'dashboard' && <DashboardPanel onNavigate={(t) => setTab(t as Tab)} />}
          {tab === 'rooms' && <RoomsPanel />}
          {tab === 'kitchen' && <KitchenPanel />}
          {tab === 'orders' && <OrdersPanel onNavigate={(t) => setTab(t as Tab)} />}
          {tab === 'invoices' && <InvoicesPanel />}
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast()
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    if (open) {
      apiFetch<{ config: any }>('/api/config').then(d => setConfig(d.config)).catch(() => {})
    }
  }, [open])

  async function save() {
    try {
      await apiFetch('/api/config', { method: 'PATCH', body: JSON.stringify(config) })
      toast({ title: 'Settings saved' })
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' })
    }
  }

  if (!config) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hotel Settings</DialogTitle>
          <DialogDescription>These details appear on every printed invoice.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <FieldRow label="Hotel Name">
            <Input value={config.name || ''} onChange={e => setConfig({ ...config, name: e.target.value })} />
          </FieldRow>
          <FieldRow label="Address">
            <Input value={config.address || ''} onChange={e => setConfig({ ...config, address: e.target.value })} />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Phone">
              <Input value={config.phone || ''} onChange={e => setConfig({ ...config, phone: e.target.value })} />
            </FieldRow>
            <FieldRow label="Email">
              <Input value={config.email || ''} onChange={e => setConfig({ ...config, email: e.target.value })} />
            </FieldRow>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="GST Number">
              <Input value={config.gstNumber || ''} onChange={e => setConfig({ ...config, gstNumber: e.target.value })} />
            </FieldRow>
            <FieldRow label="SAC Code">
              <Input value={config.sacCode || ''} onChange={e => setConfig({ ...config, sacCode: e.target.value })} />
            </FieldRow>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="CGST Rate (%)">
              <Input type="number" step="0.1" value={config.cgstRate ?? 9} onChange={e => setConfig({ ...config, cgstRate: Number(e.target.value) })} />
            </FieldRow>
            <FieldRow label="SGST Rate (%)">
              <Input type="number" step="0.1" value={config.sgstRate ?? 9} onChange={e => setConfig({ ...config, sgstRate: Number(e.target.value) })} />
            </FieldRow>
          </div>
          <FieldRow label="POS Login PIN (4-6 digits)">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={config.posPin ?? '1234'}
              onChange={e => setConfig({ ...config, posPin: e.target.value.replace(/\D/g, '') })}
            />
          </FieldRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
