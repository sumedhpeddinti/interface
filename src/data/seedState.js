/* Factory seed for the whole platform. Everything below is what the demo
   boots into: five tables mid-service, one unacknowledged round, a late KDS
   ticket, three settled invoices and a marketing history to analyse. */

import { mockMenu } from './mockMenu'
import { mockTables } from './mockTables'
import { mockGuests } from './mockGuests'
import { mockStaff, DEFAULT_SESSION_STAFF_ID } from './mockStaff'
import { computeTotals } from '../lib/pricing'

export const STORAGE_KEY = 'ganesh-cafe-os.v1'
/* Bump when the persisted shape changes — guests gained an opt-out flag in v2,
   the guest UI gained the app-install reward in v3. */
export const STATE_VERSION = 3

const MIN = 60_000
const DAY = 86_400_000

function menuItem(id) {
  const item = mockMenu.find((entry) => entry.id === id)
  if (!item) throw new Error(`Seed error: unknown menu id "${id}"`)
  return item
}

function line(id, qty, note = '') {
  const item = menuItem(id)
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    qty,
    station: item.station,
    isVeg: item.isVeg,
    note,
  }
}

function daysAgo(now, days) {
  return now - days * DAY
}

function minutesAgo(now, minutes) {
  return now - minutes * MIN
}

/** A clock time today, rolled back a day if it would land in the future. */
function todayAt(now, hours, minutes) {
  const d = new Date(now)
  d.setHours(hours, minutes, 0, 0)
  const ts = d.getTime()
  return ts > now ? ts - DAY : ts
}

function makeRound(round) {
  return {
    readyItemIds: [],
    notes: '',
    acknowledgedAt: null,
    cookingAt: null,
    readyAt: null,
    servedAt: null,
    discount: null,
    ...round,
  }
}

function makeInvoice(invoice) {
  const lines = invoice.lines
  const totals = computeTotals(lines, invoice.discount || null)
  const tendered =
    invoice.method === 'Cash'
      ? Math.ceil(totals.total / 100) * 100
      : invoice.tendered || totals.total
  return {
    ...invoice,
    lines,
    totals,
    tendered,
    change: Math.round((tendered - totals.total) * 100) / 100,
  }
}

export const RESTAURANT = {
  name: 'Ganesh Café',
  tagline: 'Kitchen & Bar · Since 1998',
  gstin: '27AABCU9603R1ZM',
  fssai: '11522998000123',
  address: '12 Koregaon Park Lane 5, Pune 411001',
  phone: '+91 98200 11223',
  email: 'hello@ganeshcafe.in',
  upi: 'ganeshcafe@upi',
  currency: 'INR',
}

export function buildSeedState(now = Date.now()) {
  // ------------------------------------------------------------------ rounds
  const rounds = [
    makeRound({
      id: 'ORD-1036',
      tableId: 'T5',
      round: 1,
      guestName: 'Neha Deshpande',
      guestPhone: '+91 99870 11234',
      partySize: 4,
      notes: 'One Butter Chicken mild for the kids.',
      status: 'served',
      createdAt: minutesAgo(now, 55),
      acknowledgedAt: minutesAgo(now, 53),
      cookingAt: minutesAgo(now, 51),
      readyAt: minutesAgo(now, 36),
      servedAt: minutesAgo(now, 30),
      readyItemIds: ['m03', 'm15', 'm32', 'm38'],
      items: [line('m03', 2), line('m15', 2), line('m32', 2), line('m38', 1)],
    }),
    makeRound({
      id: 'ORD-1037',
      tableId: 'T3',
      round: 1,
      guestName: 'Vinit Sharma',
      guestPhone: '+91 98765 43210',
      partySize: 2,
      notes: '',
      status: 'served',
      createdAt: minutesAgo(now, 38),
      acknowledgedAt: minutesAgo(now, 37),
      cookingAt: minutesAgo(now, 35),
      readyAt: minutesAgo(now, 20),
      servedAt: minutesAgo(now, 14),
      readyItemIds: ['m01', 'm13', 'm18'],
      items: [line('m01', 2), line('m13', 2), line('m18', 1)],
    }),
    makeRound({
      id: 'ORD-1038',
      tableId: 'T6',
      round: 1,
      guestName: 'Rohan Iyer',
      guestPhone: '+91 97654 88990',
      partySize: 6,
      notes: 'Extra spicy please, and no onion in the dal.',
      status: 'cooking',
      createdAt: minutesAgo(now, 19),
      acknowledgedAt: minutesAgo(now, 18),
      cookingAt: minutesAgo(now, 16),
      readyItemIds: ['m04'],
      items: [line('m04', 2), line('m14', 3), line('m32', 1)],
    }),
    makeRound({
      id: 'ORD-1039',
      tableId: 'T1',
      round: 1,
      guestName: 'Arjun Mehta',
      guestPhone: '+91 90045 67812',
      partySize: 4,
      notes: 'Please bring extra plates.',
      status: 'ready',
      createdAt: minutesAgo(now, 17),
      acknowledgedAt: minutesAgo(now, 16),
      cookingAt: minutesAgo(now, 15),
      readyAt: minutesAgo(now, 4),
      readyItemIds: ['m05', 'm13', 'm34'],
      items: [line('m05', 1), line('m13', 2), line('m34', 1)],
    }),
    makeRound({
      id: 'ORD-1040',
      tableId: 'T8',
      round: 1,
      guestName: 'Meera Joshi',
      guestPhone: '+91 91234 55667',
      partySize: 2,
      notes: 'No peanuts.',
      status: 'cooking',
      createdAt: minutesAgo(now, 9),
      acknowledgedAt: minutesAgo(now, 8),
      cookingAt: minutesAgo(now, 6),
      readyItemIds: ['m16'],
      items: [line('m16', 2), line('m21', 1)],
    }),
    makeRound({
      id: 'ORD-1041',
      tableId: 'T3',
      round: 2,
      guestName: 'Vinit Sharma',
      guestPhone: '+91 98765 43210',
      partySize: 2,
      notes: 'Bring the dessert with the tea.',
      status: 'sent',
      createdAt: minutesAgo(now, 2),
      items: [line('m30', 1), line('m38', 1)],
    }),
  ]

  // ---------------------------------------------------------------- invoices
  const invoices = [
    makeInvoice({
      id: 'INV/26-27/0001',
      tableId: 'T2',
      guestName: 'Rohan Iyer',
      guestPhone: '+91 97654 88990',
      cashierName: 'Priya Nair',
      method: 'Cash',
      createdAt: todayAt(now, 11, 20),
      settledAt: todayAt(now, 11, 20),
      shiftId: 'SH-0007',
      lines: [line('m01', 2), line('m13', 2), line('m30', 2)],
    }),
    makeInvoice({
      id: 'INV/26-27/0002',
      tableId: 'T7',
      guestName: 'Sana Kulkarni',
      guestPhone: '+91 98220 33445',
      cashierName: 'Priya Nair',
      method: 'UPI',
      createdAt: todayAt(now, 12, 5),
      settledAt: todayAt(now, 12, 5),
      shiftId: 'SH-0007',
      lines: [line('m20', 1), line('m18', 1), line('m32', 1), line('m38', 1)],
    }),
    makeInvoice({
      id: 'INV/26-27/0003',
      tableId: 'T4',
      guestName: 'Sameer Khan',
      guestPhone: '+91 98712 45678',
      cashierName: 'Priya Nair',
      method: 'Cash',
      createdAt: todayAt(now, 13, 10),
      settledAt: todayAt(now, 13, 10),
      shiftId: 'SH-0007',
      lines: [line('m03', 2), line('m15', 4), line('m32', 2), line('m38', 1)],
    }),
  ]

  // ---------------------------------------------------------------- expenses
  const expenses = [
    {
      id: 'EXP-0001',
      category: 'Rent',
      amount: 45000,
      note: 'Monthly hall lease — Main Floor',
      at: daysAgo(now, 25),
      by: 'Vinit Sharma',
    },
    {
      id: 'EXP-0002',
      category: 'Payroll',
      amount: 62000,
      note: 'Kitchen and floor salaries (September)',
      at: daysAgo(now, 20),
      by: 'Vinit Sharma',
    },
    {
      id: 'EXP-0003',
      category: 'Supplies / Ingredients',
      amount: 18400,
      note: 'Weekly vegetable, dairy and poultry run',
      at: daysAgo(now, 12),
      by: 'Rakesh Yadav',
    },
    {
      id: 'EXP-0004',
      category: 'Utilities',
      amount: 8600,
      note: 'Electricity and water — August cycle',
      at: daysAgo(now, 18),
      by: 'Priya Nair',
    },
    {
      id: 'EXP-0005',
      category: 'Supplies / Ingredients',
      amount: 9600,
      note: 'Spice restock and dry goods',
      at: daysAgo(now, 6),
      by: 'Rakesh Yadav',
    },
    {
      id: 'EXP-0006',
      category: 'Miscellaneous',
      amount: 2400,
      note: 'Commercial LPG cylinder',
      at: daysAgo(now, 4),
      by: 'Anil Kumar',
    },
    {
      id: 'EXP-0007',
      category: 'Utilities',
      amount: 3200,
      note: 'Broadband and POS terminal rental',
      at: daysAgo(now, 2),
      by: 'Priya Nair',
    },
    {
      id: 'EXP-0008',
      category: 'Rent',
      amount: 12000,
      note: 'Patio deck lease',
      at: daysAgo(now, 28),
      by: 'Vinit Sharma',
    },
  ]

  // --------------------------------------------------------------- campaigns
  const campaigns = [
    {
      id: 'CMP-0001',
      channel: 'whatsapp',
      name: 'Win-back · Inactive guests',
      heading: 'We miss you! Flat 20% Off',
      body: 'Enjoy flat 20% off your favourite Paneer Butter Masala this weekend. Show this message at the table.',
      coupon: 'WELCOME20',
      audience: 'inactive',
      audienceLabel: 'Inactive guests (30+ days)',
      audienceSize: 1248,
      sent: 1248,
      opened: 842,
      walkIns: 312,
      revenue: 48750,
      status: 'completed',
      sentAt: daysAgo(now, 6),
      scheduleAt: null,
      createdBy: 'Vinit Sharma',
    },
    {
      id: 'CMP-0002',
      channel: 'push',
      name: 'Weekend Biryani Fest',
      heading: 'Biryani Fest is on 🎉',
      body: 'Dum-cooked Hyderabadi biryani, ₹100 off on every bill above ₹700. Today only.',
      coupon: 'FEAST100',
      audience: 'all',
      audienceLabel: 'All guests',
      audienceSize: 980,
      sent: 980,
      opened: 511,
      walkIns: 148,
      revenue: 22400,
      status: 'completed',
      sentAt: daysAgo(now, 13),
      scheduleAt: null,
      createdBy: 'Vinit Sharma',
    },
  ]

  // ---------------------------------------------------------------- feedback
  const feedback = [
    {
      id: 'FB-0001',
      guestName: 'Sana Kulkarni',
      tableId: 'T7',
      rating: 5,
      pills: ['Delicious Food', 'Friendly Staff'],
      comment: 'The Paneer Tikka was perfectly smoky. Service was quick even at lunch rush.',
      at: daysAgo(now, 0) + 12 * 3_600_000,
      invoiceId: 'INV/26-27/0002',
    },
    {
      id: 'FB-0002',
      guestName: 'Sameer Khan',
      tableId: 'T4',
      rating: 4,
      pills: ['Delicious Food', 'Clean Environment'],
      comment: 'Great gravy, but the naan arrived a little late.',
      at: daysAgo(now, 0) + 13 * 3_600_000,
      invoiceId: 'INV/26-27/0003',
    },
    {
      id: 'FB-0003',
      guestName: 'Meera Joshi',
      tableId: 'T9',
      rating: 5,
      pills: ['Fast Service', 'Friendly Staff'],
      comment: 'Ordered straight from the QR code, no waiting at all.',
      at: daysAgo(now, 1),
      invoiceId: null,
    },
    {
      id: 'FB-0004',
      guestName: 'Kabir Nair',
      tableId: 'T6',
      rating: 3,
      pills: ['Delicious Food'],
      comment: 'Food was good but the table took a while to be cleared.',
      at: daysAgo(now, 3),
      invoiceId: null,
    },
    {
      id: 'FB-0005',
      guestName: 'Ananya Rao',
      tableId: 'T11',
      rating: 5,
      pills: ['Delicious Food', 'Fast Service', 'Clean Environment'],
      comment: 'Balcony seating plus the dal makhani — perfect evening.',
      at: daysAgo(now, 4),
      invoiceId: null,
    },
  ]

  // ------------------------------------------------------------------ guests
  const guests = mockGuests.map((guest) => ({
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    visits: guest.visits,
    totalSpend: guest.totalSpend,
    favoriteDish: guest.favoriteDish,
    vegOnly: guest.vegOnly,
    optedOut: Boolean(guest.optedOut),
    lastVisit: daysAgo(now, guest.lastVisitDaysAgo),
    joinedAt: daysAgo(now, guest.joinedDaysAgo),
    source: 'qr',
  }))

  // ------------------------------------------------------------------ events
  const events = [
    {
      id: 'EV-0001',
      type: 'order',
      message: 'Round 2 placed on T3 — Masala Chai, Gulab Jamun',
      at: minutesAgo(now, 2),
      actor: 'Vinit Sharma',
    },
    {
      id: 'EV-0002',
      type: 'kds',
      message: 'T6 Round 1 flagged late at 15m in the Hot Kitchen',
      at: minutesAgo(now, 4),
      actor: 'system',
    },
    {
      id: 'EV-0003',
      type: 'kds',
      message: 'T1 Round 1 bumped ready by Rakesh Yadav',
      at: minutesAgo(now, 4),
      actor: 'Rakesh Yadav',
    },
    {
      id: 'EV-0004',
      type: 'settle',
      message: 'INV/26-27/0003 settled for ₹1,134.00 — T4 freed',
      at: todayAt(now, 13, 10),
      actor: 'Priya Nair',
    },
    {
      id: 'EV-0005',
      type: 'campaign',
      message: 'Campaign "Win-back · Inactive guests" delivered to 1,248 guests',
      at: daysAgo(now, 6),
      actor: 'Vinit Sharma',
    },
  ]

  return {
    restaurant: RESTAURANT,
    settings: {
      soundEnabled: true,
      storeOpen: true,
      autoAcknowledge: false,
      /* Real operating-system notifications on top of the in-app banner. */
      osNotifications: true,
    },
    menu: mockMenu.map((item) => ({ ...item })),
    tables: mockTables.map((table) => ({ ...table, reserved: table.id === 'T10' })),
    orders: rounds,
    invoices,
    guests,
    staff: mockStaff.map((member) => ({ ...member })),
    session: { staffId: DEFAULT_SESSION_STAFF_ID, locked: false },
    shift: {
      id: 'SH-0007',
      isOpen: true,
      openedAt: Math.min(todayAt(now, 9, 15), now - 45 * MIN),
      openingFloat: 5000,
      openedBy: 'Priya Nair',
      cashTransactions: [
        {
          id: 'CT-0001',
          type: 'out',
          reason: 'Milk and curd — morning supply',
          amount: 240,
          at: todayAt(now, 9, 40),
          by: 'Priya Nair',
        },
        {
          id: 'CT-0002',
          type: 'in',
          reason: 'Tips pool deposit',
          amount: 180,
          at: todayAt(now, 12, 30),
          by: 'Anil Kumar',
        },
      ],
      closedShifts: [
        {
          id: 'SH-0006',
          openedAt: daysAgo(now, 1) - 15 * 3_600_000,
          closedAt: daysAgo(now, 1) + 14 * 3_600_000,
          openingFloat: 5000,
          cashSales: 7940,
          cashIn: 300,
          cashOut: 450,
          expectedCash: 12790,
          countedCash: 12840,
          variance: 50,
          closedBy: 'Priya Nair',
          notes: '₹50 over — likely a rounded-up change return.',
        },
      ],
    },
    expenses,
    campaigns,
    feedback,
    events,
    alerts: [],
    pushNotifications: [],
    billDiscounts: {},
    parkedBills: {},
    couponError: null,
    cart: {
      items: {},
      guest: { name: '', phone: '', notes: '' },
      open: false,
      bannerDismissed: false,
      lastRoundId: null,
    },
    feedbackPrompt: null,
    seq: {
      order: 1041,
      invoice: 3,
      expense: 8,
      campaign: 2,
      feedback: 5,
      alert: 0,
      transaction: 2,
      event: 5,
      shift: 7,
      guest: mockGuests.length,
      menu: mockMenu.length,
    },
    ui: {
      guestTableId: 'T1',
      promoCode: null,
      tablesView: 'plan',
      billingSelectedTable: null,
      kitchenStation: 'All Stations',
      notifyPromptDismissed: false,
      /* Device-level: this browser has Ganesh Café installed, so the guest
         keeps the APP10 reward on every round. */
      appInstalled: false,
      installUnlockedAt: null,
    },
  }
}
