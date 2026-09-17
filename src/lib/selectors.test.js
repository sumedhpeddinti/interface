import { describe, expect, it } from 'vitest'
import { buildSeedState } from '../data/seedState'
import { ROUND_STATUS, TABLE_STATE } from './orders'
import {
  audienceGuests,
  audienceSize,
  campaignRates,
  campaignTotals,
  cashDrawerSummary,
  dashboardMetrics,
  deriveTableState,
  discountLabel,
  feedbackSummary,
  guestStats,
  hourlySales,
  invoiceMethodTotals,
  kitchenTickets,
  lateMinutes,
  latestRoundOfTable,
  openBills,
  openRoundsOfTable,
  optedOutCount,
  orderQueue,
  orderQueueCounts,
  roundProgress,
  roundsOfTable,
  seatedSince,
  segmentGuests,
  segmentSize,
  settledInvoicesOn,
  tableBill,
  topDishes,
  varianceOf,
} from './selectors'

/* Every derived number the screens show comes from here, so this suite drives
   the real seeded restaurant rather than toy fixtures. */

const now = Date.now()
const seed = () => buildSeedState(now)

describe('table views', () => {
  it('groups rounds by table and separates the open ones', () => {
    const state = seed()
    const all = roundsOfTable(state.orders, 'T1')
    const open = openRoundsOfTable(state.orders, 'T1')
    expect(all.length).toBeGreaterThan(0)
    expect(open.length).toBeLessThanOrEqual(all.length)
    expect(open.every((round) => round.status !== 'paid' && round.status !== 'void')).toBe(true)
    expect(latestRoundOfTable(state.orders, 'T1')).toBe(all[all.length - 1])
  })

  it('returns nothing for a table with no orders', () => {
    const state = seed()
    expect(roundsOfTable(state.orders, 'T9')).toEqual([])
    expect(latestRoundOfTable(state.orders, 'T9')).toBeNull()
    expect(tableBill(state.orders, 'T9').total).toBe(0)
  })

  it('derives Free, Occupied, Billed and Reserved from orders', () => {
    const state = seed()
    const t1 = state.tables.find((table) => table.id === 'T1')
    const t10 = state.tables.find((table) => table.id === 'T10')
    expect([TABLE_STATE.OCCUPIED, TABLE_STATE.BILLED]).toContain(deriveTableState(t1, state.orders))
    expect(deriveTableState(t10, state.orders)).toBe(TABLE_STATE.RESERVED)
    expect(deriveTableState({ id: 'T9', reserved: false }, state.orders)).toBe(TABLE_STATE.FREE)
  })

  it('reports when a table was seated', () => {
    const state = seed()
    expect(seatedSince(state.orders, 'T1')).toBeGreaterThan(0)
    expect(seatedSince(state.orders, 'T9')).toBeNull()
  })

  it('totals the whole bill across rounds, discount and GST', () => {
    const state = seed()
    const bill = tableBill(state.orders, 'T1')
    expect(bill.roundCount).toBeGreaterThan(0)
    expect(bill.rounds).toHaveLength(bill.roundCount)
    expect(bill.lines.length).toBeGreaterThan(0)
    expect(bill.subtotal).toBeGreaterThan(0)
    expect(bill.total).toBeCloseTo(bill.taxable + bill.tax, 2)
    expect(bill.guestName).toBeTruthy()
    expect(bill.seatedAt).toBeGreaterThan(0)
  })

  it('lets a manual cashier discount replace the automatic welcome offer', () => {
    const state = seed()
    const welcome = tableBill(state.orders, 'T1')
    /* A bigger manual discount must come off the bill… */
    const generous = tableBill(state.orders, 'T1', { mode: 'flat', value: 150 })
    expect(generous.total).toBeLessThan(welcome.total)
    /* …and a smaller one replaces the welcome offer rather than stacking. */
    const stingy = tableBill(state.orders, 'T1', { mode: 'flat', value: 50 })
    expect(stingy.total).toBeGreaterThan(welcome.total)
    expect(stingy.discount.source).toBe('manual')
  })

  it('lists every open bill on the floor, richest first', () => {
    const state = seed()
    const bills = openBills(state)
    expect(bills.length).toBeGreaterThan(0)
    expect(bills.every((entry) => entry.bill.roundCount > 0)).toBe(true)
    for (let i = 1; i < bills.length; i += 1) {
      expect(bills[i - 1].bill.total).toBeGreaterThanOrEqual(bills[i].bill.total)
    }
  })

  it('reports the live stage of a round', () => {
    const state = seed()
    const round = roundsOfTable(state.orders, 'T1')[0]
    expect(['sent', 'accepted', 'cooking', 'ready', 'served']).toContain(roundProgress(round))
    expect(roundProgress({})).toBeNull()
    expect(roundProgress(null)).toBeNull()
  })
})

describe('kitchen and order queue', () => {
  it('filters tickets by station and tags each item with its station', () => {
    const state = seed()
    const all = kitchenTickets(state.orders)
    expect(all.length).toBeGreaterThan(0)
    for (const station of ['Hot Kitchen', 'Cold / Salads', 'Bar / Beverages']) {
      const filtered = kitchenTickets(state.orders, station)
      expect(filtered.every((ticket) => ticket.stationItems.length > 0)).toBe(true)
      expect(filtered.length).toBeLessThanOrEqual(all.length)
    }
    expect(kitchenTickets(state.orders).length).toBe(all.length)
  })

  it('counts minutes on the pass and only flags the late ones', () => {
    const state = seed()
    const round = { status: ROUND_STATUS.COOKING, createdAt: now - 20 * 60_000, items: [] }
    expect(lateMinutes(round, now)).toBe(20)
    expect(lateMinutes({ status: ROUND_STATUS.READY, createdAt: now - 20 * 60_000 }, now)).toBe(0)
    expect(lateMinutes(round, now, 30)).toBe(0)
  })

  it('splits the live queue into the three KPI buckets', () => {
    const state = seed()
    const counts = orderQueueCounts(state.orders)
    const queue = orderQueue(state.orders)
    expect(counts.unacknowledged + counts.inKitchen + counts.ready).toBeLessThanOrEqual(queue.length)
    expect(queue.every((order) => order.status !== 'paid' && order.status !== 'void')).toBe(true)
  })
})

describe('dashboard metrics', () => {
  it('reports revenue, expenses, profit and margin consistently', () => {
    const state = seed()
    const metrics = dashboardMetrics(state, now)
    expect(metrics.revenueTotal).toBeGreaterThan(0)
    expect(metrics.expenseTotal).toBeGreaterThan(0)
    expect(metrics.netProfit).toBeCloseTo(metrics.revenueTotal - metrics.expenseTotal, 2)
    expect(metrics.marginPercent).toBeCloseTo(
      ((metrics.revenueTotal - metrics.expenseTotal) / metrics.revenueTotal) * 100,
      1,
    )
    expect(metrics.revenueToday).toBeLessThanOrEqual(metrics.revenueTotal)
  })

  it('counts the floor exactly once across its four states', () => {
    const state = seed()
    const metrics = dashboardMetrics(state, now)
    expect(metrics.occupied + metrics.billed + metrics.free + metrics.reserved).toBe(
      state.tables.length,
    )
    expect(metrics.tableStates).toHaveLength(state.tables.length)
    expect(metrics.occupancyPercent).toBeGreaterThanOrEqual(0)
    expect(metrics.occupancyPercent).toBeLessThanOrEqual(100)
  })

  it('derives today-only numbers from the settled invoices', () => {
    const state = seed()
    const metrics = dashboardMetrics(state, now)
    expect(metrics.invoiceCountToday).toBe(settledInvoicesOn(state.invoices, now).length)
    expect(metrics.avgTicket).toBeCloseTo(
      metrics.invoiceCountToday ? metrics.revenueToday / metrics.invoiceCountToday : 0,
      2,
    )
  })

  it('buckets today into hourly sales', () => {
    const state = seed()
    const buckets = hourlySales(state.invoices, now)
    expect(buckets).toHaveLength(14)
    expect(buckets[0].hour).toBe(10)
    expect(buckets[buckets.length - 1].hour).toBe(23)
    expect(buckets.every((bucket) => bucket.value >= 0)).toBe(true)
  })

  it('ranks the best selling dishes by quantity', () => {
    const state = seed()
    const dishes = topDishes(state.invoices, 3)
    expect(dishes.length).toBeLessThanOrEqual(3)
    for (let i = 1; i < dishes.length; i += 1) {
      expect(dishes[i - 1].qty).toBeGreaterThanOrEqual(dishes[i].qty)
    }
  })
})

describe('cash drawer', () => {
  it('adds float, cash sales and cash in, minus cash out', () => {
    const state = seed()
    const drawer = cashDrawerSummary(state, now)
    expect(drawer.isOpen).toBe(true)
    expect(drawer.openingFloat).toBe(5000)
    expect(drawer.expectedCash).toBeCloseTo(
      drawer.openingFloat + drawer.cashSales + drawer.cashIn - drawer.cashOut,
      2,
    )
    expect(drawer.duration).toBeGreaterThan(0)
  })

  it('signs the variance of a counted drawer', () => {
    expect(varianceOf(1000, 950)).toBe(-50)
    expect(varianceOf(1000, 1050)).toBe(50)
    expect(varianceOf(1000, 1000)).toBe(0)
  })
})

describe('CRM and campaigns', () => {
  it('summarises the guest book', () => {
    const state = seed()
    const stats = guestStats(state, now)
    expect(stats.total).toBe(state.guests.length)
    expect(stats.active + stats.inactive).toBe(stats.total)
    expect(stats.avgSpend).toBeCloseTo(stats.ltv / stats.total, 2)
  })

  it('measures each segment and deducts the opt-outs from reach', () => {
    const { guests } = seed()
    const optedOut = optedOutCount(guests)
    expect(optedOut).toBeGreaterThan(0)
    for (const id of ['all', 'inactive', 'vip', 'veg', 'regulars']) {
      expect(segmentSize(guests, id)).toBeGreaterThanOrEqual(audienceSize(guests, id))
      expect(audienceGuests(guests, id).every((guest) => !guest.optedOut)).toBe(true)
    }
    expect(segmentSize(guests, 'all') - audienceSize(guests, 'all')).toBe(optedOut)
  })

  it('derives campaign rates from the sent count', () => {
    const campaign = { sent: 1248, opened: 842, walkIns: 312, revenue: 48750, spend: 0 }
    const rates = campaignRates(campaign)
    /* The reference deck reads 67% and 25%, not 67.47% and 25%. */
    expect(rates.openRate).toBe(67.5)
    expect(rates.walkInRate).toBe(25)
    expect(rates.sent).toBe(1248)
    expect(rates.revenuePerMessage).toBeGreaterThan(0)
    expect(rates.roas).toBeNull()
  })

  it('reports return on spend when there is a spend', () => {
    const rates = campaignRates({ sent: 100, revenue: 1200, spend: 300 })
    expect(rates.roas).toBe(4)
  })

  it('handles a campaign that has not been sent yet', () => {
    const rates = campaignRates({ sent: 0 })
    expect(rates.openRate).toBe(0)
    expect(rates.revenuePerMessage).toBe(0)
    expect(campaignRates(null).sent).toBe(0)
  })

  it('totals the campaign book', () => {
    const state = seed()
    const totals = campaignTotals(state.campaigns)
    const expectedSent = state.campaigns.reduce((sum, campaign) => sum + campaign.sent, 0)
    expect(totals.sent).toBe(expectedSent)
    expect(totals.revenue).toBeGreaterThan(0)
    expect(totals.openRate).toBeLessThanOrEqual(100)
    expect(campaignTotals([]).sent).toBe(0)
  })
})

describe('invoices, feedback and discounts', () => {
  it('totals takings per payment method', () => {
    const state = seed()
    const byMethod = invoiceMethodTotals(state.invoices)
    expect(byMethod.map((entry) => entry.method)).toEqual(['Cash', 'Card', 'UPI'])
    for (const entry of byMethod) {
      const subset = state.invoices.filter((invoice) => invoice.method === entry.method)
      expect(entry.count).toBe(subset.length)
      expect(entry.value).toBeCloseTo(
        subset.reduce((total, invoice) => total + invoice.totals.total, 0),
        2,
      )
    }
  })

  it('summarises guest feedback', () => {
    const state = seed()
    const summary = feedbackSummary(state.feedback)
    expect(summary.count).toBe(state.feedback.length)
    if (summary.count > 0) {
      expect(summary.average).toBeGreaterThan(0)
      expect(summary.average).toBeLessThanOrEqual(5)
    }
    expect(feedbackSummary([]).average).toBe(0)
  })

  it('describes a discount for the invoice line', () => {
    expect(discountLabel({ mode: 'percent', value: 10, label: 'WELCOME10' })).toBe('WELCOME10')
    expect(discountLabel({ mode: 'percent', value: 10, code: 'FLAT50' })).toBe('FLAT50')
    expect(discountLabel({ mode: 'flat', value: 100 })).toBe('Discount')
    expect(discountLabel(null)).toBe('No discount')
    expect(discountLabel({})).toBe('No discount')
  })
})
