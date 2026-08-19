import { db } from '@/lib/db'

// Seed script — initializes Hotel GuruVayurDham POS data:
// - Hotel config
// - 15 rooms (101-107 floor 1, 201-208 floor 2)
// - Menu items (Veg + Non-veg + Beverages)

async function main() {
  console.log('🌱 Seeding Hotel GuruVayurDham POS data...')

  // 1) Hotel config (upsert) — details from the actual invoice sample provided by client
  // (Mathura, UP — not Kerala as previously assumed)
  await db.hotelConfig.upsert({
    where: { id: 'main' },
    update: {
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
    create: {
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
  console.log('✓ Hotel config (updated with real Mathura UP details)')

  // 2) Rooms: 101-107 (Floor 1, Standard/Deluxe), 201-208 (Floor 2, Deluxe/Suite)
  const roomSpecs: { number: string; floor: number; type: string; rate: number; bed: string }[] = [
    // Floor 1 — Standard & Deluxe (closer to lobby/dining)
    { number: '101', floor: 1, type: 'Standard', rate: 1200, bed: 'Double' },
    { number: '102', floor: 1, type: 'Standard', rate: 1200, bed: 'Double' },
    { number: '103', floor: 1, type: 'Standard', rate: 1200, bed: 'Twin' },
    { number: '104', floor: 1, type: 'Deluxe',   rate: 1500, bed: 'Double' },
    { number: '105', floor: 1, type: 'Deluxe',   rate: 1500, bed: 'Double' },
    { number: '106', floor: 1, type: 'Deluxe',   rate: 1500, bed: 'Twin' },
    { number: '107', floor: 1, type: 'Deluxe',   rate: 1500, bed: 'Double' },
    // Floor 2 — Deluxe & Suite
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
    await db.room.upsert({
      where: { number: r.number },
      update: {},
      create: {
        number: r.number,
        floor: r.floor,
        type: r.type,
        ratePerNight: r.rate,
        bedType: r.bed,
        capacity: r.bed === 'Twin' ? 3 : 2,
        status: 'available',
      },
    })
  }
  console.log(`✓ ${roomSpecs.length} rooms (101-107, 201-208)`)

  // 3) Menu items — typical South-Indian hotel kitchen menu
  const menu = [
    // Breakfast
    { name: 'Idli (2 pcs)',        category: 'Breakfast',      price: 50,  isVeg: true  },
    { name: 'Sambar Vada (2 pcs)', category: 'Breakfast',      price: 60,  isVeg: true  },
    { name: 'Masala Dosa',         category: 'Breakfast',      price: 80,  isVeg: true  },
    { name: 'Plain Dosa',          category: 'Breakfast',      price: 70,  isVeg: true  },
    { name: 'Pongal',              category: 'Breakfast',      price: 75,  isVeg: true  },
    { name: 'Upma',                category: 'Breakfast',      price: 60,  isVeg: true  },
    { name: 'Poori (2 pcs)',       category: 'Breakfast',      price: 70,  isVeg: true  },
    { name: 'Chapati + Curry',     category: 'Breakfast',      price: 70,  isVeg: true  },
    // South Indian Meals
    { name: 'Veg Meals (Thali)',   category: 'South Indian',  price: 180, isVeg: true  },
    { name: 'Special Veg Meals',   category: 'South Indian',  price: 250, isVeg: true  },
    { name: 'Curd Rice',           category: 'South Indian',  price: 90,  isVeg: true  },
    { name: 'Lemon Rice',         category: 'South Indian',  price: 90,  isVeg: true  },
    // Main Course
    { name: 'Paneer Butter Masala', category: 'Main Course',  price: 240, isVeg: true  },
    { name: 'Dal Tadka',           category: 'Main Course',   price: 180, isVeg: true  },
    { name: 'Mixed Veg Curry',     category: 'Main Course',   price: 170, isVeg: true  },
    { name: 'Chicken Curry',       category: 'Main Course',   price: 280, isVeg: false },
    { name: 'Chicken Butter Masala', category: 'Main Course', price: 320, isVeg: false },
    { name: 'Fish Curry',          category: 'Main Course',   price: 320, isVeg: false },
    { name: 'Mutton Curry',        category: 'Main Course',   price: 380, isVeg: false },
    // Breads
    { name: 'Butter Roti',        category: 'Breads',         price: 25,  isVeg: true  },
    { name: 'Tandoori Roti',       category: 'Breads',         price: 30,  isVeg: true  },
    { name: 'Butter Naan',         category: 'Breads',         price: 50,  isVeg: true  },
    { name: 'Garlic Naan',         category: 'Breads',         price: 60,  isVeg: true  },
    // Rice
    { name: 'Steamed Rice',        category: 'Rice',          price: 90,  isVeg: true  },
    { name: 'Jeera Rice',          category: 'Rice',           price: 130, isVeg: true  },
    { name: 'Veg Biryani',         category: 'Rice',           price: 220, isVeg: true  },
    { name: 'Chicken Biryani',     category: 'Rice',           price: 280, isVeg: false },
    { name: 'Mutton Biryani',      category: 'Rice',           price: 360, isVeg: false },
    // Chinese
    { name: 'Veg Hakka Noodles',   category: 'Chinese',       price: 180, isVeg: true  },
    { name: 'Veg Fried Rice',      category: 'Chinese',       price: 170, isVeg: true  },
    { name: 'Chilli Chicken',      category: 'Chinese',        price: 240, isVeg: false },
    // Starters
    { name: 'Gobi Manchurian',     category: 'Starters',       price: 180, isVeg: true  },
    { name: 'Paneer Tikka',        category: 'Starters',       price: 240, isVeg: true  },
    { name: 'Chicken 65',          category: 'Starters',        price: 260, isVeg: false },
    // Beverages
    { name: 'Filter Coffee',       category: 'Beverages',      price: 30,  isVeg: true  },
    { name: 'Tea',                 category: 'Beverages',      price: 25,  isVeg: true  },
    { name: 'Masala Chai',         category: 'Beverages',      price: 30,  isVeg: true  },
    { name: 'Mineral Water (1L)',  category: 'Beverages',      price: 40,  isVeg: true  },
    { name: 'Fresh Lime Soda',     category: 'Beverages',      price: 60,  isVeg: true  },
    { name: 'Buttermilk',          category: 'Beverages',      price: 50,  isVeg: true  },
    // Desserts
    { name: 'Gulab Jamun (2 pcs)', category: 'Desserts',       price: 80,  isVeg: true  },
    { name: 'Payasam',             category: 'Desserts',       price: 90,  isVeg: true  },
    { name: 'Ice Cream (Veg)',      category: 'Desserts',       price: 70,  isVeg: true  },
  ]

  for (const m of menu) {
    const existing = await db.menuItem.findFirst({ where: { name: m.name } })
    if (!existing) {
      await db.menuItem.create({
        data: {
          name: m.name,
          category: m.category,
          price: m.price,
          isVeg: m.isVeg,
          available: true,
          prepTime: m.category === 'Beverages' ? 5 : m.category === 'Breakfast' ? 10 : 20,
        },
      })
    }
  }
  console.log(`✓ ${menu.length} menu items`)

  console.log('🌱 Seed completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
