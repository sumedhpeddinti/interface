import { prisma } from '../db/client.js'
import { env } from '../config/env.js'

export async function getGuests(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  return prisma.customer.findMany({
    where: { restaurantId },
    orderBy: { lastVisit: 'desc' },
  })
}

export async function updateGuestOptOut(restaurantId, guestId, optedOut) {
  return prisma.customer.update({
    where: { id: guestId },
    data: { optedOut: Boolean(optedOut) },
  })
}
