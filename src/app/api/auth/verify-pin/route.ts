import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSeeded } from '@/lib/db'

// Simple in-memory rate limiter — tracks failed attempts per IP.
// In production (Vercel serverless), this resets per cold start, which is acceptable.
// For stricter limits, use Upstash Redis or Vercel KV.
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 60_000 // 1 minute lock after 5 failed attempts

// POST /api/auth/verify-pin
// Body: { pin: "1234" }
// Returns: { valid: true, token: "..." } or { valid: false, retryAfter: seconds }
// The token is a simple HMAC-like string stored in sessionStorage — NOT a real JWT.
// For production-grade auth, use NextAuth.js or iron-session.
export async function POST(req: NextRequest) {
  await ensureSeeded()

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const now = Date.now()
  const record = failedAttempts.get(ip)
  if (record && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000)
    return NextResponse.json(
      { valid: false, error: 'Too many failed attempts. Try again later.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const body = await req.json()
  const submittedPin = String(body.pin || '').trim()

  if (!/^\d{4,6}$/.test(submittedPin)) {
    return NextResponse.json({ valid: false, error: 'Invalid PIN format' }, { status: 400 })
  }

  const config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  if (!config || !config.posPin) {
    return NextResponse.json({ valid: false, error: 'No PIN configured. Contact administrator.' }, { status: 500 })
  }

  // Constant-time comparison to prevent timing attacks
  const a = submittedPin
  const b = config.posPin
  let diff = 0
  if (a.length !== b.length) diff = 1
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }

  if (diff === 0) {
    // Success — clear failed attempts
    failedAttempts.delete(ip)
    // Generate a simple token (not a real JWT, but sufficient for client-side auth state)
    const token = Buffer.from(`${now}:${ip}:${config.posPin}`).toString('base64')
    return NextResponse.json({ valid: true, token })
  } else {
    // Failure — increment counter
    const current = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 }
    current.count += 1
    if (current.count >= MAX_ATTEMPTS) {
      current.lockedUntil = now + LOCK_DURATION_MS
    }
    failedAttempts.set(ip, current)
    const remaining = MAX_ATTEMPTS - current.count
    return NextResponse.json({
      valid: false,
      error: 'Incorrect PIN',
      attemptsRemaining: Math.max(0, remaining),
    }, { status: 401 })
  }
}
