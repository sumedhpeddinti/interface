import { describe, expect, it } from 'vitest'
import { storeReducer } from './StoreContext'
import { buildSeedState } from '../data/seedState'
import { mockMenu } from '../data/mockMenu'
import { audienceGuests, audienceSize, optedOutCount, segmentGuests, tableBill } from '../lib/selectors'

/* Every test drives the real reducer over factory-seeded state so the order
   lifecycle cannot silently regress. */

const withCart = (items = { m01: 2 }) => ({
  ...buildSeedState(),
  cart: { ...buildSeedState().cart, items },
})

const placeOrder = (state, tableId = 'T2') =>
  storeReducer(state, {
    type: 'PLACE_ORDER',
    tableId,
    guestName: 'Test Guest',
    guestPhone: '+91 90000 00001',
    notes: 'no onion',
  })

const roundOf = (state, id) => state.orders.find((order) => order.id === id)
const openFor = (state, tableId) =>
  state.orders.filter((order) => order.tableId === tableId && order.status !== 'paid' && order.status !== 'void')

describe('PLACE_ORDER', () => {
  it('creates a round in the sent state and clears the basket', () => {
    const next = placeOrder(withCart())
    const created = next.orders[next.orders.length - 1]
    expect(created.status).toBe('sent')
    expect(created.round).toBe(1)
    expect(created.items).toHaveLength(1)
    expect(created.items[0].qty).toBe(2)
    expect(next.cart.items).toEqual({})
    expect(next.cart.guest.name).toBe('')
  })

  it('fires a chime, raises an alert and logs an event', () => {
    const next = placeOrder(withCart())
    expect(next.chime.kind).toBe('order')
    expect(next.alerts[0].kind).toBe('order')
    expect(next.alerts[0].tableId).toBe('T2')
    expect(next.events[0].type).toBe('order')
  })

  it('captures the guest into the CRM', () => {
    const next = placeOrder(withCart())
    const guest = next.guests.find((entry) => entry.phone === '+91 90000 00001')
    expect(guest).toBeTruthy()
    expect(guest.name).toBe('Test Guest')
  })

  it('numbers subsequent rounds on the same table', () => {
    const first = placeOrder(withCart())
    const second = placeOrder({ ...first, cart: { ...first.cart, items: { m30: 1 } } })
    expect(openFor(second, 'T2')).toHaveLength(2)
    expect(openFor(second, 'T2')[1].round).toBe(2)
  })

  it('ignores an empty basket', () => {
    const state = withCart({})
    expect(placeOrder(state)).toBe(state)
  })
})

describe('app install reward', () => {
  const installed = () => {
    const base = withCart()
    return { ...base, ui: { ...base.ui, appInstalled: true } }
  }

  it('leaves the bill untouched for a guest who has not installed the app', () => {
    expect(placeOrder(withCart()).billDiscounts.T2).toBeUndefined()
  })

  it('carries the flat 10% onto the table bill once the app is installed', () => {
    const next = placeOrder(installed())
    const discount = next.billDiscounts.T2
    expect(discount.code).toBe('APP10')
    expect(discount.mode).toBe('percent')
    expect(discount.value).toBe(10)

    /* And it is the real thing: the bill the cashier settles is 10% off. */
    const bill = tableBill(next.orders, 'T2', discount)
    expect(bill.discount.code).toBe('APP10')
    expect(bill.discountAmount).toBeGreaterThan(0)
  })

  it('gives the reward with no minimum spend, unlike the welcome offer', () => {
    const base = withCart({ m30: 1 }) /* the cheapest dish, well under ₹500 */
    const billed = tableBill(
      placeOrder({ ...base, ui: { ...base.ui, appInstalled: true } }).orders,
      'T2',
      { mode: 'percent', value: 10, max: null, source: 'install', code: 'APP10' },
    )
    expect(billed.subtotal).toBeLessThan(500)
    expect(billed.discountAmount).toBeGreaterThan(0)
  })

  it('never overwrites a discount the cashier already gave the table', () => {
    const base = installed()
    const withManual = {
      ...base,
      billDiscounts: { T2: { mode: 'flat', value: 100, source: 'manual' } },
    }
    const next = placeOrder(withManual)
    expect(next.billDiscounts.T2).toEqual({ mode: 'flat', value: 100, source: 'manual' })
  })

  it('lets the cashier apply the install code by hand', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'SET_BILL_COUPON',
      tableId: 'T8',
      code: 'APP10',
    })
    expect(next.couponError).toBeNull()
    expect(next.billDiscounts.T8.code).toBe('APP10')
  })
})

describe('order lifecycle transitions', () => {
  it('acknowledges a sent round', () => {
    const state = placeOrder(withCart())
    const id = state.orders[state.orders.length - 1].id
    const next = storeReducer(state, { type: 'ACKNOWLEDGE_ORDER', orderId: id, actor: 'Priya' })
    expect(roundOf(next, id).status).toBe('accepted')
    expect(roundOf(next, id).acknowledgedAt).toBeTruthy()
  })

  it('refuses an illegal transition from paid', () => {
    const state = placeOrder(withCart())
    const id = state.orders[state.orders.length - 1].id
    const paid = {
      ...state,
      orders: state.orders.map((order) => (order.id === id ? { ...order, status: 'paid' } : order)),
    }
    const next = storeReducer(paid, { type: 'ACKNOWLEDGE_ORDER', orderId: id, actor: 'Priya' })
    expect(next).toBe(paid)
  })

  it('moves to cooking on the first ticked item', () => {
    const state = placeOrder(withCart({ m01: 1, m30: 1 }))
    const id = state.orders[state.orders.length - 1].id
    const acked = storeReducer(state, { type: 'ACKNOWLEDGE_ORDER', orderId: id })
    const next = storeReducer(acked, { type: 'TOGGLE_ITEM_READY', orderId: id, itemId: 'm01' })
    expect(roundOf(next, id).status).toBe('cooking')
    expect(roundOf(next, id).readyItemIds).toEqual(['m01'])
  })

  it('auto-readies once every item is ticked', () => {
    const state = placeOrder(withCart({ m01: 1, m30: 1 }))
    const id = state.orders[state.orders.length - 1].id
    let next = storeReducer(state, { type: 'ACKNOWLEDGE_ORDER', orderId: id })
    next = storeReducer(next, { type: 'TOGGLE_ITEM_READY', orderId: id, itemId: 'm01' })
    next = storeReducer(next, { type: 'TOGGLE_ITEM_READY', orderId: id, itemId: 'm30' })
    expect(roundOf(next, id).status).toBe('ready')
  })

  it('bumps a ticket and pushes a kitchen notification to the guest', () => {
    const state = placeOrder(withCart())
    const id = state.orders[state.orders.length - 1].id
    const acked = storeReducer(state, { type: 'ACKNOWLEDGE_ORDER', orderId: id })
    const next = storeReducer(acked, { type: 'BUMP_TICKET', orderId: id, actor: 'Rakesh' })
    expect(roundOf(next, id).status).toBe('ready')
    expect(next.pushNotifications[0].kind).toBe('kitchen')
    expect(next.chime.kind).toBe('ready')
  })

  it('serves then settles into a paid round', () => {
    const state = placeOrder(withCart())
    const id = state.orders[state.orders.length - 1].id
    let next = storeReducer(state, { type: 'ACKNOWLEDGE_ORDER', orderId: id })
    next = storeReducer(next, { type: 'BUMP_TICKET', orderId: id })
    next = storeReducer(next, { type: 'SERVE_ORDER', orderId: id })
    expect(roundOf(next, id).status).toBe('served')
  })
})

describe('CALL_WAITER', () => {
  it('raises a waiter alert with a chime', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'CALL_WAITER',
      tableId: 'T7',
      request: 'Water',
      note: '',
    })
    expect(next.alerts[0].kind).toBe('waiter')
    expect(next.alerts[0].title).toMatch(/T7/)
    expect(next.chime.kind).toBe('waiter')
    expect(next.events[0].type).toBe('waiter')
  })

  it('resolves an alert', () => {
    const raised = storeReducer(buildSeedState(), {
      type: 'CALL_WAITER',
      tableId: 'T7',
      request: 'Cutlery',
    })
    const next = storeReducer(raised, {
      type: 'RESOLVE_ALERT',
      alertId: raised.alerts[0].id,
      actor: 'Priya',
    })
    expect(next.alerts[0].resolved).toBe(true)
  })
})

describe('SETTLE_BILL', () => {
  const settle = (state, tableId = 'T8', method = 'Cash') =>
    storeReducer(state, {
      type: 'SETTLE_BILL',
      tableId,
      method,
      tendered: 1000,
      cashierName: 'Priya Nair',
    })

  it('issues a GST invoice and marks every round paid', () => {
    const state = buildSeedState()
    const next = settle(state)
    const invoice = next.invoices[0]
    expect(invoice.id).toBe('INV/26-27/0004')
    expect(invoice.totals.total).toBeGreaterThan(0)
    expect(invoice.totals.tax).toBeCloseTo(invoice.totals.taxable * 0.05, 2)
    expect(openFor(next, 'T8')).toHaveLength(0)
    expect(next.orders.filter((order) => order.tableId === 'T8').every((o) => o.status === 'paid')).toBe(true)
  })

  it('frees the table and prompts the guest for a review', () => {
    const next = settle(buildSeedState())
    expect(next.feedbackPrompt.tableId).toBe('T8')
    expect(next.feedbackPrompt.invoiceId).toBe('INV/26-27/0004')
  })

  it('credits the guest loyalty record', () => {
    const state = buildSeedState()
    const before = state.guests.find((guest) => guest.phone === '+91 91234 55667')
    const next = settle(state)
    const after = next.guests.find((guest) => guest.phone === '+91 91234 55667')
    expect(after.visits).toBe(before.visits + 1)
    expect(after.totalSpend).toBeGreaterThan(before.totalSpend)
  })

  it('records the payment method for the drawer', () => {
    const next = settle(buildSeedState(), 'T8', 'Cash')
    expect(next.invoices[0].method).toBe('Cash')
  })

  it('does nothing for a table with no open rounds', () => {
    const state = buildSeedState()
    expect(settle(state, 'T11')).toBe(state)
  })
})

describe('cash drawer and shifts', () => {
  it('logs a cash movement', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'CASH_TXN',
      txnType: 'out',
      amount: 150,
      reason: 'Ice',
      by: 'Priya',
    })
    expect(next.shift.cashTransactions[0].amount).toBe(150)
    expect(next.shift.cashTransactions[0].type).toBe('out')
  })

  it('closes the shift and archives the reconciliation', () => {
    const state = buildSeedState()
    const next = storeReducer(state, {
      type: 'CLOSE_SHIFT',
      countedCash: 9999,
      notes: 'test close',
      by: 'Priya',
    })
    expect(next.shift.isOpen).toBe(false)
    expect(next.shift.closedShifts[0].countedCash).toBe(9999)
    expect(next.shift.closedShifts[0].variance).toBeCloseTo(9999 - next.lastClosedShift.expectedCash, 2)
  })

  it('opens a fresh shift with a float', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'OPEN_SHIFT',
      openingFloat: 4000,
      by: 'Priya',
    })
    expect(next.shift.isOpen).toBe(true)
    expect(next.shift.openingFloat).toBe(4000)
    expect(next.shift.cashTransactions).toEqual([])
  })
})

describe('campaigns', () => {
  it('sends immediately, pushes a guest notification and starts delivery', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'SEND_CAMPAIGN',
      channel: 'push',
      heading: 'Flash sale',
      body: 'Come in today',
      coupon: 'FLAT50',
      audience: 'all',
      audienceLabel: 'All guests',
      audienceSize: 14,
    })
    const campaign = next.campaigns[0]
    expect(campaign.status).toBe('sending')
    expect(campaign.sent).toBe(14)
    expect(next.pushNotifications[0].kind).toBe('campaign')
    expect(next.pushNotifications[0].coupon).toBe('FLAT50')
    expect(next.chime.kind).toBe('broadcast')
  })

  it('gives every campaign its own id, even when a guest push is raised too', () => {
    let state = buildSeedState()
    const base = buildSeedState().seq.campaign
    for (let index = 0; index < 4; index += 1) {
      state = storeReducer(state, {
        type: 'SEND_CAMPAIGN',
        channel: 'push',
        heading: `Campaign ${index}`,
        body: 'Body copy',
        audience: 'all',
        audienceLabel: 'All guests',
        audienceSize: 5,
      })
    }
    const ids = state.campaigns.map((campaign) => campaign.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(state.seq.campaign).toBe(base + 4)
    const pushIds = state.pushNotifications.map((push) => push.id)
    expect(new Set(pushIds).size).toBe(pushIds.length)
  })

  it('advances through simulated delivery to completion', () => {
    const sent = storeReducer(buildSeedState(), {
      type: 'SEND_CAMPAIGN',
      channel: 'whatsapp',
      heading: 'Flash sale',
      body: 'Come in today',
      audience: 'all',
      audienceLabel: 'All guests',
      audienceSize: 100,
    })
    const stageOne = storeReducer(sent, { type: 'ADVANCE_CAMPAIGN', id: sent.campaigns[0].id })
    expect(stageOne.campaigns[0].opened).toBe(67)
    expect(stageOne.campaigns[0].status).toBe('sending')
    const stageTwo = storeReducer(stageOne, { type: 'ADVANCE_CAMPAIGN', id: sent.campaigns[0].id })
    expect(stageTwo.campaigns[0].status).toBe('completed')
    expect(stageTwo.campaigns[0].walkIns).toBe(25)
    expect(stageTwo.campaigns[0].revenue).toBeGreaterThan(0)
  })

  it('schedules instead of sending when a time is supplied', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'SEND_CAMPAIGN',
      channel: 'push',
      heading: 'Later',
      body: 'Scheduled message',
      audience: 'vip',
      audienceLabel: 'Top Spenders (VIP)',
      audienceSize: 7,
      scheduleAt: Date.now() + 3600000,
    })
    expect(next.campaigns[0].status).toBe('scheduled')
    expect(next.campaigns[0].sent).toBe(0)
    expect(next.pushNotifications).toHaveLength(0)
  })
})

describe('marketing opt-out', () => {
  it('seeds opted-out guests without hiding them from the guest book', () => {
    const { guests } = buildSeedState()
    expect(optedOutCount(guests)).toBeGreaterThan(0)
    expect(guests.length).toBeGreaterThanOrEqual(14)
  })

  it('drops opted-out guests from campaign reach but not from the segment', () => {
    const { guests } = buildSeedState()
    const segmentAll = segmentGuests(guests, 'all')
    const audienceAll = audienceGuests(guests, 'all')
    expect(audienceAll.length).toBe(segmentAll.length - optedOutCount(guests))
    expect(audienceAll.every((guest) => !guest.optedOut)).toBe(true)
    expect(audienceSize(guests, 'all')).toBe(audienceAll.length)
  })

  it('excludes opted-out guests from every named segment', () => {
    const { guests } = buildSeedState()
    for (const id of ['all', 'inactive', 'vip', 'veg', 'regulars']) {
      expect(audienceGuests(guests, id).every((guest) => !guest.optedOut)).toBe(true)
    }
  })

  it('honours an opt-out through the reducer and logs it', () => {
    const state = buildSeedState()
    const target = state.guests.find((guest) => !guest.optedOut)
    const next = storeReducer(state, { type: 'SET_GUEST_OPT_OUT', id: target.id, value: true })
    expect(next.guests.find((guest) => guest.id === target.id).optedOut).toBe(true)
    expect(audienceGuests(next.guests, 'all').some((guest) => guest.id === target.id)).toBe(false)
    expect(next.events[0].type).toBe('marketing')
  })

  it('lets a guest opt back in', () => {
    const state = buildSeedState()
    const target = state.guests.find((guest) => guest.optedOut)
    const out = storeReducer(state, { type: 'SET_GUEST_OPT_OUT', id: target.id, value: true })
    const back = storeReducer(out, { type: 'SET_GUEST_OPT_OUT', id: target.id, value: false })
    expect(back.guests.find((guest) => guest.id === target.id).optedOut).toBe(false)
    expect(optedOutCount(back.guests)).toBe(optedOutCount(state.guests) - 1)
    expect(audienceGuests(back.guests, 'all').some((guest) => guest.id === target.id)).toBe(true)
  })

  it('defaults guests captured from a new order to opted in', () => {
    const next = placeOrder(withCart())
    const guest = next.guests.find((entry) => entry.phone === '+91 90000 00001')
    expect(guest.optedOut).toBe(false)
  })
})

/* Every action the store exposes, driven against the seeded restaurant. This
   is the reducer's contract: handled actions return a complete state, unknown
   ones are ignored, and nothing mutates what it was given. */
describe('reducer totality', () => {
  const CORE_KEYS = Object.keys(buildSeedState())

  const payloads = () => {
    const seed = buildSeedState()
    const openRound = seed.orders.find((order) => order.status === 'sent') || seed.orders[0]
    return {
      orderId: openRound.id,
      itemId: openRound.items[0].id,
      alertId: seed.alerts[0]?.id,
      campaignId: seed.campaigns[0]?.id,
      tableId: 'T1',
    }
  }

  const cases = () => {
    const { orderId, itemId, alertId, campaignId, tableId } = payloads()
    return [
      ['LOCK_SESSION', {}],
      ['UNLOCK_SESSION', {}],
      ['SET_SESSION', { staffId: 's03' }],
      ['ADD_STAFF', { name: 'Test Chef', role: 'Kitchen', pin: '9999', title: 'Grill' }],
      ['UPDATE_STAFF', { id: 's03', patch: { title: 'Grill Chef' } }],
      ['CART_ADD', { item: mockMenu[0] }],
      ['CART_SET_QTY', { id: mockMenu[0].id, qty: 3 }],
      ['CART_CLEAR', {}],
      ['CART_GUEST', { patch: { name: 'Guest' } }],
      ['CART_TOGGLE', { open: true }],
      ['CART_DISMISS_BANNER', {}],
      ['PLACE_ORDER', { tableId: 'T3', guestName: 'Ana', guestPhone: '+91 90000 00009', notes: '' }],
      ['ADD_ROUND', { tableId, lines: [{ id: mockMenu[0].id, qty: 1 }], actor: 'Manager' }],
      ['ACKNOWLEDGE_ORDER', { id: orderId }],
      ['START_COOKING', { id: orderId }],
      ['TOGGLE_ITEM_READY', { id: orderId, itemId }],
      ['BUMP_TICKET', { id: orderId }],
      ['SERVE_ORDER', { id: orderId }],
      ['VOID_ORDER', { id: orderId }],
      ['CALL_WAITER', { tableId, request: 'Water', note: '' }],
      ['RESOLVE_ALERT', { id: alertId }],
      ['CLEAR_RESOLVED_ALERTS', {}],
      ['SET_BILL_DISCOUNT', { tableId, discount: { mode: 'flat', value: 20 } }],
      ['SET_BILL_COUPON', { tableId, code: 'FLAT50' }],
      ['PARK_BILL', { tableId }],
      ['TRANSFER_TABLE', { from: tableId, to: 'T4' }],
      ['SETTLE_BILL', { tableId, method: 'Cash', tendered: 2000 }],
      ['SET_GUEST_TABLE', { tableId: 'T6' }],
      ['SET_UI', { patch: { kitchenStation: 'Hot Kitchen' } }],
      ['SET_SETTING', { patch: { storeOpen: false } }],
      ['DISMISS_FEEDBACK_PROMPT', {}],
      ['ADD_FEEDBACK', { rating: 5, pills: ['Delicious Food'], comment: 'Great', tableId, guestName: 'Ana' }],
      ['PUSH_NOTIFICATION', { notification: { kind: 'campaign', title: 'Hi', body: 'There' } }],
      ['DISMISS_PUSH', { id: 'PSH-0001' }],
      ['CLEAR_PUSHES', {}],
      ['SEND_CAMPAIGN', { channel: 'push', heading: 'H', body: 'B', audience: 'all', audienceLabel: 'All Guests', audienceSize: 3 }],
      ['ADVANCE_CAMPAIGN', { id: campaignId }],
      ['DELETE_CAMPAIGN', { id: campaignId }],
      ['SET_TABLE_RESERVED', { tableId: 'T9', reserved: true }],
      ['ADD_TABLE', { table: { id: 'T13', section: 'Patio', seats: 4, x: 12, y: 40 } }],
      ['ADD_MENU_ITEM', { item: { ...mockMenu[0], id: 'm99', name: 'Test Dish' } }],
      ['UPDATE_MENU_ITEM', { id: mockMenu[0].id, patch: { price: 1 } }],
      ['DELETE_MENU_ITEM', { id: 'm99' }],
      ['OPEN_SHIFT', { openingFloat: 1000, staffName: 'Priya Nair' }],
      ['CASH_TXN', { type: 'in', amount: 100, note: 'petty cash' }],
      ['CLOSE_SHIFT', { countedCash: 5000, staffName: 'Priya Nair' }],
      ['ADD_EXPENSE', { category: 'Rent', amount: 100, note: 'sept', date: Date.now() }],
      ['DELETE_EXPENSE', { id: 'EXP-0001' }],
      ['UPSERT_GUEST', { patch: { name: 'New Guest', phone: '+91 90000 11111' } }],
      ['DELETE_GUEST', { id: 'g01' }],
      ['SET_GUEST_OPT_OUT', { id: 'g01', value: true }],
      ['HYDRATE', { state: buildSeedState() }],
      ['RESET_DEMO', {}],
    ]
  }

  it('declares a payload for every action the reducer handles', () => {
    const handled = cases().map(([type]) => type)
    expect(new Set(handled).size).toBe(handled.length)
    expect(handled.length).toBe(53)
  })

  it.each(cases())('%s returns a complete state', (type, payload) => {
    const state = buildSeedState()
    const next = storeReducer(state, { type, ...payload })
    expect(next).toBeTruthy()
    expect(typeof next).toBe('object')
    for (const key of CORE_KEYS) {
      expect(next).toHaveProperty(key)
    }
  })

  it.each(cases())('%s never mutates the state it was given', (type, payload) => {
    const state = buildSeedState()
    const snapshot = JSON.stringify(state)
    storeReducer(state, { type, ...payload })
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('ignores an action it does not recognise', () => {
    const state = buildSeedState()
    expect(storeReducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state)
  })

  it('survives a malformed payload instead of crashing the store', () => {
    const state = buildSeedState()
    expect(() => storeReducer(state, { type: 'ADD_TABLE' })).not.toThrow()
    expect(storeReducer(state, { type: 'ADD_TABLE' }).tables).toHaveLength(state.tables.length + 1)
  })

  it('keeps the state serialisable after every action', () => {
    for (const [type, payload] of cases()) {
      const next = storeReducer(buildSeedState(), { type, ...payload })
      expect(() => JSON.stringify(next)).not.toThrow()
    }
  })
})

describe('feedback, menu and admin', () => {
  it('files guest feedback and clears the prompt', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'ADD_FEEDBACK',
      rating: 5,
      pills: ['Fast Service'],
      comment: 'Great',
      guestName: 'Arjun',
      tableId: 'T1',
    })
    expect(next.feedback[0].rating).toBe(5)
    expect(next.feedbackPrompt).toBeNull()
    expect(next.events[0].type).toBe('feedback')
  })

  it('adds and updates a dish', () => {
    const added = storeReducer(buildSeedState(), {
      type: 'ADD_MENU_ITEM',
      item: { name: 'Test Curry', price: 199, category: 'Main Course', station: 'Hot Kitchen' },
    })
    expect(added.menu[0].name).toBe('Test Curry')
    const updated = storeReducer(added, {
      type: 'UPDATE_MENU_ITEM',
      id: added.menu[0].id,
      patch: { price: 249 },
    })
    expect(updated.menu[0].price).toBe(249)
  })

  it('adds a staff account with a unique PIN', () => {
    const state = buildSeedState()
    const added = storeReducer(state, {
      type: 'ADD_STAFF',
      name: 'New Chef',
      role: 'Kitchen',
      pin: '9876',
    })
    expect(added.staff).toHaveLength(state.staff.length + 1)
    const duplicate = storeReducer(added, {
      type: 'ADD_STAFF',
      name: 'Clashing',
      role: 'Kitchen',
      pin: '9876',
    })
    expect(duplicate.staff).toHaveLength(added.staff.length)
  })

  it('logs an expense', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'ADD_EXPENSE',
      category: 'Utilities',
      amount: 1200,
      note: 'Water tanker',
      by: 'Vinit',
    })
    expect(next.expenses[0].amount).toBe(1200)
  })

  it('locks and unlocks the session', () => {
    const locked = storeReducer(buildSeedState(), { type: 'LOCK_SESSION' })
    expect(locked.session.locked).toBe(true)
    const unlocked = storeReducer(locked, { type: 'SET_SESSION', staffId: 's03' })
    expect(unlocked.session.locked).toBe(false)
    expect(unlocked.session.staffId).toBe('s03')
  })

  it('transfers every open round to another table and renumbers', () => {
    const next = storeReducer(buildSeedState(), {
      type: 'TRANSFER_TABLE',
      fromTableId: 'T8',
      toTableId: 'T9',
    })
    expect(next.orders.filter((order) => order.tableId === 'T8')).toHaveLength(0)
    expect(next.orders.filter((order) => order.tableId === 'T9')).toHaveLength(1)
    expect(next.orders.find((order) => order.tableId === 'T9').round).toBe(1)
  })

  it('resets to clean state', () => {
    const dirty = placeOrder(withCart())
    expect(dirty.orders.length).toBe(buildSeedState().orders.length + 1)
    const reset = storeReducer(dirty, { type: 'RESET_DEMO' })
    expect(reset.orders.length).toBe(0)
  })
})
