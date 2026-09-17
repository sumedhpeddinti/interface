import { describe, expect, it } from 'vitest'
import {
  CGST_RATE,
  COUPONS,
  WELCOME_OFFER,
  applyCoupon,
  changeDue,
  computeTotals,
  discountAmountFor,
  resolveDiscount,
  subtotalOf,
  welcomeProgress,
} from './pricing'

const lines = (...pairs) => pairs.map(([price, qty]) => ({ price, qty }))

describe('subtotal', () => {
  it('multiplies price by quantity and rounds to paise', () => {
    expect(subtotalOf(lines([230, 2], [60, 2], [140, 1]))).toBe(720)
  })

  it('handles an empty bill', () => {
    expect(subtotalOf([])).toBe(0)
  })
})

describe('discounts', () => {
  it('does not auto-apply the welcome offer below the threshold', () => {
    const totals = computeTotals(lines([200, 2]))
    expect(totals.subtotal).toBe(400)
    expect(totals.discount).toBeNull()
    expect(totals.discountAmount).toBe(0)
  })

  it('auto-applies 10% at exactly the threshold', () => {
    const totals = computeTotals(lines([250, 2]))
    expect(WELCOME_OFFER.threshold).toBe(500)
    expect(totals.discountAmount).toBe(50)
    expect(totals.taxable).toBe(450)
  })

  it('caps a flat discount at the subtotal', () => {
    expect(discountAmountFor(30, { mode: 'flat', value: 500 })).toBe(30)
  })

  it('caps a percentage discount at its maximum', () => {
    expect(discountAmountFor(1000, { mode: 'percent', value: 20, max: 150 })).toBe(150)
  })

  it('lets a manual discount override the welcome offer', () => {
    const resolved = resolveDiscount(720, { mode: 'flat', value: 100 })
    expect(resolved.source).toBe('manual')
    expect(resolved.value).toBe(100)
  })

  it('falls back to the welcome offer when no manual discount is set', () => {
    expect(resolveDiscount(720, null).source).toBe('welcome')
    expect(resolveDiscount(100, null)).toBeNull()
  })
})

describe('GST', () => {
  it('splits 5% into CGST and SGST on the taxable value', () => {
    const totals = computeTotals(lines([1100, 1]))
    expect(totals.discountAmount).toBe(110)
    expect(totals.taxable).toBe(990)
    expect(totals.cgst).toBe(24.75)
    expect(totals.sgst).toBe(24.75)
    expect(totals.tax).toBe(49.5)
    expect(totals.total).toBe(1039.5)
  })

  it('taxes the full amount when no discount applies', () => {
    const totals = computeTotals(lines([100, 1]))
    expect(totals.cgst).toBe(100 * CGST_RATE)
    expect(totals.total).toBe(105)
  })

  it('always resolves total as taxable plus tax', () => {
    for (const subtotal of [50, 499, 500, 1234, 9999]) {
      const totals = computeTotals(lines([subtotal, 1]))
      expect(Number((totals.taxable + totals.tax).toFixed(2))).toBe(totals.total)
    }
  })

  it('reports the item count', () => {
    expect(computeTotals(lines([100, 3], [50, 2])).itemCount).toBe(5)
  })
})

describe('coupons', () => {
  it('applies a percentage coupon with a cap', () => {
    const result = applyCoupon(1000, 'WELCOME20')
    expect(result.ok).toBe(true)
    expect(discountAmountFor(1000, result.discount)).toBe(COUPONS.WELCOME20.max)
  })

  it('rejects a coupon below its minimum spend', () => {
    const result = applyCoupon(100, 'FLAT50')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Add/)
  })

  it('rejects an unknown coupon', () => {
    expect(applyCoupon(1000, 'NOPE').ok).toBe(false)
  })

  it('is case insensitive', () => {
    expect(applyCoupon(500, ' flat50 ').ok).toBe(true)
  })
})

describe('change and offer progress', () => {
  it('computes change due', () => {
    expect(changeDue(1039.5, 1100)).toBe(60.5)
    expect(changeDue(500, 200)).toBe(-300)
  })

  it('tracks progress towards the welcome offer', () => {
    expect(welcomeProgress(300).remaining).toBe(200)
    expect(welcomeProgress(300).qualified).toBe(false)
    expect(welcomeProgress(600).qualified).toBe(true)
    expect(welcomeProgress(600).remaining).toBe(0)
    expect(welcomeProgress(250).percent).toBe(50)
  })
})
