import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import { broadcastRestaurantEvent } from '../realtime/socket.js'

export async function getTables(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  return prisma.table.findMany({
    where: { restaurantId },
    orderBy: { id: 'asc' },
  })
}

export async function updateTable(restaurantId, id, patch) {
  const table = await prisma.table.update({
    where: { id_restaurantId: { id, restaurantId } },
    data: patch,
  })

  broadcastRestaurantEvent(restaurantId, 'table:updated', { table })
  return table
}
