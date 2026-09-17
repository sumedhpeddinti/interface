/* The unified reactive store behind both portals.
   One reducer owns tables, rounds, KDS, billing, shifts, CRM, campaigns and
   feedback; the guest app and the POS are two views over the same state.

   Realtime characteristics:
   - persistence to PostgreSQL via REST APIs & Socket.IO realtime
   - persistence to localStorage (debounced fallback) so offline/test modes work seamlessly
   - audio chimes are requested by the reducer and played by an effect
   - campaigns progress through simulated delivery stages on a timer */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { io } from 'socket.io-client'
import { buildSeedState } from '../data/seedState.js'
import {
  clearState,
  loadState,
  onExternalStateChange,
  saveState,
} from '../lib/storage.js'
import { playChime, setAudioEnabled, unlockAudio } from '../lib/audio.js'
import { applyCoupon, computeTotals, installRewardDiscount, resolveDiscount } from '../lib/pricing.js'
import { ROUND_STATUS, canTransition, isActive } from '../lib/orders.js'
import { round2 } from '../lib/format.js'
import { cashDrawerSummary, openRoundsOfTable, tableBill, varianceOf } from '../lib/selectors.js'
import { api } from '../lib/api/index.js'

const MAX_EVENTS = 60
const MAX_ALERTS = 30
const MAX_PUSHES = 12

const StoreContext = createContext(null)

const pad = (value, length = 4) => String(value).padStart(length, '0')

/* How long a guest push banner stays on screen before it retires itself. */
const PUSH_BANNER_MS = 90_000
const digits = (value) => String(value || '').replace(/\D/g, '')

/* ------------------------------------------------------------------ helpers */

function initialiseState() {
  const base = buildSeedState()
  return {
    ...base,
    orders: [],
    invoices: [],
    guests: [],
    expenses: [],
    campaigns: [],
    feedback: [],
    events: [],
    alerts: [],
    pushNotifications: [],
    shift: {
      id: null,
      isOpen: false,
      openedAt: null,
      openingFloat: 0,
      openedBy: '',
      cashTransactions: [],
      closedShifts: [],
    },
  }
}

function logEvent(state, event) {
  const seq = (state.seq.event || 0) + 1
  const entry = {
    id: `EV-${pad(seq)}`,
    at: Date.now(),
    actor: 'system',
    ...event,
  }
  return {
    events: [entry, ...(state.events || [])].slice(0, MAX_EVENTS),
    seq: { ...state.seq, event: seq },
  }
}

function chime(state, kind) {
  return { kind, seq: (state.chime?.seq || 0) + 1 }
}

function pushGuestNotification(state, notification) {
  const seq = (state.seq.push || 0) + 1
  const entry = { id: `PSH-${pad(seq)}`, at: Date.now(), ...notification }
  return {
    pushNotifications: [entry, ...(state.pushNotifications || [])].slice(0, MAX_PUSHES),
    seq: { ...state.seq, push: seq },
  }
}

function raiseAlert(state, alert) {
  const seq = (state.seq.alert || 0) + 1
  const entry = { id: `ALT-${pad(seq)}`, at: Date.now(), resolved: false, ...alert }
  return {
    alerts: [entry, ...(state.alerts || [])].slice(0, MAX_ALERTS),
    seq: { ...state.seq, alert: seq },
  }
}

/** Create or update the CRM record behind an order or an invoice. */
function upsertGuest(state, patch) {
  const key = digits(patch.phone)
  const guests = state.guests || []
  const index = guests.findIndex(
    (guest) =>
      (key && digits(guest.phone) === key) ||
      (!key && patch.name && guest.name.toLowerCase() === patch.name.toLowerCase()),
  )
  if (index === -1) {
    if (!key && !patch.name) return { guests, guest: null }
    const seq = (state.seq.guest || 0) + 1
    const guest = {
      id: `g${pad(seq, 2)}`,
      name: patch.name || 'Guest',
      phone: patch.phone || '',
      visits: patch.visits || 0,
      totalSpend: round2(patch.spend || 0),
      favoriteDish: patch.favoriteDish || '',
      vegOnly: patch.vegOnly ?? true,
      optedOut: false,
      lastVisit: patch.at || Date.now(),
      joinedAt: patch.at || Date.now(),
      source: patch.source || 'qr',
    }
    return { guests: [guest, ...guests], guest, seq: { ...state.seq, guest: seq } }
  }
  const existing = guests[index]
  const next = {
    ...existing,
    name: patch.name || existing.name,
    phone: patch.phone || existing.phone,
    visits: existing.visits + (patch.visits || 0),
    totalSpend: round2(existing.totalSpend + (patch.spend || 0)),
    lastVisit: patch.at || existing.lastVisit,
    favoriteDish: patch.favoriteDish || existing.favoriteDish,
    vegOnly: patch.vegOnly ?? existing.vegOnly,
  }
  const copy = [...guests]
  copy[index] = next
  return { guests: copy, guest: next }
}

function mostOrderedDish(lines) {
  const tally = new Map()
  for (const lineItem of lines) {
    tally.set(lineItem.name, (tally.get(lineItem.name) || 0) + (lineItem.qty || 0))
  }
  let best = ''
  let bestQty = 0
  for (const [name, qty] of tally.entries()) {
    if (qty > bestQty) {
      best = name
      bestQty = qty
    }
  }
  return best
}

function renumberRounds(orders, tableId) {
  const rounds = orders
    .filter((order) => order.tableId === tableId)
    .sort((a, b) => a.createdAt - b.createdAt)
  const numbering = new Map(rounds.map((order, index) => [order.id, index + 1]))
  return orders.map((order) =>
    numbering.has(order.id) ? { ...order, round: numbering.get(order.id) } : order,
  )
}

/* ------------------------------------------------------------------ reducer */

export function storeReducer(state, action) {
  switch (action.type) {
    /* ------------------------------------------------------------- session */
    case 'LOCK_SESSION':
      return { ...state, session: { ...state.session, locked: true } }

    case 'UNLOCK_SESSION': {
      const staff = (state.staff || []).find((member) => member.id === action.staffId)
      if (!staff || !staff.active) return state
      return {
        ...state,
        session: { staffId: staff.id, locked: false },
      }
    }

    case 'SET_SESSION': {
      const staff = (state.staff || []).find((member) => member.id === action.staffId)
      if (!staff) return state
      return { ...state, session: { staffId: staff.id, locked: false } }
    }

    case 'ADD_STAFF': {
      const { name, role, pin, phone, title } = action
      if (!name || !/^\d{4}$/.test(String(pin))) return state
      if ((state.staff || []).some((member) => member.pin === String(pin))) return state
      const member = {
        id: `s${pad((state.staff || []).length + 1, 2)}`,
        name,
        role,
        pin: String(pin),
        phone: phone || '',
        title: title || role,
        active: true,
        joinedDaysAgo: 0,
      }
      const logged = logEvent(
        { ...state, staff: [...state.staff, member] },
        { type: 'staff', message: `${name} added as ${role}`, actor: action.actor },
      )
      return { ...state, staff: [...state.staff, member], ...logged }
    }

    case 'UPDATE_STAFF': {
      const staff = (state.staff || []).map((member) =>
        member.id === action.id ? { ...member, ...action.patch } : member,
      )
      const target = staff.find((member) => member.id === action.id)
      const logged = logEvent(
        { ...state, staff },
        {
          type: 'staff',
          message: `${target?.name || action.id} updated${action.patch?.active === false ? ' and deactivated' : ''}`,
          actor: action.actor,
        },
      )
      return { ...state, staff, ...logged }
    }

    /* ---------------------------------------------------------- guest cart */
    case 'CART_ADD': {
      const current = state.cart.items[action.item.id] || 0
      return {
        ...state,
        cart: {
          ...state.cart,
          items: { ...state.cart.items, [action.item.id]: current + (action.qty || 1) },
        },
      }
    }

    case 'CART_SET_QTY': {
      const items = { ...state.cart.items }
      if (action.qty <= 0) delete items[action.id]
      else items[action.id] = action.qty
      return { ...state, cart: { ...state.cart, items } }
    }

    case 'CART_CLEAR':
      return { ...state, cart: { ...state.cart, items: {}, lastRoundId: null } }

    case 'CART_GUEST':
      return { ...state, cart: { ...state.cart, guest: { ...state.cart.guest, ...action.patch } } }

    case 'CART_TOGGLE':
      return {
        ...state,
        cart: { ...state.cart, open: action.open ?? !state.cart.open },
      }

    case 'CART_DISMISS_BANNER':
      return { ...state, cart: { ...state.cart, bannerDismissed: true } }

    /* --------------------------------------------------------------- order */
    case 'PLACE_ORDER': {
      const { tableId, guestName, guestPhone, notes, itemNotes } = action
      const items = Object.entries(state.cart.items)
        .map(([id, qty]) => {
          const menuItem = (state.menu || []).find((entry) => entry.id === id)
          if (!menuItem) return null
          return {
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            qty,
            station: menuItem.station,
            isVeg: menuItem.isVeg,
            note: itemNotes?.[id] || '',
          }
        })
        .filter(Boolean)
      if (!items.length) return state

      const orderSeq = (state.seq.order || 0) + 1
      const existing = openRoundsOfTable(state.orders, tableId)
      const order = {
        id: `ORD-${orderSeq}`,
        tableId,
        round: existing.length + 1,
        guestName: guestName || 'Guest',
        guestPhone: guestPhone || '',
        notes: notes || '',
        status: ROUND_STATUS.SENT,
        createdAt: Date.now(),
        acknowledgedAt: null,
        cookingAt: null,
        readyAt: null,
        servedAt: null,
        paidAt: null,
        readyItemIds: [],
        items,
      }

      const guestPatch = upsertGuest(state, {
        name: guestName,
        phone: guestPhone,
        at: Date.now(),
        vegOnly: items.every((item) => item.isVeg),
        source: 'qr',
      })

      const rewarded = state.ui.appInstalled && !(state.billDiscounts || {})[tableId]
      const billDiscounts = rewarded
        ? { ...(state.billDiscounts || {}), [tableId]: installRewardDiscount() }
        : state.billDiscounts

      const summary = items.map((item) => `${item.qty}× ${item.name}`).join(', ')
      const logged = logEvent(
        { ...state, guests: guestPatch.guests, seq: guestPatch.seq || state.seq },
        {
          type: 'order',
          message: `Round ${order.round} placed on ${tableId} — ${summary}`,
          actor: guestName || 'Guest',
        },
      )

      const alerted = raiseAlert(
        { ...state, ...logged, guests: guestPatch.guests, seq: logged.seq },
        {
          kind: 'order',
          tableId,
          title: `New round on ${tableId}`,
          message: summary,
          orderId: order.id,
          round: order.round,
        },
      )

      return {
        ...state,
        orders: [...state.orders, order],
        guests: guestPatch.guests,
        seq: { ...alerted.seq, order: orderSeq },
        alerts: alerted.alerts,
        events: logged.events,
        billDiscounts,
        cart: {
          ...state.cart,
          items: {},
          guest: { name: '', phone: '', notes: '' },
          open: false,
          lastRoundId: order.id,
        },
        chime: chime(state, 'order'),
      }
    }

    case 'ADD_ROUND': {
      const { tableId, items, notes, actor } = action
      if (!items || !items.length) return state
      const orderSeq = (state.seq.order || 0) + 1
      const existing = openRoundsOfTable(state.orders, tableId)
      const order = {
        id: `ORD-${orderSeq}`,
        tableId,
        round: existing.length + 1,
        guestName: action.guestName || existing[0]?.guestName || 'Walk-in',
        guestPhone: action.guestPhone || existing[0]?.guestPhone || '',
        notes: notes || '',
        status: ROUND_STATUS.ACCEPTED,
        createdAt: Date.now(),
        acknowledgedAt: Date.now(),
        cookingAt: null,
        readyAt: null,
        servedAt: null,
        paidAt: null,
        readyItemIds: [],
        enteredBy: actor || 'Counter',
        items,
      }
      const summary = items.map((item) => `${item.qty}× ${item.name}`).join(', ')
      const logged = logEvent(
        { ...state, orders: [...state.orders, order] },
        {
          type: 'order',
          message: `Round ${order.round} added to ${tableId} from the counter — ${summary}`,
          actor: actor || 'Counter',
        },
      )
      return {
        ...state,
        orders: [...state.orders, order],
        seq: { ...logged.seq, order: orderSeq },
        events: logged.events,
      }
    }

    case 'ACKNOWLEDGE_ORDER': {
      const target = state.orders.find((order) => order.id === action.orderId)
      if (!target || !canTransition(target.status, ROUND_STATUS.ACCEPTED)) return state
      const orders = state.orders.map((order) =>
        order.id === action.orderId
          ? {
              ...order,
              status: ROUND_STATUS.ACCEPTED,
              acknowledgedAt: Date.now(),
              acknowledgedBy: action.actor,
            }
          : order,
      )
      const logged = logEvent(
        { ...state, orders },
        {
          type: 'order',
          message: `${target.id} · T${target.tableId.slice(1)} Round ${target.round} acknowledged and sent to the KDS`,
          actor: action.actor || 'system',
        },
      )
      return { ...state, orders, ...logged }
    }

    case 'START_COOKING': {
      const target = state.orders.find((order) => order.id === action.orderId)
      if (!target || !canTransition(target.status, ROUND_STATUS.COOKING)) return state
      const orders = state.orders.map((order) =>
        order.id === action.orderId
          ? { ...order, status: ROUND_STATUS.COOKING, cookingAt: Date.now() }
          : order,
      )
      return { ...state, orders }
    }

    case 'TOGGLE_ITEM_READY': {
      const target = state.orders.find((order) => order.id === action.orderId)
      if (!target) return state
      const ready = target.readyItemIds || []
      const has = ready.includes(action.itemId)
      const readyItemIds = has
        ? ready.filter((id) => id !== action.itemId)
        : [...ready, action.itemId]
      const everyItemReady = target.items.every((item) => readyItemIds.includes(item.id))
      const nextStatus = everyItemReady
        ? target.status === ROUND_STATUS.ACCEPTED || target.status === ROUND_STATUS.COOKING
          ? ROUND_STATUS.READY
          : target.status
        : target.status === ROUND_STATUS.ACCEPTED
          ? ROUND_STATUS.COOKING
          : target.status
      const orders = state.orders.map((order) =>
        order.id === action.orderId
          ? {
              ...order,
              readyItemIds,
              status: nextStatus,
              cookingAt: order.cookingAt || Date.now(),
              readyAt: nextStatus === ROUND_STATUS.READY ? Date.now() : order.readyAt,
            }
          : order,
      )
      const push =
        nextStatus === ROUND_STATUS.READY && target.status !== ROUND_STATUS.READY
          ? pushGuestNotification(
              { ...state, orders },
              {
                kind: 'kitchen',
                title: `Table ${target.tableId} · ready to serve`,
                body: `Round ${target.round} is plated and on its way.`,
                tableId: target.tableId,
              },
            )
          : null
      return { ...state, orders, ...(push || {}) }
    }

    case 'BUMP_TICKET': {
      const target = state.orders.find((order) => order.id === action.orderId)
      if (!target || !canTransition(target.status, ROUND_STATUS.READY)) return state
      const allItemIds = target.items.map((item) => item.id)
      const orders = state.orders.map((order) =>
        order.id === action.orderId
          ? {
              ...order,
              status: ROUND_STATUS.READY,
              readyAt: Date.now(),
              readyItemIds: allItemIds,
              bumpedBy: action.actor,
            }
          : order,
      )
      const logged = logEvent(
        { ...state, orders },
        {
          type: 'kds',
          message: `${target.id} · T${target.tableId.slice(1)} Round ${target.round} bumped ready`,
          actor: action.actor || 'Kitchen',
        },
      )
      const push = pushGuestNotification(
        { ...state, orders, ...logged },
        {
          kind: 'kitchen',
          title: `Table ${target.tableId} · your food is ready`,
          body: `Round ${target.round} has been plated and is being served now.`,
          tableId: target.tableId,
        },
      )
      return { ...state, orders, ...logged, ...push, chime: chime(state, 'ready') }
    }

    case 'SERVE_ORDER': {
      const target = state.orders.find((order) => order.id === action.orderId)
      if (!target || !canTransition(target.status, ROUND_STATUS.SERVED)) return state
      const orders = state.orders.map((order) =>
        order.id === action.orderId
          ? { ...order, status: ROUND_STATUS.SERVED, servedAt: Date.now() }
          : order,
      )
      const logged = logEvent(
        { ...state, orders },
        {
          type: 'serve',
          message: `${target.id} served to T${target.tableId.slice(1)}`,
          actor: action.actor || 'Floor',
        },
      )
      return { ...state, orders, ...logged }
    }

    case 'VOID_ORDER': {
      const target = state.orders.find((order) => order.id === action.orderId)
      if (!target) return state
      const orders = state.orders.map((order) =>
        order.id === action.orderId
          ? { ...order, status: ROUND_STATUS.VOID, voidedAt: Date.now(), voidReason: action.reason }
          : order,
      )
      const logged = logEvent(
        { ...state, orders },
        {
          type: 'void',
          message: `${target.id} voided on T${target.tableId.slice(1)} — ${action.reason || 'no reason given'}`,
          actor: action.actor || 'Manager',
        },
      )
      return { ...state, orders, ...logged }
    }

    /* -------------------------------------------------------------- alerts */
    case 'CALL_WAITER': {
      const { tableId, request, note } = action
      const alerted = raiseAlert(state, {
        kind: 'waiter',
        tableId,
        title: `Table ${tableId} · ${request}`,
        message: note || `Guest requested ${String(request).toLowerCase()}`,
      })
      const logged = logEvent(
        { ...state, ...alerted },
        {
          type: 'waiter',
          message: `T${tableId.slice(1)} called the waiter — ${request}`,
          actor: 'Guest',
        },
      )
      return {
        ...state,
        alerts: alerted.alerts,
        seq: logged.seq,
        events: logged.events,
        chime: chime(state, 'waiter'),
      }
    }

    case 'RESOLVE_ALERT':
      return {
        ...state,
        alerts: (state.alerts || []).map((alert) =>
          alert.id === action.alertId
            ? { ...alert, resolved: true, resolvedAt: Date.now(), resolvedBy: action.actor }
            : alert,
        ),
      }

    case 'CLEAR_RESOLVED_ALERTS':
      return { ...state, alerts: (state.alerts || []).filter((alert) => !alert.resolved) }

    /* ------------------------------------------------------------- billing */
    case 'SET_BILL_DISCOUNT':
      return {
        ...state,
        billDiscounts: { ...(state.billDiscounts || {}), [action.tableId]: action.discount },
      }

    case 'SET_BILL_COUPON': {
      const bill = tableBill(state.orders, action.tableId)
      const result = applyCoupon(bill.subtotal, action.code)
      if (!result.ok) return { ...state, couponError: { tableId: action.tableId, message: result.error } }
      return {
        ...state,
        couponError: null,
        billDiscounts: { ...(state.billDiscounts || {}), [action.tableId]: result.discount },
      }
    }

    case 'PARK_BILL':
      return {
        ...state,
        parkedBills: {
          ...(state.parkedBills || {}),
          [action.tableId]: action.parked,
        },
      }

    case 'TRANSFER_TABLE': {
      const { fromTableId, toTableId } = action
      if (fromTableId === toTableId) return state
      const moving = state.orders.filter(
        (order) => order.tableId === fromTableId && isActive(order.status),
      )
      if (!moving.length) return state
      let orders = state.orders.map((order) =>
        moving.some((entry) => entry.id === order.id) ? { ...order, tableId: toTableId } : order,
      )
      orders = renumberRounds(orders, toTableId)
      const logged = logEvent(
        { ...state, orders },
        {
          type: 'transfer',
          message: `Table ${fromTableId} transferred to ${toTableId} — ${moving.length} round(s) moved`,
          actor: action.actor || 'Floor',
        },
      )
      return { ...state, orders, ...logged }
    }

    case 'SETTLE_BILL': {
      const { tableId, method, tendered, portions, cashierName, discount } = action
      const manual = discount !== undefined ? discount : (state.billDiscounts || {})[tableId] || null
      const bill = tableBill(state.orders, tableId, manual)
      if (!bill.rounds.length) return state

      const totals = computeTotals(bill.lines, manual)
      const invoiceSeq = (state.seq.invoice || 0) + 1
      const settledAt = Date.now()
      const paid = method === 'Split' ? round2(tendered ?? totals.total) : round2(tendered ?? totals.total)
      const invoice = {
        id: `INV/26-27/${pad(invoiceSeq)}`,
        tableId,
        guestName: bill.guestName,
        guestPhone: bill.guestPhone,
        cashierName: cashierName || 'Priya Nair',
        method,
        lines: bill.lines,
        totals,
        tendered: paid,
        change: round2(paid - totals.total),
        portions: portions || null,
        rounds: bill.rounds.map((round) => ({ round: round.round, id: round.id })),
        createdAt: settledAt,
        settledAt,
        shiftId: state.shift?.id || null,
      }

      const orders = state.orders.map((order) =>
        order.tableId === tableId && isActive(order.status)
          ? { ...order, status: ROUND_STATUS.PAID, paidAt: settledAt, invoiceId: invoice.id }
          : order,
      )

      const guestPatch = upsertGuest(
        { ...state, orders },
        {
          name: bill.guestName,
          phone: bill.guestPhone,
          visits: 1,
          spend: totals.total,
          at: settledAt,
          favoriteDish: mostOrderedDish(bill.lines),
          vegOnly: bill.lines.every((lineItem) => lineItem.isVeg),
          source: 'qr',
        },
      )

      const billDiscounts = { ...(state.billDiscounts || {}) }
      delete billDiscounts[tableId]

      const logged = logEvent(
        { ...state, orders, guests: guestPatch.guests },
        {
          type: 'settle',
          message: `${invoice.id} settled for ₹${totals.total.toFixed(2)} via ${method} — ${tableId} freed`,
          actor: cashierName || 'Cashier',
        },
      )

      return {
        ...state,
        orders,
        invoices: [invoice, ...state.invoices],
        guests: guestPatch.guests,
        seq: { ...logged.seq, invoice: invoiceSeq, guest: guestPatch.seq?.guest ?? state.seq.guest },
        events: logged.events,
        billDiscounts,
        parkedBills: { ...(state.parkedBills || {}), [tableId]: false },
        feedbackPrompt: {
          tableId,
          invoiceId: invoice.id,
          guestName: bill.guestName,
          total: totals.total,
          at: settledAt,
        },
        lastInvoiceId: invoice.id,
        chime: chime(state, 'settle'),
      }
    }

    /* ------------------------------------------------------------ guest UX */
    case 'SET_GUEST_TABLE':
      return { ...state, ui: { ...state.ui, guestTableId: action.tableId } }

    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.patch } }

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'DISMISS_FEEDBACK_PROMPT':
      return { ...state, feedbackPrompt: null }

    case 'ADD_FEEDBACK': {
      const seq = (state.seq.feedback || 0) + 1
      const entry = {
        id: `FB-${pad(seq)}`,
        guestName: action.guestName || 'Guest',
        tableId: action.tableId || null,
        rating: action.rating,
        pills: action.pills || [],
        comment: action.comment || '',
        invoiceId: action.invoiceId || null,
        at: Date.now(),
      }
      const logged = logEvent(
        { ...state, feedback: [entry, ...(state.feedback || [])] },
        {
          type: 'feedback',
          message: `${entry.guestName} rated ${entry.rating}★${entry.tableId ? ` on ${entry.tableId}` : ''}`,
          actor: entry.guestName,
        },
      )
      return {
        ...state,
        feedback: [entry, ...(state.feedback || [])],
        seq: { ...logged.seq, feedback: seq },
        events: logged.events,
        feedbackPrompt: null,
      }
    }

    case 'PUSH_NOTIFICATION': {
      const pushed = pushGuestNotification(state, action.notification)
      return { ...state, ...pushed, chime: action.silent ? state.chime : chime(state, 'broadcast') }
    }

    case 'DISMISS_PUSH':
      return {
        ...state,
        pushNotifications: (state.pushNotifications || []).filter(
          (notification) => notification.id !== action.id,
        ),
      }

    case 'CLEAR_PUSHES':
      return { ...state, pushNotifications: [] }

    /* ------------------------------------------------------------- campaigns */
    case 'SEND_CAMPAIGN': {
      const seq = (state.seq.campaign || 0) + 1
      const scheduled = Boolean(action.scheduleAt)
      const campaign = {
        id: `CMP-${pad(seq)}`,
        channel: action.channel,
        name: action.name || action.heading,
        heading: action.heading,
        body: action.body,
        coupon: action.coupon || null,
        audience: action.audience,
        audienceLabel: action.audienceLabel,
        audienceSize: action.audienceSize,
        sent: scheduled ? 0 : action.audienceSize,
        opened: 0,
        walkIns: 0,
        revenue: 0,
        status: scheduled ? 'scheduled' : 'sending',
        sentAt: scheduled ? null : Date.now(),
        scheduleAt: action.scheduleAt || null,
        createdBy: action.createdBy || 'Vinit Sharma',
      }
      const logged = logEvent(
        { ...state, campaigns: [campaign, ...state.campaigns] },
        {
          type: 'campaign',
          message: scheduled
            ? `Campaign "${campaign.name}" scheduled for ${new Date(action.scheduleAt).toLocaleString('en-IN')}`
            : `Campaign "${campaign.name}" dispatched to ${action.audienceSize} guests`,
          actor: campaign.createdBy,
        },
      )
      const withSeq = { ...state, seq: { ...logged.seq, campaign: seq } }
      const pushed = scheduled
        ? {}
        : pushGuestNotification(
            { ...withSeq, campaigns: [campaign, ...state.campaigns] },
            {
              kind: 'campaign',
              channel: action.channel,
              title: action.heading,
              body: action.body,
              coupon: action.coupon || null,
            },
          )
      return {
        ...withSeq,
        campaigns: [campaign, ...state.campaigns],
        events: logged.events,
        ...pushed,
        chime: scheduled ? state.chime : chime(state, 'broadcast'),
      }
    }

    case 'ADVANCE_CAMPAIGN': {
      const campaigns = state.campaigns.map((campaign) => {
        if (campaign.id !== action.id || campaign.status !== 'sending') return campaign
        if (campaign.opened === 0) {
          return { ...campaign, opened: Math.round(campaign.sent * 0.67) }
        }
        const walkIns = Math.round(campaign.sent * 0.25)
        return {
          ...campaign,
          walkIns,
          revenue: round2(walkIns * 156.25),
          status: 'completed',
        }
      })
      return { ...state, campaigns }
    }

    case 'DELETE_CAMPAIGN':
      return { ...state, campaigns: state.campaigns.filter((c) => c.id !== action.id) }

    /* -------------------------------------------------------------- tables */
    case 'SET_TABLE_RESERVED':
      return {
        ...state,
        tables: state.tables.map((table) =>
          table.id === action.tableId ? { ...table, reserved: action.reserved } : table,
        ),
      }

    case 'ADD_TABLE': {
      const seq = (state.seq.table || state.tables.length) + 1
      const table = action.table || {}
      return {
        ...state,
        tables: [...state.tables, { ...table, id: table.id || `T${seq}` }],
        seq: { ...state.seq, table: seq },
      }
    }

    /* ---------------------------------------------------------------- menu */
    case 'ADD_MENU_ITEM': {
      const seq = (state.seq.menu || 0) + 1
      const item = {
        id: `m${pad(seq, 2)}`,
        rating: 4.5,
        image: '',
        available: true,
        isBestseller: false,
        isVeg: true,
        ...action.item,
      }
      const logged = logEvent(
        { ...state, menu: [item, ...state.menu] },
        { type: 'menu', message: `${item.name} added to the menu at ₹${item.price}`, actor: action.actor },
      )
      return { ...state, menu: [item, ...state.menu], seq: { ...logged.seq, menu: seq }, events: logged.events }
    }

    case 'UPDATE_MENU_ITEM': {
      const menu = state.menu.map((item) =>
        item.id === action.id ? { ...item, ...action.patch } : item,
      )
      const updated = menu.find((item) => item.id === action.id)
      const logged = logEvent(
        { ...state, menu },
        {
          type: 'menu',
          message: `${updated?.name || action.id} updated`,
          actor: action.actor,
        },
      )
      return { ...state, menu, ...logged }
    }

    case 'DELETE_MENU_ITEM': {
      const target = state.menu.find((item) => item.id === action.id)
      const logged = logEvent(state, {
        type: 'menu',
        message: `${target?.name || action.id} removed from the menu`,
        actor: action.actor,
      })
      return { ...state, menu: state.menu.filter((item) => item.id !== action.id), ...logged }
    }

    /* --------------------------------------------------------------- shift */
    case 'OPEN_SHIFT': {
      const seq = (state.seq.shift || 0) + 1
      const logged = logEvent(state, {
        type: 'shift',
        message: `Shift SH-${pad(seq)} opened with a float of ₹${Number(action.openingFloat).toFixed(2)}`,
        actor: action.by,
      })
      return {
        ...state,
        shift: {
          id: `SH-${pad(seq)}`,
          isOpen: true,
          openedAt: Date.now(),
          openingFloat: round2(action.openingFloat),
          openedBy: action.by || 'Cashier',
          cashTransactions: [],
          closedShifts: state.shift?.closedShifts || [],
        },
        seq: { ...logged.seq, shift: seq },
        events: logged.events,
      }
    }

    case 'CASH_TXN': {
      const seq = (state.seq.transaction || 0) + 1
      const txn = {
        id: `CT-${pad(seq)}`,
        type: action.txnType,
        reason: action.reason,
        amount: round2(action.amount),
        at: Date.now(),
        by: action.by || 'Cashier',
      }
      const logged = logEvent(state, {
        type: 'cash',
        message: `Cash ${txn.type} · ₹${txn.amount.toFixed(2)} — ${txn.reason}`,
        actor: txn.by,
      })
      return {
        ...state,
        shift: {
          ...state.shift,
          cashTransactions: [txn, ...(state.shift.cashTransactions || [])],
        },
        seq: { ...logged.seq, transaction: seq },
        events: logged.events,
      }
    }

    case 'CLOSE_SHIFT': {
      const summary = cashDrawerSummary(state)
      const counted = round2(action.countedCash)
      const record = {
        id: state.shift.id,
        openedAt: state.shift.openedAt,
        closedAt: Date.now(),
        openingFloat: summary.openingFloat,
        cashSales: summary.cashSales,
        cashIn: summary.cashIn,
        cashOut: summary.cashOut,
        expectedCash: summary.expectedCash,
        countedCash: counted,
        variance: varianceOf(summary.expectedCash, counted),
        closedBy: action.by || 'Cashier',
        notes: action.notes || '',
      }
      const logged = logEvent(state, {
        type: 'shift',
        message: `Shift ${record.id} closed · expected ₹${record.expectedCash.toFixed(2)} vs counted ₹${record.countedCash.toFixed(2)} (${record.variance >= 0 ? '+' : ''}${record.variance.toFixed(2)})`,
        actor: record.closedBy,
      })
      return {
        ...state,
        shift: {
          ...state.shift,
          isOpen: false,
          closedAt: record.closedAt,
          closedShifts: [record, ...(state.shift.closedShifts || [])],
        },
        ...logged,
        lastClosedShift: record,
      }
    }

    /* ------------------------------------------------------------ expenses */
    case 'ADD_EXPENSE': {
      const seq = (state.seq.expense || 0) + 1
      const expense = {
        id: `EXP-${pad(seq)}`,
        category: action.category,
        amount: round2(action.amount),
        note: action.note || '',
        at: action.at || Date.now(),
        by: action.by || 'Manager',
      }
      const logged = logEvent(
        { ...state, expenses: [expense, ...state.expenses] },
        {
          type: 'expense',
          message: `${expense.category} expense logged · ₹${expense.amount.toFixed(2)}`,
          actor: expense.by,
        },
      )
      return {
        ...state,
        expenses: [expense, ...state.expenses],
        seq: { ...logged.seq, expense: seq },
        events: logged.events,
      }
    }

    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter((expense) => expense.id !== action.id) }

    /* ----------------------------------------------------------------- CRM */
    case 'UPSERT_GUEST': {
      const patch = upsertGuest(state, { ...action.patch, at: Date.now() })
      return { ...state, guests: patch.guests, seq: { ...state.seq, guest: patch.seq?.guest ?? state.seq.guest } }
    }

    case 'DELETE_GUEST':
      return { ...state, guests: state.guests.filter((guest) => guest.id !== action.id) }

    case 'SET_GUEST_OPT_OUT': {
      const guests = state.guests.map((guest) =>
        guest.id === action.id ? { ...guest, optedOut: Boolean(action.value) } : guest,
      )
      const subject = state.guests.find((guest) => guest.id === action.id)
      const logged = logEvent(
        { ...state, guests },
        {
          type: 'marketing',
          message: `${subject?.name || 'Guest'} ${action.value ? 'opted out of' : 'opted back into'} marketing`,
          actor: action.actor || state.session?.name || 'Manager',
        },
      )
      return { ...state, guests, events: logged.events, seq: logged.seq }
    }

    /* ------------------------------------------------------------ hydrate */
    case 'HYDRATE': {
      const incoming = action.state
      if (!incoming) return state
      return {
        ...state,
        ...incoming,
        chime: state.chime,
        ui: { ...state.ui, ...(incoming.ui || {}) },
        cart: { ...state.cart, ...(incoming.cart || {}), open: state.cart.open },
        session: state.session,
      }
    }

    case 'RESET_DEMO':
      clearState()
      return { ...initialiseState(), resetAt: Date.now(), chime: state.chime }

    default:
      return state
  }
}

/* ---------------------------------------------------------------- provider */

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, undefined, initialiseState)

  // 1. Initial Load from Backend Database API
  useEffect(() => {
    clearState()
    async function loadBootstrap() {
      try {
        const data = await api.getBootstrapState()
        if (data) {
          dispatch({ type: 'HYDRATE', state: data })
        }
      } catch (err) {
        console.warn('Backend unavailable', err)
      }
    }
    loadBootstrap()
  }, [])

  // 2. Realtime Socket.IO Connection & Sync
  useEffect(() => {
    let socket = null
    try {
      const socketUrl = import.meta.env?.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : 'http://localhost:4000'
      socket = io(socketUrl, { autoConnect: true, reconnection: true })

      socket.on('connect', () => {
        socket.emit('join_restaurant', 'rest_ganesh_cafe_01')
      })

      const syncWithServer = async () => {
        try {
          const data = await api.getBootstrapState()
          if (data) dispatch({ type: 'HYDRATE', state: data })
        } catch (_) {}
      }

      socket.on('order:created', syncWithServer)
      socket.on('order:updated', syncWithServer)
      socket.on('table:updated', syncWithServer)
      socket.on('menu:updated', syncWithServer)
      socket.on('shift:updated', syncWithServer)
      socket.on('invoice:created', syncWithServer)
      socket.on('feedback:created', syncWithServer)
      socket.on('campaign:created', (campaign) => {
        syncWithServer()
        if (campaign && campaign.status !== 'scheduled') {
          dispatch({
            type: 'PUSH_NOTIFICATION',
            notification: {
              kind: 'campaign',
              channel: campaign.channel || 'push',
              title: campaign.heading || campaign.name,
              body: campaign.body,
              coupon: campaign.coupon || null,
            },
          })
        }
      })
    } catch (err) {
      console.warn('Socket connection error:', err)
    }

    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  useEffect(() => onExternalStateChange((external) => dispatch({ type: 'HYDRATE', state: external })), [])

  /* Audio chimes */
  const chimeRef = useRef(state.chime?.seq || 0)
  const chimeSeq = state.chime?.seq || 0
  const chimeKind = state.chime?.kind
  useEffect(() => {
    if (chimeSeq === chimeRef.current) return
    chimeRef.current = chimeSeq
    playChime(chimeKind)
  }, [chimeSeq, chimeKind])

  useEffect(() => {
    setAudioEnabled(state.settings.soundEnabled)
  }, [state.settings.soundEnabled])

  useEffect(() => {
    const handler = () => unlockAudio()
    window.addEventListener('pointerdown', handler, { once: true })
    window.addEventListener('keydown', handler, { once: true })
    return () => {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [])

  /* Simulated campaign delivery */
  const sendingKey = (state.campaigns || [])
    .filter((campaign) => campaign.status === 'sending')
    .map((campaign) => campaign.id)
    .join(',')
  useEffect(() => {
    if (!sendingKey) return undefined
    const ids = sendingKey.split(',')
    const timers = ids.flatMap((id) => [
      window.setTimeout(() => dispatch({ type: 'ADVANCE_CAMPAIGN', id }), 2400),
      window.setTimeout(() => dispatch({ type: 'ADVANCE_CAMPAIGN', id }), 6000),
    ])
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [sendingKey])

  const newestPush = state.pushNotifications?.[0]
  useEffect(() => {
    if (!newestPush) return undefined
    const timer = window.setTimeout(
      () => dispatch({ type: 'DISMISS_PUSH', id: newestPush.id }),
      PUSH_BANNER_MS,
    )
    return () => window.clearTimeout(timer)
  }, [newestPush?.id])

  // Async API dispatch wrapper: updates local state optimistically, then persists to server
  const actions = useMemo(() => {
    const bind = (type) => (payload) => dispatch({ type, ...payload })

    return {
      dispatch,
      lockSession: bind('LOCK_SESSION'),
      unlockSession: async (payload) => {
        dispatch({ type: 'UNLOCK_SESSION', ...payload })
      },
      setSession: bind('SET_SESSION'),
      addStaff: async (payload) => {
        dispatch({ type: 'ADD_STAFF', ...payload })
        try {
          await api.createStaff(payload)
        } catch (_) {}
      },
      updateStaff: async (payload) => {
        dispatch({ type: 'UPDATE_STAFF', ...payload })
        try {
          await api.updateStaff(payload.id, payload.patch)
        } catch (_) {}
      },
      addToCart: bind('CART_ADD'),
      setCartQty: bind('CART_SET_QTY'),
      clearCart: bind('CART_CLEAR'),
      setCartGuest: bind('CART_GUEST'),
      toggleCart: bind('CART_TOGGLE'),
      dismissBanner: bind('CART_DISMISS_BANNER'),
      placeOrder: async (payload) => {
        dispatch({ type: 'PLACE_ORDER', ...payload })
        try {
          const items = Object.entries(state.cart.items).map(([id, qty]) => {
            const m = state.menu.find((entry) => entry.id === id)
            return {
              id: m.id,
              name: m.name,
              price: m.price,
              qty,
              station: m.station,
              isVeg: m.isVeg,
              note: payload.itemNotes?.[id] || '',
            }
          })
          if (items.length > 0) {
            await api.createOrderRound({
              tableId: payload.tableId,
              guestName: payload.guestName,
              guestPhone: payload.guestPhone,
              notes: payload.notes,
              items,
            })
          }
        } catch (_) {}
      },
      addRound: async (payload) => {
        dispatch({ type: 'ADD_ROUND', ...payload })
        try {
          await api.createOrderRound(payload)
        } catch (_) {}
      },
      acknowledgeOrder: async (payload) => {
        dispatch({ type: 'ACKNOWLEDGE_ORDER', ...payload })
        try {
          await api.updateOrderStatus(payload.orderId, 'accepted')
        } catch (_) {}
      },
      startCooking: async (payload) => {
        dispatch({ type: 'START_COOKING', ...payload })
        try {
          await api.updateOrderStatus(payload.orderId, 'cooking')
        } catch (_) {}
      },
      toggleItemReady: async (payload) => {
        dispatch({ type: 'TOGGLE_ITEM_READY', ...payload })
        try {
          const target = state.orders.find((o) => o.id === payload.orderId)
          if (target) {
            const ready = target.readyItemIds || []
            const has = ready.includes(payload.itemId)
            const readyItemIds = has ? ready.filter((id) => id !== payload.itemId) : [...ready, payload.itemId]
            const everyItemReady = target.items.every((item) => readyItemIds.includes(item.id))
            const nextStatus = everyItemReady ? 'ready' : target.status
            await api.updateOrderStatus(payload.orderId, nextStatus, readyItemIds)
          }
        } catch (_) {}
      },
      bumpTicket: async (payload) => {
        dispatch({ type: 'BUMP_TICKET', ...payload })
        try {
          await api.updateOrderStatus(payload.orderId, 'ready')
        } catch (_) {}
      },
      serveOrder: async (payload) => {
        dispatch({ type: 'SERVE_ORDER', ...payload })
        try {
          await api.updateOrderStatus(payload.orderId, 'served')
        } catch (_) {}
      },
      voidOrder: async (payload) => {
        dispatch({ type: 'VOID_ORDER', ...payload })
        try {
          await api.updateOrderStatus(payload.orderId, 'void')
        } catch (_) {}
      },
      callWaiter: bind('CALL_WAITER'),
      resolveAlert: bind('RESOLVE_ALERT'),
      clearResolvedAlerts: bind('CLEAR_RESOLVED_ALERTS'),
      setBillDiscount: bind('SET_BILL_DISCOUNT'),
      setBillCoupon: bind('SET_BILL_COUPON'),
      parkBill: bind('PARK_BILL'),
      transferTable: bind('TRANSFER_TABLE'),
      settleBill: async (payload) => {
        dispatch({ type: 'SETTLE_BILL', ...payload })
        try {
          await api.settleBill({
            tableId: payload.tableId,
            method: payload.method,
            tendered: payload.tendered,
            discount: payload.discount,
          })
        } catch (_) {}
      },
      setGuestTable: bind('SET_GUEST_TABLE'),
      setUi: bind('SET_UI'),
      setSetting: bind('SET_SETTING'),
      dismissFeedbackPrompt: bind('DISMISS_FEEDBACK_PROMPT'),
      addFeedback: async (payload) => {
        dispatch({ type: 'ADD_FEEDBACK', ...payload })
        try {
          await api.createFeedback(payload)
        } catch (_) {}
      },
      pushNotification: bind('PUSH_NOTIFICATION'),
      dismissPush: bind('DISMISS_PUSH'),
      clearPushes: bind('CLEAR_PUSHES'),
      sendCampaign: async (payload) => {
        dispatch({ type: 'SEND_CAMPAIGN', ...payload })
        try {
          await api.createCampaign(payload)
        } catch (_) {}
      },
      deleteCampaign: bind('DELETE_CAMPAIGN'),
      setTableReserved: async (payload) => {
        dispatch({ type: 'SET_TABLE_RESERVED', ...payload })
        try {
          await api.updateTable(payload.tableId, { reserved: payload.reserved })
        } catch (_) {}
      },
      addMenuItems: async (payload) => {
        dispatch({ type: 'ADD_MENU_ITEM', ...payload })
        try {
          await api.createMenuItem(payload.item)
        } catch (_) {}
      },
      updateMenuItem: async (payload) => {
        dispatch({ type: 'UPDATE_MENU_ITEM', ...payload })
        try {
          await api.updateMenuItem(payload.id, payload.patch)
        } catch (_) {}
      },
      deleteMenuItem: async (payload) => {
        dispatch({ type: 'DELETE_MENU_ITEM', ...payload })
        try {
          await api.deleteMenuItem(payload.id)
        } catch (_) {}
      },
      openShift: async (payload) => {
        dispatch({ type: 'OPEN_SHIFT', ...payload })
        try {
          await api.openShift(payload.openingFloat, payload.by)
        } catch (_) {}
      },
      cashTransaction: async (payload) => {
        dispatch({ type: 'CASH_TXN', ...payload })
        try {
          await api.addCashTransaction(payload.txnType, payload.reason, payload.amount, payload.by)
        } catch (_) {}
      },
      closeShift: async (payload) => {
        dispatch({ type: 'CLOSE_SHIFT', ...payload })
        try {
          await api.closeShift(payload.countedCash, payload.by, payload.notes)
        } catch (_) {}
      },
      addExpense: async (payload) => {
        dispatch({ type: 'ADD_EXPENSE', ...payload })
        try {
          await api.createExpense(payload)
        } catch (_) {}
      },
      deleteExpense: bind('DELETE_EXPENSE'),
      upsertGuest: bind('UPSERT_GUEST'),
      deleteGuest: bind('DELETE_GUEST'),
      setGuestOptOut: async (payload) => {
        dispatch({ type: 'SET_GUEST_OPT_OUT', ...payload })
        try {
          await api.toggleGuestOptOut(payload.id, payload.value)
        } catch (_) {}
      },
      resetDemo: () => dispatch({ type: 'RESET_DEMO' }),
      unlockAudio,
    }
  }, [state])

  const value = useMemo(() => ({ state, actions, dispatch }), [state, actions])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside <StoreProvider>')
  return context
}

export function useStoreState() {
  return useStore().state
}

export function useActions() {
  return useStore().actions
}

export function useCurrentStaff() {
  const { state } = useStore()
  return (state.staff || []).find((member) => member.id === state.session.staffId) || null
}

export function useCartLines() {
  const { state } = useStore()
  return useMemo(() => {
    return Object.entries(state.cart.items)
      .map(([id, qty]) => {
        const item = state.menu.find((entry) => entry.id === id)
        return item ? { ...item, qty } : null
      })
      .filter(Boolean)
  }, [state.cart.items, state.menu])
}

export { StoreContext }
