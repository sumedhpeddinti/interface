import { describe, expect, it } from 'vitest'
import {
  classNames,
  clock,
  compactMoney,
  dateLabel,
  dateTimeLabel,
  duration,
  elapsedLabel,
  inr,
  initials,
  makeId,
  minutesSince,
  money,
  num,
  pct,
  pluralize,
  relativeDay,
  round2,
  sameDay,
  shortHash,
  startOfDay,
  stopwatch,
} from './format'

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime()

describe('numbers and money', () => {
  it('coerces anything unparseable to zero', () => {
    expect(num('12.5')).toBe(12.5)
    expect(num(undefined)).toBe(0)
    expect(num(null)).toBe(0)
    expect(num('abc')).toBe(0)
    expect(num(NaN)).toBe(0)
    expect(num(Infinity)).toBe(0)
  })

  it('rounds to paise without floating point drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(1.005)).toBe(1.01)
    expect(round2('2.345')).toBe(2.35)
    expect(round2(undefined)).toBe(0)
  })

  it('groups money in the Indian system', () => {
    expect(inr(1234.5)).toBe('1,234.50')
    expect(inr(1234567.891)).toBe('12,34,567.89')
    expect(money(230)).toBe('₹230.00')
    expect(money(0)).toBe('₹0.00')
    expect(money(undefined)).toBe('₹0.00')
  })

  it('compacts money for KPI tiles', () => {
    expect(compactMoney(48750)).toBe('₹48.75k')
    expect(compactMoney(250000)).toBe('₹2.5L')
    expect(compactMoney(10000000)).toBe('₹1Cr')
    expect(compactMoney(940)).toBe('₹940')
  })

  it('honours the requested precision for percentages', () => {
    expect(pct(842, 1248)).toBe(67)
    expect(pct(842, 1248, 1)).toBe(67.5)
    expect(pct(1, 3, 2)).toBe(33.33)
    expect(pct(312, 1248)).toBe(25)
    expect(pct(5, 0)).toBe(0)
    expect(pct(0, 10)).toBe(0)
    expect(pct(50, 100, 99)).toBe(50)
  })
})

describe('clocks and durations', () => {
  it('renders a 12 hour clock', () => {
    expect(clock(at(2026, 9, 17, 15, 5))).toMatch(/3:05/)
    expect(clock(0)).toBe('—')
  })

  it('renders short and long dates', () => {
    expect(dateLabel(at(2026, 8, 17))).toBe('17 Aug')
    expect(dateTimeLabel(at(2026, 8, 17, 12, 44))).toBe('17 Aug, 12:44 pm')
    expect(dateLabel(0)).toBe('—')
  })

  it('describes relative days', () => {
    const now = at(2026, 9, 17)
    expect(relativeDay(now - 3600_000, now)).toBe('Today')
    expect(relativeDay(now - 86_400_000, now)).toBe('Yesterday')
    expect(relativeDay(now - 3 * 86_400_000, now)).toBe('3 days ago')
    expect(relativeDay(now - 14 * 86_400_000, now)).toBe('2w ago')
    expect(relativeDay(0)).toBe('—')
  })

  it('formats a stopwatch and a human duration', () => {
    expect(stopwatch(0)).toBe('00:00')
    expect(stopwatch(65_000)).toBe('01:05')
    expect(stopwatch(600_000)).toBe('10:00')
    expect(stopwatch(-5000)).toBe('00:00')
    expect(duration(45_000)).toBe('45s')
    expect(duration(600_000)).toBe('10m')
    expect(duration(125_000)).toBe('2m 05s')
    expect(duration(3_930_000)).toBe('1h 05m')
  })

  it('labels a wait in plain words', () => {
    const now = at(2026, 9, 17, 12, 30)
    expect(elapsedLabel(now - 30_000, now)).toBe('just now')
    expect(elapsedLabel(now - 120_000, now)).toBe('2 min')
    expect(elapsedLabel(now - 5_400_000, now)).toBe('1h 30m')
    expect(minutesSince(now - 600_000, now)).toBe(10)
  })

  it('compares and floors to a calendar day', () => {
    const morning = at(2026, 9, 17, 9, 15)
    const night = at(2026, 9, 17, 23, 45)
    expect(sameDay(morning, night)).toBe(true)
    expect(sameDay(morning, at(2026, 9, 18))).toBe(false)
    expect(sameDay(0, night)).toBe(false)
    expect(new Date(startOfDay(night)).getHours()).toBe(0)
    expect(startOfDay(night)).toBeLessThanOrEqual(night)
  })
})

describe('text helpers', () => {
  it('takes up to two initials', () => {
    expect(initials('Vinit Sharma')).toBe('VS')
    expect(initials('Vinit')).toBe('V')
    expect(initials('')).toBe('')
    expect(initials('diya  patel singh')).toBe('DP')
  })

  it('hashes deterministically and sensitively', () => {
    const a = shortHash('https://x/?table=T1')
    expect(a).toBe(shortHash('https://x/?table=T1'))
    expect(a).toHaveLength(6)
    expect(a).toMatch(/^[0-9A-F]{6}$/)
    expect(shortHash('https://x/?table=T2')).not.toBe(a)
    expect(shortHash('https://x/?table=T1', 'OtherSalt')).not.toBe(a)
  })

  it('joins class names and drops the falsey ones', () => {
    expect(classNames('a', false, null, undefined, '', 'b')).toBe('a b')
    expect(classNames(['a', 'b'], 'c')).toBe('a b c')
    expect(classNames()).toBe('')
  })

  it('pads ids and pluralises', () => {
    expect(makeId('ORD-', 42)).toBe('ORD-0042')
    expect(makeId('EXP-', 9, 3)).toBe('EXP-009')
    expect(pluralize(1, 'round')).toBe('1 round')
    expect(pluralize(3, 'round')).toBe('3 rounds')
    expect(pluralize(2, 'guest', 'guests')).toBe('2 guests')
  })
})
