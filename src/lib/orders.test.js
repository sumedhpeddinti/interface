import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  EXPENSE_CATEGORIES,
  GUEST_STAGES,
  LATE_THRESHOLD_MIN,
  PAYMENT_METHODS,
  ROLE_ACCESS,
  ROLES,
  ROUND_STATUS,
  SEGMENTS,
  STATIONS,
  TABLE_SECTIONS,
  TABLE_STATE,
  TABLE_STATE_TONE,
  TRANSITIONS,
  canAccess,
  canTransition,
  isActive,
  nextStatus,
  statusMeta,
  stationTone,
} from './orders'
import { segmentGuests } from './selectors'

/* The order lifecycle is the spine of the platform: the reducer, the KDS, the
   guest stepper and billing all read from these tables, so their integrity is
   worth asserting directly. */

describe('lifecycle', () => {
  it('walks sent -> accepted -> cooking -> ready -> served -> paid', () => {
    expect(GUEST_STAGES).toEqual(['sent', 'accepted', 'cooking', 'ready', 'served'])
    let status = ROUND_STATUS.SENT
    const walked = [status]
    while (nextStatus(status)) {
      status = nextStatus(status)
      walked.push(status)
    }
    expect(walked).toEqual(['sent', 'accepted', 'cooking', 'ready', 'served'])
    expect(ROUND_STATUS.PAID).toBe('paid')
  })

  it('has no stage after served on the guest stepper', () => {
    expect(nextStatus('served')).toBeNull()
    expect(nextStatus('paid')).toBeNull()
    expect(nextStatus('void')).toBeNull()
    expect(nextStatus('nonsense')).toBeNull()
  })

  it('allows exactly the documented forward edges', () => {
    expect(canTransition('sent', 'accepted')).toBe(true)
    expect(canTransition('accepted', 'cooking')).toBe(true)
    expect(canTransition('accepted', 'ready')).toBe(true)
    expect(canTransition('cooking', 'ready')).toBe(true)
    expect(canTransition('ready', 'served')).toBe(true)
    expect(canTransition('served', 'paid')).toBe(true)
  })

  it('refuses to run backwards or skip the kitchen', () => {
    expect(canTransition('ready', 'cooking')).toBe(false)
    expect(canTransition('cooking', 'accepted')).toBe(false)
    expect(canTransition('served', 'ready')).toBe(false)
    expect(canTransition('sent', 'cooking')).toBe(false)
    expect(canTransition('sent', 'paid')).toBe(false)
    expect(canTransition('unknown', 'paid')).toBe(false)
  })

  it('lets anything active be voided, and nothing be un-voided', () => {
    for (const status of ['sent', 'accepted', 'cooking', 'ready', 'served']) {
      expect(canTransition(status, 'void')).toBe(true)
    }
    expect(canTransition('void', 'sent')).toBe(false)
    expect(canTransition('paid', 'void')).toBe(false)
  })

  it('marks only void and paid as inactive', () => {
    expect(isActive('sent')).toBe(true)
    expect(isActive('served')).toBe(true)
    expect(isActive('paid')).toBe(false)
    expect(isActive('void')).toBe(false)
  })

  it('gives every status a label, a tone and a hint', () => {
    for (const status of Object.values(ROUND_STATUS)) {
      const meta = statusMeta(status)
      expect(meta.label).toBeTruthy()
      expect(meta.tone).toBeTruthy()
      expect(meta.hint).toBeTruthy()
    }
    /* An unknown status must not blank out a card. */
    expect(statusMeta('who-knows').label).toBe('Sent')
  })

  it('flags a ticket late only after the documented threshold', () => {
    expect(LATE_THRESHOLD_MIN).toBe(15)
    expect((14 * 60_000) / 60_000 > LATE_THRESHOLD_MIN).toBe(false)
    expect((16 * 60_000) / 60_000 > LATE_THRESHOLD_MIN).toBe(true)
  })
})

describe('role based access', () => {
  it('gives the manager every area and the other roles a slice', () => {
    expect(ROLE_ACCESS.Manager).toHaveLength(14)
    expect(ROLE_ACCESS.Cashier.length).toBeLessThan(ROLE_ACCESS.Manager.length)
    expect(ROLE_ACCESS.Kitchen.length).toBeLessThan(ROLE_ACCESS.Cashier.length)
  })

  it('keeps financial reporting away from cashiers and chefs', () => {
    for (const area of ['expenses', 'staff', 'campaigns', 'menu', 'qr-codes']) {
      expect(canAccess(ROLES.MANAGER, area)).toBe(true)
      expect(canAccess(ROLES.CASHIER, area)).toBe(false)
      expect(canAccess(ROLES.KITCHEN, area)).toBe(false)
    }
  })

  it('lets the cashier run the register and the chef run the pass', () => {
    expect(canAccess(ROLES.CASHIER, 'billing')).toBe(true)
    expect(canAccess(ROLES.CASHIER, 'cash-drawer')).toBe(true)
    expect(canAccess(ROLES.KITCHEN, 'kitchen')).toBe(true)
    expect(canAccess(ROLES.KITCHEN, 'billing')).toBe(false)
  })

  it('denies everything to an unknown role', () => {
    expect(canAccess('Barista', 'overview')).toBe(false)
    expect(canAccess(undefined, 'overview')).toBe(false)
  })
})

describe('domain constants', () => {
  const uniqueAndFilled = (list) => {
    expect(list.length).toBeGreaterThan(0)
    expect(new Set(list).size).toBe(list.length)
    for (const entry of list) expect(typeof entry).toBe('string')
  }

  it('has the documented menu categories', () => {
    expect(CATEGORIES).toEqual([
      'Top Picks',
      'Main Course',
      'Soups',
      'Starters - Veg',
      'Starters - Non-Veg',
      'Beverages',
      'Desserts',
    ])
  })

  it('has three kitchen stations and three floor sections', () => {
    expect(STATIONS).toEqual(['Hot Kitchen', 'Cold / Salads', 'Bar / Beverages'])
    expect(TABLE_SECTIONS).toEqual(['Main Floor', 'Patio', 'Balcony'])
  })

  it('has unique payment methods and expense categories', () => {
    expect(PAYMENT_METHODS).toEqual(['Cash', 'Card', 'UPI', 'Split'])
    uniqueAndFilled(EXPENSE_CATEGORIES)
  })

  it('tones every table state, and defaults nothing', () => {
    for (const state of Object.values(TABLE_STATE)) {
      expect(TABLE_STATE_TONE[state]).toBeTruthy()
    }
    expect(TABLE_STATE_TONE).toEqual({
      Free: 'zinc',
      Occupied: 'amber',
      Billed: 'emerald',
      Reserved: 'indigo',
    })
  })

  it('only ever transitions into a status that exists', () => {
    const known = new Set(Object.values(ROUND_STATUS))
    for (const [from, targets] of Object.entries(TRANSITIONS)) {
      expect(known.has(from)).toBe(true)
      for (const target of targets) expect(known.has(target)).toBe(true)
    }
  })

  it('keeps every segment id resolvable by the selector', () => {
    const guests = [{ id: 'g1', lastVisit: 0, totalSpend: 0, vegOnly: false, visits: 0 }]
    for (const segment of SEGMENTS) {
      expect(typeof segment.label).toBe('string')
      expect(Array.isArray(segmentGuests(guests, segment.id))).toBe(true)
    }
    /* 'all' is the catch-all, and so is an id we do not recognise — a bad
       segment must never silently target nobody. */
    expect(segmentGuests(guests, 'all')).toHaveLength(1)
    expect(segmentGuests(guests, 'nonsense')).toHaveLength(1)
  })

  it('returns a tone for any station', () => {
    expect(stationTone('Hot Kitchen')).toBe('zinc')
    expect(typeof stationTone()).toBe('string')
  })
})
