import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import { canTransition } from '../../../src/lib/orders.js'
import { broadcastRestaurantEvent, broadcastTableEvent } from '../realtime/socket.js'

export async function getOrders(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  const orders = await prisma.order.findMany({
    where: { restaurantId },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })

  return orders.map((order) => ({
    id: order.id,
    tableId: order.tableId,
    round: order.round,
    guestName: order.guestName || '',
    guestPhone: order.guestPhone || '',
    partySize: order.partySize,
    notes: order.notes || '',
    status: order.status,
    readyItemIds: order.readyItemIds || [],
    createdAt: order.createdAt,
    acknowledgedAt: order.acknowledgedAt,
    cookingAt: order.cookingAt,
    readyAt: order.readyAt,
    servedAt: order.servedAt,
    items: (order.items || []).map((item) => ({
      id: item.menuItemId || item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      station: item.station,
      isVeg: item.isVeg,
      note: item.note || '',
    })),
  }))
}

export async function createOrderRound(restaurantId, data) {
  const now = Date.now()

  // Find existing rounds for this table to compute next round number
  const existingRounds = await prisma.order.findMany({
    where: { restaurantId, tableId: data.tableId, status: { notIn: ['paid', 'void'] } },
  })
  const roundNum = existingRounds.length + 1

  const count = await prisma.order.count({ where: { restaurantId } })
  const orderId = `ORD-${1036 + count}`

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        id: orderId,
        restaurantId,
        tableId: data.tableId,
        round: roundNum,
        guestName: data.guestName || '',
        guestPhone: data.guestPhone || '',
        partySize: data.partySize || 1,
        notes: data.notes || '',
        status: 'sent',
        readyItemIds: [],
        createdAt: now,
        items: {
          create: (data.items || []).map((item) => ({
            menuItemId: item.id,
            name: item.name,
            price: Number(item.price),
            qty: Number(item.qty),
            station: item.station || 'Hot Kitchen',
            isVeg: item.isVeg ?? true,
            note: item.note || '',
          })),
        },
      },
      include: { items: true },
    })

    // Upsert customer if phone provided
    if (data.guestPhone || data.guestName) {
      const phone = (data.guestPhone || '').replace(/\D/g, '')
      const existingCustomer = phone
        ? await tx.customer.findFirst({ where: { restaurantId, phone: data.guestPhone } })
        : null

      if (existingCustomer) {
        await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            visits: existingCustomer.visits + 1,
            lastVisit: now,
            name: data.guestName || existingCustomer.name,
          },
        })
      } else if (data.guestName || data.guestPhone) {
        const custCount = await tx.customer.count({ where: { restaurantId } })
        await tx.customer.create({
          data: {
            id: `g${String(custCount + 1).padStart(2, '0')}`,
            restaurantId,
            name: data.guestName || 'Guest',
            phone: data.guestPhone || '',
            visits: 1,
            totalSpend: 0,
            lastVisit: now,
            joinedAt: now,
            source: 'qr',
          },
        })
      }
    }

    // Audit Event
    const itemNames = (data.items || []).map((i) => i.name).join(', ')
    await tx.auditEvent.create({
      data: {
        id: `EV-${now}`,
        restaurantId,
        type: 'order',
        message: `Round ${roundNum} placed on ${data.tableId} — ${itemNames}`,
        at: now,
        actor: data.actor || data.guestName || 'Guest',
      },
    })

    return createdOrder
  })

  const formatted = {
    id: order.id,
    tableId: order.tableId,
    round: order.round,
    guestName: order.guestName || '',
    guestPhone: order.guestPhone || '',
    partySize: order.partySize,
    notes: order.notes || '',
    status: order.status,
    readyItemIds: order.readyItemIds || [],
    createdAt: order.createdAt,
    items: (order.items || []).map((item) => ({
      id: item.menuItemId || item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      station: item.station,
      isVeg: item.isVeg,
      note: item.note || '',
    })),
  }

  broadcastRestaurantEvent(restaurantId, 'order:created', formatted)
  broadcastTableEvent(restaurantId, data.tableId, 'order:updated', formatted)

  return formatted
}

export async function updateOrderStatus(restaurantId, orderId, nextStatus, readyItemIds, actor) {
  const now = Date.now()
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })

  if (!existing) {
    const error = new Error(`Order ${orderId} not found`)
    error.statusCode = 404
    throw error
  }

  if (nextStatus && nextStatus !== existing.status && !canTransition(existing.status, nextStatus)) {
    const error = new Error(`Illegal order transition from ${existing.status} to ${nextStatus}`)
    error.statusCode = 400
    throw error
  }

  const patch = {}
  if (nextStatus) {
    patch.status = nextStatus
    if (nextStatus === 'accepted' && !existing.acknowledgedAt) patch.acknowledgedAt = now
    if (nextStatus === 'cooking' && !existing.cookingAt) patch.cookingAt = now
    if (nextStatus === 'ready' && !existing.readyAt) patch.readyAt = now
    if (nextStatus === 'served' && !existing.servedAt) patch.servedAt = now
  }
  if (readyItemIds !== undefined) {
    patch.readyItemIds = readyItemIds
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: patch,
    include: { items: true },
  })

  // Audit event
  if (nextStatus) {
    await prisma.auditEvent.create({
      data: {
        id: `EV-${now}`,
        restaurantId,
        type: 'kds',
        message: `${existing.tableId} Round ${existing.round} marked ${nextStatus} by ${actor || 'staff'}`,
        at: now,
        actor: actor || 'staff',
      },
    })
  }

  const formatted = {
    id: updated.id,
    tableId: updated.tableId,
    round: updated.round,
    guestName: updated.guestName || '',
    guestPhone: updated.guestPhone || '',
    partySize: updated.partySize,
    notes: updated.notes || '',
    status: updated.status,
    readyItemIds: updated.readyItemIds || [],
    createdAt: updated.createdAt,
    acknowledgedAt: updated.acknowledgedAt,
    cookingAt: updated.cookingAt,
    readyAt: updated.readyAt,
    servedAt: updated.servedAt,
    items: (updated.items || []).map((item) => ({
      id: item.menuItemId || item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      station: item.station,
      isVeg: item.isVeg,
      note: item.note || '',
    })),
  }

  broadcastRestaurantEvent(restaurantId, 'order:updated', formatted)
  broadcastTableEvent(restaurantId, updated.tableId, 'order:updated', formatted)

  return formatted
}
