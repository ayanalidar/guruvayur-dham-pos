'use client'

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0)
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export async function apiFetch<T = any>(url: string, opts?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    })
    // Handle non-JSON responses gracefully
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      throw new Error('Unexpected response format')
    }
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error || `Request failed: ${res.status}`)
    }
    return data as T
  } catch (e: any) {
    // Network errors, CORS, timeout, etc.
    if (e instanceof TypeError && e.message.includes('fetch')) {
      throw new Error('Network error — please check your connection')
    }
    throw e
  }
}
