import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always create a fresh client in dev to avoid stale file handles when the DB file is reset
// outside the dev process. In production, reuse the global instance for performance.
function createClient() {
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

export const db = process.env.NODE_ENV === 'production'
  ? (globalForPrisma.prisma ?? (globalForPrisma.prisma = createClient()))
  : createClient()// touched at Wed Aug 19 07:37:19 UTC 2026
