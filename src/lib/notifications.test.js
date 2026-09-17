import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  notificationPayload,
  notificationPermission,
  permissionLabel,
  permissionTone,
  registerNotificationWorker,
  showSystemNotification,
} from './notifications'

/* The notification layer only ever reports what it actually achieved, so these
   drive it against a fake browser and assert the outcome — including the case
   where the browser refuses and nothing is delivered at all. */

function fakeBrowser({ permission = 'granted', workerSupported = true } = {}) {
  const shownViaWorker = []
  const shownViaConstructor = []

  function FakeNotification(title, options) {
    shownViaConstructor.push({ title, options })
    this.title = title
    this.close = () => {}
  }
  FakeNotification.permission = permission
  FakeNotification.requestPermission = vi.fn(async () => permission)

  const registration = {
    showNotification: vi.fn(async (title, options) => {
      shownViaWorker.push({ title, options })
    }),
    getNotifications: vi.fn(async () => []),
  }

  const serviceWorker = workerSupported
    ? {
        getRegistration: vi.fn(async () => registration),
        register: vi.fn(async () => registration),
      }
    : undefined

  vi.stubGlobal('window', { Notification: FakeNotification, isSecureContext: true })
  vi.stubGlobal('navigator', serviceWorker ? { serviceWorker } : {})

  return { shownViaWorker, shownViaConstructor, registration, serviceWorker, FakeNotification }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('permission reporting', () => {
  it('reports the browser permission verbatim', () => {
    fakeBrowser({ permission: 'granted' })
    expect(notificationPermission()).toBe('granted')
  })

  it('reports "default" when permission has not been asked for', () => {
    fakeBrowser({ permission: '' })
    expect(notificationPermission()).toBe('default')
  })

  it('reports unsupported instead of pretending', () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', {})
    expect(notificationPermission()).toBe('unsupported')
    expect(permissionLabel('unsupported')).toMatch(/no notification support/i)
  })

  it('maps each permission onto a tone and an honest label', () => {
    expect(permissionTone('granted')).toBe('emerald')
    expect(permissionTone('denied')).toBe('rose')
    expect(permissionTone('default')).toBe('amber')
    expect(permissionLabel('denied')).toMatch(/refusing/i)
    expect(permissionLabel('default')).toMatch(/not asked/i)
  })
})

describe('payload mapping', () => {
  it('maps a campaign entry onto the shape the operating system expects', () => {
    const payload = notificationPayload(
      {
        id: 'PN-0009',
        kind: 'campaign',
        channel: 'whatsapp',
        title: 'We miss you! Flat 20% Off',
        body: 'Enjoy flat 20% off this weekend.',
        coupon: 'WELCOME20',
      },
      'Ganesh Café',
    )
    expect(payload.title).toBe('We miss you! Flat 20% Off')
    expect(payload.tag).toBe('PN-0009')
    expect(payload.coupon).toBe('WELCOME20')
    expect(payload.source).toBe('WhatsApp · Ganesh Café')
  })

  it('labels a kitchen push as the kitchen', () => {
    const payload = notificationPayload({ id: 'PN-1', kind: 'kitchen', title: 'Round 2 up' })
    expect(payload.source).toMatch(/^Kitchen ·/)
    expect(payload.title).toBe('Round 2 up')
  })

  it('has nothing to send without an entry', () => {
    expect(notificationPayload(null)).toBeNull()
  })
})

describe('delivery', () => {
  it('delivers through the service worker when permission is granted', async () => {
    const browser = fakeBrowser({ permission: 'granted' })
    const result = await showSystemNotification({
      title: 'Test broadcast',
      body: 'Hello table 4',
      tag: 'ganesh-test',
      id: 'PN-42',
    })

    expect(result).toEqual({ shown: true, via: 'service-worker' })
    expect(browser.shownViaWorker).toHaveLength(1)
    expect(browser.shownViaWorker[0].title).toBe('Test broadcast')
    expect(browser.shownViaWorker[0].options.body).toBe('Hello table 4')
    expect(browser.shownViaWorker[0].options.tag).toBe('ganesh-test')
    expect(browser.shownViaWorker[0].options.data.id).toBe('PN-42')
    expect(browser.shownViaConstructor).toHaveLength(0)
  })

  it('never claims delivery when permission was refused', async () => {
    const browser = fakeBrowser({ permission: 'denied' })
    const result = await showSystemNotification({ title: 'Should not appear' })
    expect(result.shown).toBe(false)
    expect(result.via).toBe('permission')
    expect(browser.shownViaWorker).toHaveLength(0)
    expect(browser.shownViaConstructor).toHaveLength(0)
  })

  it('falls back to the constructor when the worker path fails', async () => {
    const browser = fakeBrowser({ permission: 'granted' })
    browser.registration.showNotification.mockRejectedValueOnce(new Error('worker gone'))

    const result = await showSystemNotification({ title: 'Fallback', body: 'still delivered' })
    expect(result).toEqual({ shown: true, via: 'constructor' })
    expect(browser.shownViaConstructor[0].title).toBe('Fallback')
  })

  it('omits renotify when there is no tag, which Chrome rejects outright', async () => {
    const browser = fakeBrowser({ permission: 'granted' })
    await showSystemNotification({ title: 'No tag here' })
    const options = browser.shownViaWorker[0].options
    expect('renotify' in options).toBe(false)
    expect('tag' in options).toBe(false)
  })

  it('refuses to send an empty notification', async () => {
    fakeBrowser({ permission: 'granted' })
    expect(await showSystemNotification({ title: '' })).toEqual({ shown: false, via: 'empty' })
  })

  it('reports unsupported rather than throwing when the API is missing', async () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', {})
    const result = await showSystemNotification({ title: 'Nowhere to go' })
    expect(result).toEqual({ shown: false, via: 'unsupported' })
  })
})

describe('worker registration', () => {
  it('registers the notification-only worker at the root scope', async () => {
    const browser = fakeBrowser()
    const registration = await registerNotificationWorker()
    expect(registration).toBeTruthy()
    expect(browser.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('returns null when service workers are unavailable', async () => {
    vi.stubGlobal('window', { isSecureContext: true })
    vi.stubGlobal('navigator', {})
    expect(await registerNotificationWorker()).toBeNull()
  })
})
