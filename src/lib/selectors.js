/* Everything derived is computed here so the reducer stays a single source of
   truth and no page invents its own maths. */

import { computeTotals, discountAmountFor } from './pricing'
import { num, pct, round2, startOfDay } from './format'
import { ROUND_STATUS, TABLE_STATE, isActive } from './orders'
import { VIP_THRESHOLD } from '../data/mockGuests'

export const KITCHEN_STATUSES = [ROUND_STATUS.ACCEPTED, ROUND_STATUS.COOKING]

export function roundsOfTable(orders, tableId) {
  return (orders || []).filter((order) => order.tableId === tableId && order.status !== ROUND_STATUS.VOID)
}

export function openRoundsOfTable(orders, tableId) {
  return roundsOfTable(orders, tableId).filter((order) => isActive(order.status))
}

export function latestRoundOfTable(orders, tableId) {
  const rounds = openRoundsOfTable(orders, tableId)
  return rounds.length ? rounds[rounds.length - 1] : null
}

/** Free -> Reserved -> Occupied -> Billed (billing wins over a reservation). */
export function deriveTableState(table, orders) {
  const open = openRoundsOfTable(orders, table.id)
  if (open.length === 0) return table.reserved ? TABLE_STATE.RESERVED : TABLE_STATE.FREE
  const everythingServed = open.every((order) => order.status === ROUND_STATUS.SERVED)
  return everythingServed ? TABLE_STATE.BILLED : TABLE_STATE.OCCUPIED
}

export function seatedSince(orders, tableId) {
  const open = openRoundsOfTable(orders, tableId)
  if (!open.length) return null
  return Math.min(...open.map((order) => order.createdAt))
}

export function roundProgress(round) {
  return round?.status || null
}

/**
 * Live bill for a table: open rounds -> lines -> money.
 * @param {Array} orders
 * @param {string} tableId
 * @param {null|object} discount manual cashier discount
 */
export function tableBill(orders, tableId, discount = null) {
  const rounds = openRoundsOfTable(orders, tableId)
  const lines = []
  for (const round of rounds) {
    for (const item of round.items || []) {
      lines.push({ ...item, round: round.round, orderId: round.id })
    }
  }
  const totals = computeTotals(lines, discount)
  return {
    rounds,
    lines,
    ...totals,
    roundCount: rounds.length,
    guestName: rounds[0]?.guestName || '',
    guestPhone: rounds[0]?.guestPhone || '',
    seatedAt: rounds.length ? Math.min(...rounds.map((round) => round.createdAt)) : null,
    allServed: rounds.length > 0 && rounds.every((round) => round.status === ROUND_STATUS.SERVED),
    hasUnacknowledged: rounds.some((round) => round.status === ROUND_STATUS.SENT),
  }
}

export function openBills(state) {
  return (state.tables || [])
    .map((table) => ({ table, bill: tableBill(state.orders, table.id) }))
    .filter((entry) => entry.bill.roundCount > 0)
    .sort((a, b) => b.bill.total - a.bill.total)
}

/* -------------------------------------------------------------------- KDS -- */

export function kitchenTickets(orders, station = 'All Stations') {
  return (orders || [])
    .filter((order) => KITCHEN_STATUSES.includes(order.status))
    .map((order) => ({
      ...order,
      stationItems:
        station === 'All Stations'
          ? order.items
          : order.items.filter((item) => item.station === station),
    }))
    .filter((order) => order.stationItems.length > 0)
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** Tickets that have been on the pass longer than `thresholdMin`. */
export function lateMinutes(round, now, threshold = 15) {
  if (!round || !KITCHEN_STATUSES.includes(round.status)) return 0
  const minutes = (now - round.createdAt) / 60000
  return minutes > threshold ? Math.floor(minutes) : 0
}

/* ------------------------------------------------------------ live orders -- */

export function orderQueue(orders) {
  const rank = {
    [ROUND_STATUS.SENT]: 0,
    [ROUND_STATUS.ACCEPTED]: 1,
    [ROUND_STATUS.COOKING]: 2,
    [ROUND_STATUS.READY]: 3,
    [ROUND_STATUS.SERVED]: 4,
  }
  return (orders || [])
    .filter((order) => isActive(order.status) && order.status !== ROUND_STATUS.SERVED)
    .sort((a, b) => {
      const byRank = (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
      if (byRank !== 0) return byRank
      return a.createdAt - b.createdAt
    })
}

export function orderQueueCounts(orders) {
  const queue = openRoundsAll(orders)
  return {
    unacknowledged: queue.filter((order) => order.status === ROUND_STATUS.SENT).length,
    inKitchen: queue.filter((order) => KITCHEN_STATUSES.includes(order.status)).length,
    ready: queue.filter((order) => order.status === ROUND_STATUS.READY).length,
  }
}

function openRoundsAll(orders) {
  return (orders || []).filter((order) => isActive(order.status))
}

/* -------------------------------------------------------------- analytics -- */

export function settledInvoicesOn(invoices, now) {
  const start = startOfDay(now)
  return (invoices || []).filter((invoice) => invoice.settledAt >= start)
}

export function dashboardMetrics(state, now = Date.now()) {
  const start = startOfDay(now)
  const todayInvoices = settledInvoicesOn(state.invoices, now)
  const revenueToday = round2(todayInvoices.reduce((sum, inv) => sum + inv.totals.total, 0))
  const roundsToday = (state.orders || []).filter((order) => order.createdAt >= start && order.status !== ROUND_STATUS.VOID)
  const guestsServedToday = todayInvoices.length
  const avgTicket = guestsServedToday ? round2(revenueToday / guestsServedToday) : 0

  const tableStates = (state.tables || []).map((table) => ({
    table,
    state: deriveTableState(table, state.orders),
  }))
  const occupied = tableStates.filter((entry) => entry.state === TABLE_STATE.OCCUPIED).length
  const billed = tableStates.filter((entry) => entry.state === TABLE_STATE.BILLED).length
  const free = tableStates.filter((entry) => entry.state === TABLE_STATE.FREE).length
  const reserved = tableStates.filter((entry) => entry.state === TABLE_STATE.RESERVED).length
  const seats = (state.tables || []).reduce((sum, table) => sum + num(table.seats), 0)
  const openCovers = (state.tables || [])
    .filter((table) => deriveTableState(table, state.orders) !== TABLE_STATE.FREE)
    .reduce((sum, table) => sum + num(table.seats), 0)

  const expenseTotal = round2((state.expenses || []).reduce((sum, e) => sum + num(e.amount), 0))
  const revenueTotal = round2((state.invoices || []).reduce((sum, inv) => sum + inv.totals.total, 0))

  return {
    revenueToday,
    revenueTotal,
    expenseTotal,
    netProfit: round2(revenueTotal - expenseTotal),
    marginPercent: revenueTotal ? pct(revenueTotal - expenseTotal, revenueTotal, 1) : 0,
    invoiceCountToday: todayInvoices.length,
    roundCountToday: roundsToday.length,
    avgTicket,
    occupied,
    billed,
    free,
    reserved,
    occupancyPercent: seats ? pct(openCovers, seats) : 0,
    tableStates,
    queue: orderQueueCounts(state.orders),
    avgRating: (state.feedback || []).length
      ? round2((state.feedback || []).reduce((sum, f) => sum + num(f.rating), 0) / state.feedback.length)
      : 0,
  }
}

export function topDishes(invoices, limit = 5) {
  const tally = new Map()
  for (const invoice of invoices || []) {
    for (const lineItem of invoice.lines || []) {
      const entry = tally.get(lineItem.name) || { name: lineItem.name, qty: 0, revenue: 0 }
      entry.qty += num(lineItem.qty)
      entry.revenue = round2(entry.revenue + num(lineItem.qty) * num(lineItem.price))
      tally.set(lineItem.name, entry)
    }
  }
  return [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, limit)
}

/** Hourly revenue buckets used by the Overview bar chart. */
export function hourlySales(invoices, now = Date.now(), fromHour = 10, toHour = 23) {
  const start = startOfDay(now)
  const buckets = []
  for (let hour = fromHour; hour <= toHour; hour += 1) {
    const from = start + hour * 3_600_000
    const to = from + 3_600_000
    const value = (invoices || [])
      .filter((invoice) => invoice.settledAt >= from && invoice.settledAt < to)
      .reduce((sum, invoice) => sum + invoice.totals.total, 0)
    buckets.push({
      hour,
      label: `${((hour + 11) % 12) + 1}${hour < 12 ? 'a' : 'p'}`,
      value: round2(value),
    })
  }
  return buckets
}

/* ------------------------------------------------------- cash drawer / P&L -- */

export function cashDrawerSummary(state, now = Date.now()) {
  const shift = state.shift || {}
  const openedAt = shift.openedAt || 0
  const cashSales = round2(
    (state.invoices || [])
      .filter((invoice) => invoice.method === 'Cash' && invoice.settledAt >= openedAt)
      .reduce((sum, invoice) => sum + invoice.totals.total, 0),
  )
  const cashIn = round2(
    (shift.cashTransactions || [])
      .filter((txn) => txn.type === 'in')
      .reduce((sum, txn) => sum + num(txn.amount), 0),
  )
  const cashOut = round2(
    (shift.cashTransactions || [])
      .filter((txn) => txn.type === 'out')
      .reduce((sum, txn) => sum + num(txn.amount), 0),
  )
  const openingFloat = num(shift.openingFloat)
  const expectedCash = round2(openingFloat + cashSales + cashIn - cashOut)
  return {
    isOpen: Boolean(shift.isOpen),
    shift,
    openingFloat,
    cashSales,
    cashIn,
    cashOut,
    cashTransactionCount: (shift.cashTransactions || []).length,
    cashInvoiceCount: (state.invoices || []).filter(
      (invoice) => invoice.method === 'Cash' && invoice.settledAt >= openedAt,
    ).length,
    expectedCash,
    openedAt: shift.openedAt,
    duration: shift.openedAt && shift.isOpen ? now - shift.openedAt : 0,
  }
}

export function varianceOf(expected, counted) {
  return round2(num(counted) - num(expected))
}

/* ------------------------------------------------------------------- CRM -- */

export function guestStats(state, now = Date.now()) {
  const guests = state.guests || []
  const active = guests.filter((guest) => now - guest.lastVisit <= 30 * 86_400_000).length
  const ltv = guests.reduce((sum, guest) => sum + num(guest.totalSpend), 0)
  const visits = guests.reduce((sum, guest) => sum + num(guest.visits), 0)
  return {
    total: guests.length,
    active,
    inactive: guests.length - active,
    ltv: round2(ltv),
    avgSpend: guests.length ? round2(ltv / guests.length) : 0,
    avgVisits: guests.length ? round2(visits / guests.length) : 0,
  }
}

export function segmentGuests(guests, segmentId, now = Date.now()) {
  const list = guests || []
  switch (segmentId) {
    case 'app':
      return list.filter((guest) => guest.source === 'app')
    case 'qr':
      return list.filter((guest) => guest.source === 'qr' || !guest.source)
    case 'inactive':
      return list.filter((guest) => now - guest.lastVisit > 30 * 86_400_000)
    case 'vip':
      return list.filter((guest) => num(guest.totalSpend) >= VIP_THRESHOLD)
    case 'veg':
      return list.filter((guest) => guest.vegOnly)
    case 'regulars':
      return list.filter((guest) => num(guest.visits) >= 4)
    default:
      return list
  }
}

export function segmentSize(guests, segmentId, now = Date.now()) {
  return segmentGuests(guests, segmentId, now).length
}

/* Campaign reach: the segment minus anyone who has opted out of marketing.
   Opted-out guests stay in the guest book and every other view — the campaign
   console is simply the one place they are never written to again. */
export function audienceGuests(guests, segmentId, now = Date.now()) {
  return segmentGuests(guests, segmentId, now).filter((guest) => !guest.optedOut)
}

export function audienceSize(guests, segmentId, now = Date.now()) {
  return audienceGuests(guests, segmentId, now).length
}

export function optedOutCount(guests) {
  return (guests || []).filter((guest) => guest.optedOut).length
}

/* ------------------------------------------------------------- campaigns -- */

export function campaignRates(campaign) {
  const sent = num(campaign?.sent)
  return {
    openRate: pct(campaign?.opened, sent, 1),
    walkInRate: pct(campaign?.walkIns, sent, 1),
    revenuePerMessage: sent ? round2(num(campaign?.revenue) / sent) : 0,
    roas: num(campaign?.spend) > 0 ? round2(num(campaign.revenue) / num(campaign.spend)) : null,
    sent,
    opened: num(campaign?.opened),
    walkIns: num(campaign?.walkIns),
    revenue: num(campaign?.revenue),
  }
}

export function campaignTotals(campaigns) {
  const totals = (campaigns || []).reduce(
    (acc, campaign) => {
      acc.sent += num(campaign.sent)
      acc.opened += num(campaign.opened)
      acc.walkIns += num(campaign.walkIns)
      acc.revenue += num(campaign.revenue)
      return acc
    },
    { sent: 0, opened: 0, walkIns: 0, revenue: 0 },
  )
  return {
    ...totals,
    revenue: round2(totals.revenue),
    openRate: pct(totals.opened, totals.sent, 1),
    walkInRate: pct(totals.walkIns, totals.sent, 1),
  }
}

/* -------------------------------------------------------------- feedback -- */

export function feedbackSummary(feedback) {
  const list = feedback || []
  const count = list.length
  const average = count ? round2(list.reduce((sum, f) => sum + num(f.rating), 0) / count) : 0
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: list.filter((f) => num(f.rating) === star).length,
    percent: count ? pct(list.filter((f) => num(f.rating) === star).length, count, 0) : 0,
  }))
  const pillTally = new Map()
  for (const entry of list) {
    for (const pill of entry.pills || []) {
      pillTally.set(pill, (pillTally.get(pill) || 0) + 1)
    }
  }
  const pills = [...pillTally.entries()]
    .map(([label, tally]) => ({ label, count: tally, percent: count ? pct(tally, count, 0) : 0 }))
    .sort((a, b) => b.count - a.count)
  return { count, average, distribution, pills }
}

/* -------------------------------------------------------------- invoices -- */

export function invoiceMethodTotals(invoices) {
  const methods = ['Cash', 'Card', 'UPI']
  return methods.map((method) => {
    const subset = (invoices || []).filter((invoice) => invoice.method === method)
    return {
      method,
      count: subset.length,
      value: round2(subset.reduce((sum, invoice) => sum + invoice.totals.total, 0)),
    }
  })
}

export function discountLabel(discount) {
  if (!discount || !discount.mode) return 'No discount'
  return discount.label || discount.code || 'Discount'
}

export { discountAmountFor }
