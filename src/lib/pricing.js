/* Single pricing engine for the whole platform.
   Menu prices are tax-exclusive. Discount -> CGST/SGST 2.5% each -> Total. */

import { num, round2 } from './format.js'

export const GST_RATE = 0.05
export const CGST_RATE = 0.025
export const SGST_RATE = 0.025

/** Auto-applied welcome offer from the guest banner. */
export const WELCOME_OFFER = {
  threshold: 500,
  percent: 10,
  code: 'WELCOME10',
  label: 'Welcome offer · Flat 10% off',
}

/**
 * The reward for installing the guest app. Deliberately better than the
 * welcome offer it sits next to: same 10%, but with no minimum spend, so the
 * guest can see and keep the discount on a single cup of chai.
 */
export const INSTALL_REWARD = {
  code: 'APP10',
  percent: 10,
  label: '10% off · app install reward',
}

export const COUPONS = {
  WELCOME20: {
    code: 'WELCOME20',
    mode: 'percent',
    value: 20,
    max: 150,
    min: 400,
    label: '20% off up to ₹150',
  },
  FLAT50: { code: 'FLAT50', mode: 'flat', value: 50, min: 300, label: 'Flat ₹50 off' },
  FEAST100: { code: 'FEAST100', mode: 'flat', value: 100, min: 700, label: '₹100 off above ₹700' },
  PANEER15: { code: 'PANEER15', mode: 'percent', value: 15, max: 120, min: 0, label: '15% off up to ₹120' },
  [INSTALL_REWARD.code]: {
    code: INSTALL_REWARD.code,
    mode: 'percent',
    value: INSTALL_REWARD.percent,
    max: null,
    min: 0,
    label: INSTALL_REWARD.label,
  },
}

/**
 * The install reward as a bill discount, or null when the guest has not
 * installed the app. Carried onto the table's bill when they order, so the
 * cashier never has to re-enter a code to honour it.
 */
export function installRewardDiscount() {
  return {
    mode: 'percent',
    value: INSTALL_REWARD.percent,
    max: null,
    source: 'install',
    code: INSTALL_REWARD.code,
    label: INSTALL_REWARD.label,
  }
}

export function discountAmountFor(subtotal, discount) {
  if (!discount || !discount.mode) return 0
  const base = num(subtotal)
  let amount = 0
  if (discount.mode === 'percent') {
    amount = (base * num(discount.value)) / 100
    if (Number.isFinite(discount.max) && discount.max > 0) amount = Math.min(amount, discount.max)
  } else {
    amount = num(discount.value)
  }
  return Math.max(0, Math.min(base, amount))
}

export function autoDiscount(subtotal) {
  if (num(subtotal) >= WELCOME_OFFER.threshold) {
    return {
      mode: 'percent',
      value: WELCOME_OFFER.percent,
      max: null,
      source: 'welcome',
      code: WELCOME_OFFER.code,
      label: WELCOME_OFFER.label,
    }
  }
  return null
}

/** A manual cashier discount or coupon always wins over the welcome offer. */
export function resolveDiscount(subtotal, manual) {
  if (manual && manual.mode) return { ...manual, source: manual.source || 'manual' }
  return autoDiscount(subtotal)
}

export function applyCoupon(subtotal, code) {
  const key = String(code || '').trim().toUpperCase()
  const coupon = COUPONS[key]
  if (!coupon) return { ok: false, error: `Coupon ${key || '—'} is not recognised` }
  if (num(subtotal) < num(coupon.min)) {
    return {
      ok: false,
      error: `Add ₹${round2(num(coupon.min) - num(subtotal))} more to use ${coupon.code}`,
    }
  }
  return {
    ok: true,
    discount: {
      mode: coupon.mode,
      value: coupon.value,
      max: coupon.max ?? null,
      source: 'coupon',
      code: coupon.code,
      label: coupon.label,
    },
  }
}

export function lineTotal(line) {
  return round2(num(line.price) * num(line.qty))
}

export function subtotalOf(lines = []) {
  return round2(lines.reduce((sum, line) => sum + lineTotal(line), 0))
}

export function itemCountOf(lines = []) {
  return lines.reduce((sum, line) => sum + num(line.qty), 0)
}

/**
 * @param {Array<{price:number, qty:number}>} lines
 * @param {null|{mode:'percent'|'flat', value:number, max?:number}} manualDiscount
 */
export function computeTotals(lines = [], manualDiscount = null) {
  const subtotal = subtotalOf(lines)
  const applied = resolveDiscount(subtotal, manualDiscount)
  const discountAmount = round2(discountAmountFor(subtotal, applied))
  const taxable = round2(subtotal - discountAmount)
  const cgst = round2(taxable * CGST_RATE)
  const sgst = round2(taxable * SGST_RATE)
  const tax = round2(cgst + sgst)
  const total = round2(taxable + tax)

  return {
    subtotal,
    discount: applied,
    discountAmount,
    taxable,
    cgst,
    sgst,
    tax,
    total,
    itemCount: itemCountOf(lines),
    savings: discountAmount,
    gstRatePercent: GST_RATE * 100,
  }
}

/** Flatten a table's rounds into bill lines and total them. */
export function computeBill(rounds = [], manualDiscount = null) {
  const lines = []
  for (const round of rounds || []) {
    for (const item of round.items || []) {
      lines.push({ ...item, round: round.round })
    }
  }
  const totals = computeTotals(lines, manualDiscount)
  return { ...totals, lines }
}

export function changeDue(total, tendered) {
  return round2(num(tendered) - num(total))
}

/** Progress towards the welcome offer — drives the guest banner hint. */
export function welcomeProgress(subtotal) {
  const remaining = round2(WELCOME_OFFER.threshold - num(subtotal))
  return {
    qualified: remaining <= 0,
    remaining: Math.max(0, remaining),
    percent: Math.min(100, Math.round((num(subtotal) / WELCOME_OFFER.threshold) * 100)),
  }
}

export function paymentChangeSplit(method, tendered, total) {
  return {
    method,
    tendered: round2(tendered),
    total: round2(total),
    change: changeDue(total, tendered),
  }
}
