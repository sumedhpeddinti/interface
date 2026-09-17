import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import { computeTotals } from '../../../src/lib/pricing.js'
import { round2 } from '../../../src/lib/format.js'
import { broadcastRestaurantEvent, broadcastTableEvent } from '../realtime/socket.js'

export async function settleTableBill(restaurantId, tableId, method, discount = null, tendered = null, cashierName = 'Cashier', cashierId = null) {
  const now = Date.now()

  // 1. Get open rounds for table
  const openOrders = await prisma.order.findMany({
    where: {
      restaurantId,
      tableId,
      status: { notIn: ['paid', 'void'] },
    },
    include: { items: true },
  })

  if (openOrders.length === 0) {
    const error = new Error(`No open rounds found for table ${tableId}`)
    error.statusCode = 400
    throw error
  }

  // 2. Aggregate line items
  const lines = []
  for (const order of openOrders) {
    for (const item of order.items || []) {
      lines.push({
        id: item.menuItemId || item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        station: item.station,
        isVeg: item.isVeg,
        note: item.note || '',
        round: order.round,
        orderId: order.id,
      })
    }
  }

  // 3. Compute totals on server (NEVER TRUST CLIENT TOTALS)
  const totals = computeTotals(lines, discount)
  const tenderAmount = method === 'Cash'
    ? (tendered || Math.ceil(totals.total / 100) * 100)
    : (tendered || totals.total)
  const change = round2(Math.max(0, tenderAmount - totals.total))

  const count = await prisma.invoice.count({ where: { restaurantId } })
  const invoiceId = `INV/26-27/${String(count + 1).padStart(4, '0')}`

  const activeShift = await prisma.cashShift.findFirst({
    where: { restaurantId, isOpen: true },
  })

  const guestName = openOrders[0]?.guestName || 'Guest'
  const guestPhone = openOrders[0]?.guestPhone || ''

  // Execute in single atomic database transaction
  const invoice = await prisma.$transaction(async (tx) => {
    // A. Create invoice record
    const createdInvoice = await tx.invoice.create({
      data: {
        id: invoiceId,
        restaurantId,
        tableId,
        guestName,
        guestPhone,
        cashierName,
        cashierId,
        method,
        createdAt: now,
        settledAt: now,
        shiftId: activeShift?.id || null,
        lines,
        totals,
        tendered: tenderAmount,
        change,
      },
    })

    // B. Mark all open orders for table as paid
    await tx.order.updateMany({
      where: {
        restaurantId,
        tableId,
        status: { notIn: ['paid', 'void'] },
      },
      data: { status: 'paid', settledAt: now },
    })

    // C. Update cash shift if Cash payment
    if (activeShift && method === 'Cash') {
      await tx.cashShift.update({
        where: { id: activeShift.id },
        data: { cashSales: (activeShift.cashSales || 0) + totals.total },
      })
    }

    // D. Update Customer lifetime spend if phone matches
    if (guestPhone) {
      const phoneDigits = guestPhone.replace(/\D/g, '')
      const customer = await tx.customer.findFirst({
        where: { restaurantId, phone: guestPhone },
      })
      if (customer) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            totalSpend: round2(customer.totalSpend + totals.total),
            lastVisit: now,
          },
        })
      }
    }

    // E. Audit event
    await tx.auditEvent.create({
      data: {
        id: `EV-${now}`,
        restaurantId,
        type: 'settle',
        message: `${invoiceId} settled for ₹${totals.total.toFixed(2)} (${method}) — ${tableId} freed`,
        at: now,
        actor: cashierName,
      },
    })

    return createdInvoice
  })

  broadcastRestaurantEvent(restaurantId, 'invoice:created', invoice)
  broadcastTableEvent(restaurantId, tableId, 'table:freed', { tableId })

  return invoice
}
