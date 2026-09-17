import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import { buildSeedState } from '../../../src/data/seedState.js'

export async function getFullStoreState(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  let restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId },
  })
  if (!restaurant) {
    restaurant = await prisma.restaurant.findFirst()
  }
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        id: restaurantId,
        name: 'Beno',
        tagline: 'Kitchen & Bar · Since 1998',
        gstin: '27AABCU9603R1ZM',
        fssai: '11522998000123',
        address: '12 Koregaon Park Lane 5, Pune 411001',
        phone: '+91 98200 11223',
        email: 'hello@beno.in',
        upi: 'beno@upi',
        currency: 'INR',
      },
    })
  } else if (restaurant.name === 'Ganesh Café') {
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { name: 'Beno', email: 'hello@beno.in', upi: 'beno@upi' },
    })
  }
  restaurantId = restaurant.id

  const staff = await prisma.staff.findMany({
    where: { restaurantId },
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      phone: true,
      active: true,
      joinedDaysAgo: true,
    },
  })

  const menu = await prisma.menuItem.findMany({
    where: { restaurantId },
    orderBy: { name: 'asc' },
  })

  const formattedMenu = menu.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    price: item.price,
    rating: item.rating,
    category: item.categoryName,
    station: item.station,
    isVeg: item.isVeg,
    isBestseller: item.isBestseller,
    image: item.image || '',
    available: item.available,
  }))

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { id: 'asc' },
  })

  const formattedTables = tables.map((table) => ({
    id: table.id,
    seats: table.seats,
    section: table.section,
    x: table.x,
    y: table.y,
    shape: table.shape,
    reserved: table.reserved,
  }))

  const orders = await prisma.order.findMany({
    where: { restaurantId },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })

  const formattedOrders = orders.map((order) => ({
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

  const invoices = await prisma.invoice.findMany({
    where: { restaurantId },
    orderBy: { settledAt: 'desc' },
  })

  const formattedInvoices = invoices.map((inv) => ({
    id: inv.id,
    tableId: inv.tableId,
    guestName: inv.guestName || '',
    guestPhone: inv.guestPhone || '',
    cashierName: inv.cashierName || '',
    method: inv.method,
    createdAt: inv.createdAt,
    settledAt: inv.settledAt,
    shiftId: inv.shiftId,
    lines: inv.lines,
    totals: inv.totals,
    tendered: inv.tendered,
    change: inv.change,
  }))

  const activeShift = await prisma.cashShift.findFirst({
    where: { restaurantId, isOpen: true },
    include: { transactions: true },
    orderBy: { openedAt: 'desc' },
  })

  const closedShifts = await prisma.cashShift.findMany({
    where: { restaurantId, isOpen: false },
    orderBy: { closedAt: 'desc' },
    take: 10,
  })

  const shiftState = activeShift
    ? {
        id: activeShift.id,
        isOpen: true,
        openedAt: activeShift.openedAt,
        openingFloat: activeShift.openingFloat,
        openedBy: activeShift.openedBy,
        cashTransactions: (activeShift.transactions || []).map((ct) => ({
          id: ct.id,
          type: ct.type,
          reason: ct.reason,
          amount: ct.amount,
          at: ct.at,
          by: ct.by,
        })),
        closedShifts: closedShifts.map((cs) => ({
          id: cs.id,
          openedAt: cs.openedAt,
          closedAt: cs.closedAt,
          openingFloat: cs.openingFloat,
          cashSales: cs.cashSales,
          cashIn: cs.cashIn,
          cashOut: cs.cashOut,
          expectedCash: cs.expectedCash,
          countedCash: cs.countedCash,
          variance: cs.variance,
          closedBy: cs.closedBy,
          notes: cs.notes || '',
        })),
      }
    : {
        id: null,
        isOpen: false,
        openedAt: null,
        openingFloat: 0,
        openedBy: '',
        cashTransactions: [],
        closedShifts: closedShifts.map((cs) => ({
          id: cs.id,
          openedAt: cs.openedAt,
          closedAt: cs.closedAt,
          openingFloat: cs.openingFloat,
          cashSales: cs.cashSales,
          cashIn: cs.cashIn,
          cashOut: cs.cashOut,
          expectedCash: cs.expectedCash,
          countedCash: cs.countedCash,
          variance: cs.variance,
          closedBy: cs.closedBy,
          notes: cs.notes || '',
        })),
      }

  const expenses = await prisma.expense.findMany({
    where: { restaurantId },
    orderBy: { at: 'desc' },
  })

  const formattedExpenses = expenses.map((e) => ({
    id: e.id,
    category: e.category,
    amount: e.amount,
    note: e.note || '',
    at: e.at,
    by: e.by,
  }))

  let guests = await prisma.customer.findMany({
    where: { restaurantId },
    orderBy: { lastVisit: 'desc' },
  })

  if (guests.length === 0) {
    try {
      const seed = buildSeedState()
      for (const g of seed.guests) {
        await prisma.customer.upsert({
          where: { id: g.id },
          update: {
            restaurantId,
            name: g.name,
            phone: g.phone,
            visits: Number(g.visits),
            totalSpend: Number(g.totalSpend),
            favoriteDish: g.favoriteDish || '',
            vegOnly: Boolean(g.vegOnly),
            optedOut: Boolean(g.optedOut),
            lastVisit: Number(g.lastVisit),
            joinedAt: Number(g.joinedAt),
            source: g.source || 'qr',
          },
          create: {
            id: g.id,
            restaurantId,
            name: g.name,
            phone: g.phone,
            visits: Number(g.visits),
            totalSpend: Number(g.totalSpend),
            favoriteDish: g.favoriteDish || '',
            vegOnly: Boolean(g.vegOnly),
            optedOut: Boolean(g.optedOut),
            lastVisit: Number(g.lastVisit),
            joinedAt: Number(g.joinedAt),
            source: g.source || 'qr',
          },
        })
      }
      guests = await prisma.customer.findMany({
        where: { restaurantId },
        orderBy: { lastVisit: 'desc' },
      })
    } catch (_) {}
  }

  const formattedGuests = guests.map((g) => ({
    id: g.id,
    name: g.name,
    phone: g.phone,
    visits: g.visits,
    totalSpend: g.totalSpend,
    favoriteDish: g.favoriteDish || '',
    vegOnly: g.vegOnly,
    optedOut: g.optedOut,
    lastVisit: g.lastVisit,
    joinedAt: g.joinedAt,
    source: g.source || 'qr',
  }))

  const campaigns = await prisma.campaign.findMany({
    where: { restaurantId },
    orderBy: { id: 'desc' },
  })

  const formattedCampaigns = campaigns.map((c) => ({
    id: c.id,
    channel: c.channel,
    name: c.name,
    heading: c.heading,
    body: c.body,
    coupon: c.coupon || '',
    audience: c.audience,
    audienceLabel: c.audienceLabel || '',
    audienceSize: c.audienceSize,
    sent: c.sent,
    opened: c.opened,
    walkIns: c.walkIns,
    revenue: c.revenue,
    status: c.status,
    sentAt: c.sentAt,
    scheduleAt: c.scheduleAt,
    createdBy: c.createdBy,
  }))

  const feedback = await prisma.feedback.findMany({
    where: { restaurantId },
    orderBy: { at: 'desc' },
  })

  const formattedFeedback = feedback.map((f) => ({
    id: f.id,
    guestName: f.guestName,
    tableId: f.tableId,
    rating: f.rating,
    pills: f.pills,
    comment: f.comment || '',
    at: f.at,
    invoiceId: f.invoiceId,
  }))

  const events = await prisma.auditEvent.findMany({
    where: { restaurantId },
    orderBy: { at: 'desc' },
    take: 60,
  })

  const formattedEvents = events.map((ev) => ({
    id: ev.id,
    type: ev.type,
    message: ev.message,
    at: ev.at,
    actor: ev.actor,
  }))

  return {
    restaurant: {
      name: restaurant.name,
      tagline: restaurant.tagline || '',
      gstin: restaurant.gstin || '',
      fssai: restaurant.fssai || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      upi: restaurant.upi || '',
      currency: restaurant.currency || 'INR',
    },
    settings: restaurant.settings || {
      soundEnabled: true,
      storeOpen: true,
      autoAcknowledge: false,
      osNotifications: true,
    },
    menu: formattedMenu,
    tables: formattedTables,
    orders: formattedOrders,
    invoices: formattedInvoices,
    guests: formattedGuests,
    staff,
    session: { staffId: staff[0]?.id || 's01', locked: false },
    shift: shiftState,
    expenses: formattedExpenses,
    campaigns: formattedCampaigns,
    feedback: formattedFeedback,
    events: formattedEvents,
    alerts: [],
    pushNotifications: [],
    cart: {
      items: {},
      guest: { name: '', phone: '', notes: '' },
      open: false,
      bannerDismissed: false,
      lastRoundId: null,
    },
    ui: {
      guestTableId: 'T1',
      promoCode: null,
      tablesView: 'plan',
      billingSelectedTable: null,
      kitchenStation: 'All Stations',
      notifyPromptDismissed: false,
      appInstalled: false,
      installUnlockedAt: null,
    },
    seq: {
      order: formattedOrders.length + 1040,
      invoice: formattedInvoices.length + 3,
      expense: formattedExpenses.length + 8,
      campaign: formattedCampaigns.length + 2,
      feedback: formattedFeedback.length + 5,
      alert: 0,
      transaction: 2,
      event: formattedEvents.length + 5,
      shift: 7,
      guest: formattedGuests.length,
      menu: formattedMenu.length,
    },
  }
}
