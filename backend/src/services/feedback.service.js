import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import { broadcastRestaurantEvent } from '../realtime/socket.js'

export async function getFeedback(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  return prisma.feedback.findMany({
    where: { restaurantId },
    orderBy: { at: 'desc' },
  })
}

export async function createFeedback(restaurantId, data) {
  const count = await prisma.feedback.count({ where: { restaurantId } })
  const id = `FB-${String(count + 1).padStart(4, '0')}`

  const fb = await prisma.feedback.create({
    data: {
      id,
      restaurantId,
      guestName: data.guestName,
      tableId: data.tableId || null,
      rating: Number(data.rating),
      pills: data.pills || [],
      comment: data.comment || '',
      at: Date.now(),
      invoiceId: data.invoiceId || null,
    },
  })

  broadcastRestaurantEvent(restaurantId, 'feedback:created', fb)
  return fb
}
