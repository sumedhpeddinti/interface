/* Formatting helpers — money, clocks, durations, hashes.
   Money is always rendered with tabular figures via the `.tnum` class. */

export function num(value) {
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

export function round2(value) {
  return Math.round((num(value) + Number.EPSILON) * 100) / 100
}

/** ₹1,234.50 — Indian digit grouping. */
export function inr(value, digits = 2) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num(value))
}

/** ₹1,234.50 */
export function money(value, digits = 2) {
  return `₹${inr(value, digits)}`
}

/** ₹48.7k / ₹1.2L — for dense dashboard KPI tiles. */
export function compactMoney(value) {
  const n = num(value)
  const abs = Math.abs(n)
  if (abs >= 10000000) return `₹${round2(n / 10000000)}Cr`
  if (abs >= 100000) return `₹${round2(n / 100000)}L`
  if (abs >= 1000) return `₹${round2(n / 1000)}k`
  return money(n, 0)
}

export function pct(part, whole, digits = 0) {
  const w = num(whole)
  if (w === 0) return 0
  /* The requested precision is the point: rates read as "67%", not "67.47%". */
  const factor = 10 ** Math.max(0, Math.min(6, digits))
  return Math.round(((num(part) / w) * 100) * factor) / factor
}

/** 6:42 pm */
export function clock(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** 17 Sep */
export function dateLabel(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

/** 17 Sep, 6:42 pm */
export function dateTimeLabel(ts) {
  if (!ts) return '—'
  return `${dateLabel(ts)}, ${clock(ts)}`
}

/** Today / Yesterday / 3 days ago / 17 Aug */
export function relativeDay(ts, now = Date.now()) {
  if (!ts) return '—'
  const days = Math.floor((now - new Date(ts).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return dateLabel(ts)
}

/** 04:12 — microwave style, used for seated / prep timers. */
export function stopwatch(ms) {
  const total = Math.max(0, Math.floor(num(ms) / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 12m 30s — human readable elapsed time. */
export function duration(ms) {
  const total = Math.max(0, Math.floor(num(ms) / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return `${s}s`
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${String(s).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}

/** "waiting 2 min" */
export function elapsedLabel(ts, now = Date.now()) {
  const mins = Math.floor((now - new Date(ts).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min`
  return duration(now - new Date(ts).getTime())
}

export function minutesSince(ts, now = Date.now()) {
  return (now - new Date(ts).getTime()) / 60000
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** Short deterministic hash — used for the QR security hash and order references. */
export function shortHash(input, salt = 'GaneshCafe') {
  const str = `${salt}:${input}`
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < str.length; i += 1) {
    const c = str.charCodeAt(i)
    h1 = (h1 ^ c) * 0x01000193
    h2 = (h2 + c * 31) ^ (h2 << 5)
    h1 >>>= 0
    h2 >>>= 0
  }
  const hex = (h1.toString(16) + h2.toString(16)).padEnd(8, '0')
  return hex.slice(0, 6).toUpperCase()
}

export function classNames(...values) {
  return values.flat().filter(Boolean).join(' ')
}

/** Stable id generator: ORD-1042, INV/26-27/0004, EXP-0009 */
export function makeId(prefix, seq, pad = 4) {
  return `${prefix}${String(seq).padStart(pad, '0')}`
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`
}

export function sameDay(ts, reference) {
  if (!ts) return false
  const a = new Date(ts)
  const b = new Date(reference)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
