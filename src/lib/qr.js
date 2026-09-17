/* QR Studio helpers — real, scannable QR codes rendered as inline SVG. */

import QRCode from 'qrcode'
import { shortHash } from './format'

export const QR_TYPES = [
  {
    id: 'table',
    label: 'Table Menu',
    description: 'Opens the guest menu locked to that table',
    hint: '/?table=T[n]',
  },
  {
    id: 'promo',
    label: 'Promotions / Deal',
    description: 'Opens the menu carrying a promotional voucher',
    hint: '/?promo=CODE',
  },
  {
    id: 'feedback',
    label: 'Feedback Only',
    description: 'Opens the guest review sheet directly',
    hint: '/?feedback=1',
  },
  {
    id: 'custom',
    label: 'Custom Destination',
    description: 'Encodes any URL you paste in',
    hint: 'https://…',
  },
]

export const PROMO_CODES = ['WELCOME20', 'FLAT50', 'FEAST100', 'PANEER15']

export function originOf() {
  if (typeof window !== 'undefined' && window.location) return window.location.origin
  return 'https://ganeshcafe.example'
}

export function buildQrUrl(type, options = {}) {
  const { tableId = 'T1', code = 'WELCOME20', customUrl = '' } = options
  const origin = originOf()
  switch (type) {
    case 'table':
      return `${origin}/?table=${encodeURIComponent(tableId)}`
    case 'promo':
      return `${origin}/?promo=${encodeURIComponent(code)}`
    case 'feedback':
      return `${origin}/?feedback=1`
    case 'custom':
      return (customUrl || origin).trim()
    default:
      return origin
  }
}

export function securityHashFor(url) {
  return `GC-${shortHash(url)}`
}

/**
 * @returns {Promise<string>} an inline `<svg>` document string
 */
export async function makeQrSvg(text, options = {}) {
  const { width = 176, margin = 1, dark = '#18181b' } = options
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      width,
      margin,
      errorCorrectionLevel: 'M',
      color: { dark, light: '#ffffff' },
    })
  } catch {
    return ''
  }
}

/** Make the generated SVG scale to its container while keeping the viewBox. */
export function responsiveSvg(svg) {
  if (!svg) return ''
  return svg
    .replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1 width="100%"')
    .replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1 height="100%"')
}

export async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  return false
}

export function downloadFile(filename, content, mime = 'image/svg+xml;charset=utf-8') {
  try {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch {
    return false
  }
}

export function printPage() {
  if (typeof window !== 'undefined') window.print()
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
