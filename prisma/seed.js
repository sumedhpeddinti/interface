import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'
import { buildSeedState } from '../src/data/seedState.js'

const { PrismaClient } = pkg
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const seed = buildSeedState()

  // 1. Restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'rest_ganesh_cafe_01' },
    update: {
      name: seed.restaurant.name,
      tagline: seed.restaurant.tagline,
      gstin: seed.restaurant.gstin,
      fssai: seed.restaurant.fssai,
      address: seed.restaurant.address,
      phone: seed.restaurant.phone,
      email: seed.restaurant.email,
      upi: seed.restaurant.upi,
      currency: seed.restaurant.currency,
      settings: seed.settings,
    },
    create: {
      id: 'rest_ganesh_cafe_01',
      name: seed.restaurant.name,
      tagline: seed.restaurant.tagline,
      gstin: seed.restaurant.gstin,
      fssai: seed.restaurant.fssai,
      address: seed.restaurant.address,
      phone: seed.restaurant.phone,
      email: seed.restaurant.email,
      upi: seed.restaurant.upi,
      currency: seed.restaurant.currency,
      settings: seed.settings,
    },
  })

  const restaurantId = restaurant.id
  console.log(`✓ Restaurant: ${restaurant.name} (${restaurantId})`)

  // 2. Staff
  for (const s of seed.staff) {
    const pinHash = await bcrypt.hash(s.pin, 10)
    await prisma.staff.upsert({
      where: { id: s.id },
      update: {
        restaurantId,
        name: s.name,
        role: s.role,
        pinHash,
        title: s.title || s.role,
        phone: s.phone || '',
        active: s.active ?? true,
        joinedDaysAgo: s.joinedDaysAgo || 0,
      },
      create: {
        id: s.id,
        restaurantId,
        name: s.name,
        role: s.role,
        pinHash,
        title: s.title || s.role,
        phone: s.phone || '',
        active: s.active ?? true,
        joinedDaysAgo: s.joinedDaysAgo || 0,
      },
    })
  }
  console.log(`✓ Staff accounts seeded (${seed.staff.length})`)

  // 3. Categories & Menu Items
  const categoryNames = [
    'Top Picks',
    'Main Course',
    'Soups',
    'Starters - Veg',
    'Starters - Non-Veg',
    'Beverages',
    'Desserts',
  ]
  const catMap = new Map()

  for (let idx = 0; idx < categoryNames.length; idx++) {
    const catName = categoryNames[idx]
    const existing = await prisma.category.findFirst({
      where: { restaurantId, name: catName },
    })
    let catObj = existing
    if (!catObj) {
      catObj = await prisma.category.create({
        data: {
          restaurantId,
          name: catName,
          sortOrder: idx,
          active: true,
        },
      })
    }
    catMap.set(catName, catObj.id)
  }

  for (const item of seed.menu) {
    const categoryId = catMap.get(item.category) || null
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        restaurantId,
        categoryId,
        name: item.name,
        description: item.description || '',
        price: Number(item.price),
        rating: Number(item.rating || 5.0),
        categoryName: item.category,
        station: item.station,
        isVeg: Boolean(item.isVeg),
        isBestseller: Boolean(item.isBestseller),
        image: item.image || '',
        available: Boolean(item.available),
      },
      create: {
        id: item.id,
        restaurantId,
        categoryId,
        name: item.name,
        description: item.description || '',
        price: Number(item.price),
        rating: Number(item.rating || 5.0),
        categoryName: item.category,
        station: item.station,
        isVeg: Boolean(item.isVeg),
        isBestseller: Boolean(item.isBestseller),
        image: item.image || '',
        available: Boolean(item.available),
      },
    })
  }
  console.log(`✓ Menu items seeded (${seed.menu.length})`)

  // 4. Tables
  for (const t of seed.tables) {
    await prisma.table.upsert({
      where: { id_restaurantId: { id: t.id, restaurantId } },
      update: {
        seats: Number(t.seats),
        section: t.section,
        x: Number(t.x),
        y: Number(t.y),
        shape: t.shape || 'square',
        reserved: Boolean(t.reserved),
      },
      create: {
        id: t.id,
        restaurantId,
        seats: Number(t.seats),
        section: t.section,
        x: Number(t.x),
        y: Number(t.y),
        shape: t.shape || 'square',
        reserved: Boolean(t.reserved),
      },
    })
  }
  console.log(`✓ Tables seeded (${seed.tables.length})`)

  // 5. Clear transactional/demo data so system starts completely clean
  await prisma.feedback.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cashTransaction.deleteMany()
  await prisma.cashShift.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.auditEvent.deleteMany()
  console.log('✓ Cleaned transactional history (orders, invoices, shifts, expenses, guests, feedback, events)')

  console.log('✅ Database seeding complete! Connected directly to clean PostgreSQL database.')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
