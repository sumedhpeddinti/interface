import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import { round2 } from '../../../src/lib/format.js'
import { broadcastRestaurantEvent } from '../realtime/socket.js'

export async function getActiveShift(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  const shift = await prisma.cashShift.findFirst({
    where: { restaurantId, isOpen: true },
    include: { transactions: true },
    orderBy: { openedAt: 'desc' },
  })

  const closedShifts = await prisma.cashShift.findMany({
    where: { restaurantId, isOpen: false },
    orderBy: { closedAt: 'desc' },
    take: 10,
  })

  return { activeShift: shift, closedShifts }
}

export async function openShift(restaurantId, openingFloat, openedBy) {
  const active = await prisma.cashShift.findFirst({
    where: { restaurantId, isOpen: true },
  })

  if (active) {
    const error = new Error('A cash drawer shift is already open')
    error.statusCode = 400
    throw error
  }

  const count = await prisma.cashShift.count({ where: { restaurantId } })
  const id = `SH-${String(count + 1).padStart(4, '0')}`

  const shift = await prisma.cashShift.create({
    data: {
      id,
      restaurantId,
      isOpen: true,
      openedAt: Date.now(),
      openingFloat: Number(openingFloat),
      openedBy,
      cashSales: 0,
      cashIn: 0,
      cashOut: 0,
    },
    include: { transactions: true },
  })

  broadcastRestaurantEvent(restaurantId, 'shift:updated', shift)
  return shift
}

export async function addCashTransaction(restaurantId, type, reason, amount, by) {
  const shift = await prisma.cashShift.findFirst({
    where: { restaurantId, isOpen: true },
  })

  if (!shift) {
    const error = new Error('No open cash shift found')
    error.statusCode = 400
    throw error
  }

  const count = await prisma.cashTransaction.count()
  const ctId = `CT-${String(count + 1).padStart(4, '0')}`

  const transaction = await prisma.$transaction(async (tx) => {
    const ct = await tx.cashTransaction.create({
      data: {
        id: ctId,
        shiftId: shift.id,
        type,
        reason,
        amount: Number(amount),
        at: Date.now(),
        by,
      },
    })

    const updateField = type === 'in' ? 'cashIn' : 'cashOut'
    const currentValue = type === 'in' ? (shift.cashIn || 0) : (shift.cashOut || 0)

    await tx.cashShift.update({
      where: { id: shift.id },
      data: { [updateField]: currentValue + Number(amount) },
    })

    return ct
  })

  broadcastRestaurantEvent(restaurantId, 'shift:updated', { shiftId: shift.id })
  return transaction
}

export async function closeShift(restaurantId, countedCash, closedBy, notes = '') {
  const shift = await prisma.cashShift.findFirst({
    where: { restaurantId, isOpen: true },
    include: { transactions: true },
  })

  if (!shift) {
    const error = new Error('No open cash shift found')
    error.statusCode = 400
    throw error
  }

  const openingFloat = shift.openingFloat || 0
  const cashSales = shift.cashSales || 0
  const cashIn = shift.cashIn || 0
  const cashOut = shift.cashOut || 0

  const expectedCash = round2(openingFloat + cashSales + cashIn - cashOut)
  const counted = Number(countedCash)
  const variance = round2(counted - expectedCash)
  const now = Date.now()

  const closed = await prisma.cashShift.update({
    where: { id: shift.id },
    data: {
      isOpen: false,
      closedAt: now,
      closedBy,
      expectedCash,
      countedCash: counted,
      variance,
      notes,
    },
  })

  await prisma.auditEvent.create({
    data: {
      id: `EV-${now}`,
      restaurantId,
      type: 'shift',
      message: `Shift ${shift.id} closed by ${closedBy}. Counted: ₹${counted}, Variance: ₹${variance}`,
      at: now,
      actor: closedBy,
    },
  })

  broadcastRestaurantEvent(restaurantId, 'shift:updated', closed)
  return closed
}
