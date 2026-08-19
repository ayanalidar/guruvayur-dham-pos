import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSeeded: boolean | undefined
  schemaPushed: boolean | undefined
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
  : createClient()

// On Vercel (serverless), the SQLite file is ephemeral — it resets on each cold start.
// This function ensures the DB schema exists AND is seeded on first use.
// The schema is created by executing the SQL DDL statements directly via Prisma's $executeRawUnsafe.
export async function ensureSeeded() {
  if (globalForPrisma.prismaSeeded) return

  // Step 1: Ensure the SQLite schema exists in the DB file.
  if (!globalForPrisma.schemaPushed) {
    try {
      // Check if HotelConfig table exists (use a try/catch — if it doesn't exist, the query throws)
      await db.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='HotelConfig'`
    } catch {
      // Table doesn't exist — execute the schema SQL
      try {
        // Try prisma/schema.sql first, fall back to public/schema.sql (which is always bundled)
        let schemaPath = path.join(process.cwd(), 'prisma', 'schema.sql')
        if (!fs.existsSync(schemaPath)) {
          schemaPath = path.join(process.cwd(), 'public', 'schema.sql')
        }
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf-8')
          // Split on semicolons, execute each statement (Prisma's $executeRawUnsafe doesn't support multi-statement)
          const statements = sql
            .split(/;\s*\n/)
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'))
          for (const stmt of statements) {
            try {
              await db.$executeRawUnsafe(stmt)
            } catch (e) {
              // Statement may fail if table already exists — ignore
            }
          }
          console.log('[seed] schema created via raw SQL')
        }
      } catch (e) {
        console.error('[seed] schema creation failed:', e)
      }
    }
    globalForPrisma.schemaPushed = true
  }

  globalForPrisma.prismaSeeded = true

  try {
    const config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
    if (!config) {
      await db.hotelConfig.create({
        data: {
          id: 'main',
          name: 'Hotel Guruvayur Dham',
          address: '88/306 Mali Para, Opp. Pathway Mata Mandir, Dholi Pyau, Mathura, Uttar Pradesh - 281001',
          phone: '+91 8445555554, +91 9410077786',
          email: 'Guruvayurdham@gmail.com',
          gstNumber: '09AABFG2373H1ZG',
          sacCode: '996311',
          cgstRate: 9.0,
          sgstRate: 9.0,
          posPin: '1234',
          reviewLink: 'https://share.google/5fv3gDrquFN8LT1xb',
          bankName: 'AU Small Finance Bank',
          bankAccount: '2502423717165310',
          bankIfsc: 'AUBL0002453',
          bankBranch: 'Mathura',
        },
      })
    }

    const roomCount = await db.room.count()
    if (roomCount === 0) {
      const roomSpecs = [
        { number: '101', floor: 1, type: 'Standard', rate: 1200, bed: 'Double' },
        { number: '102', floor: 1, type: 'Standard', rate: 1200, bed: 'Double' },
        { number: '103', floor: 1, type: 'Standard', rate: 1200, bed: 'Twin' },
        { number: '104', floor: 1, type: 'Deluxe',   rate: 1500, bed: 'Double' },
        { number: '105', floor: 1, type: 'Deluxe',   rate: 1500, bed: 'Double' },
        { number: '106', floor: 1, type: 'Deluxe',   rate: 1500, bed: 'Twin' },
        { number: '107', floor: 1, type: 'Deluxe',   rate: 1500, bed: 'Double' },
        { number: '201', floor: 2, type: 'Deluxe',   rate: 1700, bed: 'Double' },
        { number: '202', floor: 2, type: 'Deluxe',   rate: 1700, bed: 'Double' },
        { number: '203', floor: 2, type: 'Deluxe',   rate: 1700, bed: 'Twin' },
        { number: '204', floor: 2, type: 'Deluxe',   rate: 1700, bed: 'Double' },
        { number: '205', floor: 2, type: 'Suite',    rate: 2500, bed: 'King' },
        { number: '206', floor: 2, type: 'Suite',    rate: 2500, bed: 'King' },
        { number: '207', floor: 2, type: 'Suite',    rate: 2800, bed: 'King' },
        { number: '208', floor: 2, type: 'Suite',    rate: 2800, bed: 'King' },
      ]
      for (const r of roomSpecs) {
        await db.room.create({
          data: {
            number: r.number, floor: r.floor, type: r.type,
            ratePerNight: r.rate, bedType: r.bed,
            capacity: r.bed === 'Twin' ? 3 : 2, status: 'available',
          },
        })
      }
    }

    const menuCount = await db.menuItem.count()
    if (menuCount === 0) {
      const menu = [
        { name: 'Idli (2 pcs)', category: 'Breakfast', price: 50, isVeg: true, prepTime: 10 },
        { name: 'Sambar Vada (2 pcs)', category: 'Breakfast', price: 60, isVeg: true, prepTime: 10 },
        { name: 'Masala Dosa', category: 'Breakfast', price: 80, isVeg: true, prepTime: 10 },
        { name: 'Plain Dosa', category: 'Breakfast', price: 70, isVeg: true, prepTime: 10 },
        { name: 'Pongal', category: 'Breakfast', price: 75, isVeg: true, prepTime: 10 },
        { name: 'Upma', category: 'Breakfast', price: 60, isVeg: true, prepTime: 10 },
        { name: 'Poori (2 pcs)', category: 'Breakfast', price: 70, isVeg: true, prepTime: 10 },
        { name: 'Chapati + Curry', category: 'Breakfast', price: 70, isVeg: true, prepTime: 10 },
        { name: 'Veg Meals (Thali)', category: 'South Indian', price: 180, isVeg: true, prepTime: 20 },
        { name: 'Special Veg Meals', category: 'South Indian', price: 250, isVeg: true, prepTime: 20 },
        { name: 'Curd Rice', category: 'South Indian', price: 90, isVeg: true, prepTime: 15 },
        { name: 'Lemon Rice', category: 'South Indian', price: 90, isVeg: true, prepTime: 15 },
        { name: 'Paneer Butter Masala', category: 'Main Course', price: 240, isVeg: true, prepTime: 20 },
        { name: 'Dal Tadka', category: 'Main Course', price: 180, isVeg: true, prepTime: 20 },
        { name: 'Mixed Veg Curry', category: 'Main Course', price: 170, isVeg: true, prepTime: 20 },
        { name: 'Chicken Curry', category: 'Main Course', price: 280, isVeg: false, prepTime: 25 },
        { name: 'Chicken Butter Masala', category: 'Main Course', price: 320, isVeg: false, prepTime: 25 },
        { name: 'Fish Curry', category: 'Main Course', price: 320, isVeg: false, prepTime: 25 },
        { name: 'Mutton Curry', category: 'Main Course', price: 380, isVeg: false, prepTime: 30 },
        { name: 'Butter Roti', category: 'Breads', price: 25, isVeg: true, prepTime: 10 },
        { name: 'Tandoori Roti', category: 'Breads', price: 30, isVeg: true, prepTime: 10 },
        { name: 'Butter Naan', category: 'Breads', price: 50, isVeg: true, prepTime: 10 },
        { name: 'Garlic Naan', category: 'Breads', price: 60, isVeg: true, prepTime: 12 },
        { name: 'Steamed Rice', category: 'Rice', price: 90, isVeg: true, prepTime: 15 },
        { name: 'Jeera Rice', category: 'Rice', price: 130, isVeg: true, prepTime: 15 },
        { name: 'Veg Biryani', category: 'Rice', price: 220, isVeg: true, prepTime: 25 },
        { name: 'Chicken Biryani', category: 'Rice', price: 280, isVeg: false, prepTime: 30 },
        { name: 'Mutton Biryani', category: 'Rice', price: 360, isVeg: false, prepTime: 35 },
        { name: 'Veg Hakka Noodles', category: 'Chinese', price: 180, isVeg: true, prepTime: 15 },
        { name: 'Veg Fried Rice', category: 'Chinese', price: 170, isVeg: true, prepTime: 15 },
        { name: 'Chilli Chicken', category: 'Chinese', price: 240, isVeg: false, prepTime: 20 },
        { name: 'Gobi Manchurian', category: 'Starters', price: 180, isVeg: true, prepTime: 20 },
        { name: 'Paneer Tikka', category: 'Starters', price: 240, isVeg: true, prepTime: 25 },
        { name: 'Chicken 65', category: 'Starters', price: 260, isVeg: false, prepTime: 20 },
        { name: 'Filter Coffee', category: 'Beverages', price: 30, isVeg: true, prepTime: 5 },
        { name: 'Tea', category: 'Beverages', price: 25, isVeg: true, prepTime: 5 },
        { name: 'Masala Chai', category: 'Beverages', price: 30, isVeg: true, prepTime: 5 },
        { name: 'Mineral Water (1L)', category: 'Beverages', price: 40, isVeg: true, prepTime: 1 },
        { name: 'Fresh Lime Soda', category: 'Beverages', price: 60, isVeg: true, prepTime: 5 },
        { name: 'Buttermilk', category: 'Beverages', price: 50, isVeg: true, prepTime: 5 },
        { name: 'Gulab Jamun (2 pcs)', category: 'Desserts', price: 80, isVeg: true, prepTime: 10 },
        { name: 'Payasam', category: 'Desserts', price: 90, isVeg: true, prepTime: 10 },
        { name: 'Ice Cream (Veg)', category: 'Desserts', price: 70, isVeg: true, prepTime: 5 },
      ]
      for (const m of menu) {
        await db.menuItem.create({ data: { ...m, available: true } })
      }
    }
  } catch (e) {
    // Seed failed — flag as not seeded so we retry next request
    globalForPrisma.prismaSeeded = false
    console.error('[seed] failed:', e)
  }
}

