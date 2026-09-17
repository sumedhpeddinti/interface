import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import { broadcastRestaurantEvent } from '../realtime/socket.js'

export async function getMenuItems(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  return prisma.menuItem.findMany({
    where: { restaurantId },
    orderBy: { name: 'asc' },
  })
}

export async function createMenuItem(restaurantId, data) {
  const count = await prisma.menuItem.count({ where: { restaurantId } })
  const id = `m${String(count + 1).padStart(2, '0')}`

  const category = await prisma.category.findFirst({
    where: { restaurantId, name: data.categoryName },
  })

  const item = await prisma.menuItem.create({
    data: {
      id,
      restaurantId,
      categoryId: category?.id || null,
      name: data.name,
      description: data.description || '',
      price: Number(data.price),
      rating: 5.0,
      categoryName: data.categoryName,
      station: data.station,
      isVeg: Boolean(data.isVeg),
      isBestseller: Boolean(data.isBestseller),
      image: data.image || '',
      available: data.available ?? true,
    },
  })

  await prisma.auditEvent.create({
    data: {
      id: `EV-${Date.now()}`,
      restaurantId,
      type: 'menu',
      message: `Menu item added: ${item.name}`,
      at: Date.now(),
      actor: data.actor || 'system',
    },
  })

  broadcastRestaurantEvent(restaurantId, 'menu:updated', { item, action: 'create' })
  return item
}

export async function updateMenuItem(restaurantId, id, patch) {
  const item = await prisma.menuItem.update({
    where: { id },
    data: patch,
  })

  await prisma.auditEvent.create({
    data: {
      id: `EV-${Date.now()}`,
      restaurantId,
      type: 'menu',
      message: `Menu item updated: ${item.name}`,
      at: Date.now(),
      actor: patch.actor || 'system',
    },
  })

  broadcastRestaurantEvent(restaurantId, 'menu:updated', { item, action: 'update' })
  return item
}

export async function deleteMenuItem(restaurantId, id) {
  const item = await prisma.menuItem.update({
    where: { id },
    data: { available: false },
  })

  broadcastRestaurantEvent(restaurantId, 'menu:updated', { id, action: 'delete' })
  return item
}
