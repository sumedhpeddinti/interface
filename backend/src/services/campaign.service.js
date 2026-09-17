import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import { broadcastRestaurantEvent } from '../realtime/socket.js'

export async function getCampaigns(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  return prisma.campaign.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createCampaign(restaurantId, data) {
  const count = await prisma.campaign.count({ where: { restaurantId } })
  const id = `CMP-${String(count + 1).padStart(4, '0')}`
  const now = Date.now()

  const campaign = await prisma.campaign.create({
    data: {
      id,
      restaurantId,
      channel: data.channel || 'whatsapp',
      name: data.name,
      heading: data.heading,
      body: data.body,
      coupon: data.coupon || '',
      audience: data.audience || 'all',
      audienceLabel: data.audienceLabel || 'All guests',
      audienceSize: data.audienceSize || 0,
      sent: data.audienceSize || 0,
      opened: Math.floor((data.audienceSize || 0) * 0.6),
      walkIns: 0,
      revenue: 0,
      status: data.scheduleAt ? 'scheduled' : 'completed',
      sentAt: data.scheduleAt ? null : now,
      scheduleAt: data.scheduleAt ? Number(data.scheduleAt) : null,
      createdBy: data.createdBy || 'Vinit Sharma',
    },
  })

  await prisma.auditEvent.create({
    data: {
      id: `EV-${now}`,
      restaurantId,
      type: 'campaign',
      message: `Campaign "${data.name}" created (${data.channel})`,
      at: now,
      actor: data.createdBy || 'Vinit Sharma',
    },
  })

  broadcastRestaurantEvent(restaurantId, 'campaign:created', campaign)
  return campaign
}
