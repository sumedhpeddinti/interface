// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PROMO_CODES,
  QR_TYPES,
  buildQrUrl,
  copyToClipboard,
  downloadFile,
  makeQrSvg,
  originOf,
  printPage,
  responsiveSvg,
  securityHashFor,
  slugify,
} from './qr'
import { COUPONS } from './pricing'

/* The QR studio prints real cards, so these tests check the payload actually
   encodes to a scannable SVG rather than a placeholder box. */

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('qr destinations', () => {
  it('builds a URL for every documented type', () => {
    const origin = originOf()
    expect(buildQrUrl('table', { tableId: 'T7' })).toBe(`${origin}/?table=T7`)
    expect(buildQrUrl('promo', { code: 'WELCOME20' })).toBe(`${origin}/?promo=WELCOME20`)
    expect(buildQrUrl('feedback')).toBe(`${origin}/?feedback=1`)
    expect(buildQrUrl('custom', { customUrl: 'https://example.com/x' })).toBe('https://example.com/x')
  })

  it('escapes a table id and falls back sensibly', () => {
    expect(buildQrUrl('table', { tableId: 'T 1' })).toMatch(/table=T%201$/)
    expect(buildQrUrl('custom', { customUrl: '' })).toBe(originOf())
    expect(buildQrUrl('nonsense')).toBe(originOf())
  })

  it('lists the four card types the studio prints', () => {
    expect(QR_TYPES.map((type) => type.id)).toEqual(['table', 'promo', 'feedback', 'custom'])
    for (const type of QR_TYPES) {
      expect(type.label).toBeTruthy()
      expect(type.description).toBeTruthy()
    }
  })

  it('only offers promo codes that the pricing engine knows', () => {
    expect(PROMO_CODES.length).toBeGreaterThan(0)
    for (const code of PROMO_CODES) {
      expect(COUPONS[code]).toBeTruthy()
      expect(buildQrUrl('promo', { code })).toContain(code)
    }
  })

  it('stamps a deterministic security hash per destination', () => {
    const url = buildQrUrl('table', { tableId: 'T1' })
    expect(securityHashFor(url)).toBe(securityHashFor(url))
    expect(securityHashFor(url)).toMatch(/^GC-[0-9A-F]{6}$/)
    expect(securityHashFor(buildQrUrl('table', { tableId: 'T2' }))).not.toBe(
      securityHashFor(url),
    )
  })
})

describe('svg generation', () => {
  it('encodes real QR modules for a destination', async () => {
    const svg = await makeQrSvg(buildQrUrl('table', { tableId: 'T1' }))
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox')
    /* A real code is a path of many module segments, not a token box. */
    expect(svg.length).toBeGreaterThan(500)
  })

  it('produces a different code for a different destination', async () => {
    const [first, second] = await Promise.all([
      makeQrSvg(buildQrUrl('table', { tableId: 'T1' })),
      makeQrSvg(buildQrUrl('table', { tableId: 'T2' })),
    ])
    expect(first).not.toBe(second)
  })

  it('respects the requested ink colour', async () => {
    const svg = await makeQrSvg('hello', { dark: '#ff0000' })
    expect(svg.toLowerCase()).toContain('#ff0000')
  })

  it('scales the generated svg to its container', () => {
    const scaled = responsiveSvg('<svg width="176" height="176" viewBox="0 0 31 31"></svg>')
    expect(scaled).toContain('width="100%"')
    expect(scaled).toContain('height="100%"')
    expect(scaled).toContain('viewBox="0 0 31 31"')
    expect(responsiveSvg('')).toBe('')
  })

  it('slugifies a label for the downloaded filename', () => {
    expect(slugify('Table T1')).toBe('table-t1')
    expect(slugify('  Promotions / Deal ')).toBe('promotions-deal')
    expect(slugify('')).toBe('')
  })
})

describe('browser side effects', () => {
  it('copies to the clipboard when the browser allows it', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyToClipboard('GC-1234')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('GC-1234')
  })

  it('reports failure instead of throwing when the clipboard is blocked', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn(async () => {
          throw new Error('denied')
        }),
      },
    })
    expect(await copyToClipboard('GC-1234')).toBe(false)
    vi.stubGlobal('navigator', {})
    expect(await copyToClipboard('GC-1234')).toBe(false)
  })

  it('downloads a file through an anchor without leaking the object URL', () => {
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    expect(downloadFile('ganesh-t1.svg', '<svg></svg>')).toBe(true)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('prints through the browser dialog', () => {
    const print = vi.fn()
    vi.stubGlobal('window', { ...window, print })
    printPage()
    expect(print).toHaveBeenCalled()
  })
})
