import { afterEach, describe, expect, it, vi } from 'vitest'

/* The install layer only ever reports what the browser actually offered, so
   these drive it against a fake browser: a real install prompt, a refused one,
   an install that finished out of band, and a browser that never offers a
   prompt at all. Module state is per-test — every case gets a fresh copy. */

function fakeWindow({ userAgent = 'Mozilla/5.0 (Linux; Android 13)', standalone = false } = {}) {
  const listeners = new Map()

  const win = {
    matchMedia: vi.fn((query) => ({ matches: standalone && String(query).includes('standalone') })),
    addEventListener: vi.fn((type, handler) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(handler)
    }),
    removeEventListener: vi.fn((type, handler) => {
      listeners.get(type)?.delete(handler)
    }),
    fire(type, event = {}) {
      for (const handler of listeners.get(type) || []) handler(event)
    },
    handlerCount: (type) => (listeners.get(type) || new Set()).size,
  }

  vi.stubGlobal('window', win)
  vi.stubGlobal('navigator', { userAgent })
  return win
}

function promptEvent(outcome = 'accepted') {
  return {
    preventDefault: vi.fn(),
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  }
}

/** A fresh module per test, so `installed`/`deferredPrompt` never leak across. */
async function freshInstall() {
  vi.resetModules()
  return import('./install')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('environment detection', () => {
  it('reports unsupported when there is no browser at all', async () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('navigator', undefined)
    const install = await freshInstall()

    expect(install.installState()).toBe('unsupported')
    expect(install.canPromptInstall()).toBe(false)
    expect(await install.promptInstall()).toEqual({ outcome: 'unavailable' })
    expect(install.watchInstallPrompt()).toBeTypeOf('function')
    expect(install.installStateLabel('unsupported')).toMatch(/cannot install/i)
  })

  it('says manual when the browser offers no prompt', async () => {
    fakeWindow()
    const install = await freshInstall()
    expect(install.installState()).toBe('manual')
    expect(install.installStateLabel()).toMatch(/home screen/i)
  })

  it('treats an app already opened from the home screen as installed', async () => {
    fakeWindow({ standalone: true })
    const install = await freshInstall()
    expect(install.isStandalone()).toBe(true)
    expect(install.installState()).toBe('installed')
  })

  it('reads the iOS home-screen flag when display-mode is unavailable', async () => {
    fakeWindow({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone)', standalone: true })
    const install = await freshInstall()
    expect(install.isStandalone()).toBe(true)
  })

  it('names the platform from the user agent', async () => {
    fakeWindow({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })
    let install = await freshInstall()
    expect(install.installPlatform()).toBe('ios')

    fakeWindow({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' })
    install = await freshInstall()
    expect(install.installPlatform()).toBe('android')
    expect(install.installPlatformLabel()).toBe('Android')

    fakeWindow()
    install = await freshInstall()
    expect(install.installPlatform('Mozilla/5.0 (Windows NT 10.0)')).toBe('desktop')
    expect(install.installPlatformLabel('desktop')).toBe('Desktop browser')
  })

  it('survives a browser whose matchMedia throws', async () => {
    const win = fakeWindow()
    win.matchMedia = vi.fn(() => {
      throw new Error('nope')
    })
    const install = await freshInstall()
    expect(install.isStandalone()).toBe(false)
  })
})

describe('capturing the browser prompt', () => {
  it('holds the prompt and stops the browser showing its own infobar', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    install.watchInstallPrompt(win)

    const event = promptEvent()
    win.fire('beforeinstallprompt', event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(install.canPromptInstall()).toBe(true)
    expect(install.installState()).toBe('ready')
    expect(install.installStateLabel()).toMatch(/one tap/i)
  })

  it('watches each window only once, however often it is called', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    install.watchInstallPrompt(win)
    install.watchInstallPrompt(win)
    install.watchInstallPrompt(win)

    expect(win.handlerCount('beforeinstallprompt')).toBe(1)
    expect(win.handlerCount('appinstalled')).toBe(1)
  })

  it('notifies subscribers and stops when they unsubscribe', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    const seen = []
    const off = install.subscribeInstall((state) => seen.push(state))

    install.watchInstallPrompt(win)
    win.fire('beforeinstallprompt', promptEvent())

    expect(seen).toEqual(['ready'])

    off()
    win.fire('appinstalled')
    expect(seen).toEqual(['ready'])
    expect(install.installState()).toBe('installed')
  })

  it('keeps going when one subscriber throws', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    const seen = []
    install.subscribeInstall(() => {
      throw new Error('bad listener')
    })
    install.subscribeInstall((state) => seen.push(state))

    install.watchInstallPrompt(win)
    expect(() => win.fire('beforeinstallprompt', promptEvent())).not.toThrow()
    expect(seen).toEqual(['ready'])
  })

  it('ignores a target that cannot listen', async () => {
    const install = await freshInstall()
    expect(install.watchInstallPrompt(null)).toBeTypeOf('function')
    expect(install.watchInstallPrompt({})).toBeTypeOf('function')
  })
})

describe('installing', () => {
  it('hands the held prompt back and records an accepted install', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    install.watchInstallPrompt(win)
    const event = promptEvent('accepted')
    win.fire('beforeinstallprompt', event)

    const result = await install.promptInstall()

    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ outcome: 'accepted' })
    expect(install.installState()).toBe('installed')
    expect(install.canPromptInstall()).toBe(false)
  })

  it('respects a refusal without pretending it installed', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    install.watchInstallPrompt(win)
    win.fire('beforeinstallprompt', promptEvent('dismissed'))

    expect(await install.promptInstall()).toEqual({ outcome: 'dismissed' })
    expect(install.installState()).toBe('manual')
  })

  it('spends the prompt — a second tap cannot reopen a used dialog', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    install.watchInstallPrompt(win)
    win.fire('beforeinstallprompt', promptEvent('dismissed'))

    await install.promptInstall()
    expect(await install.promptInstall()).toEqual({ outcome: 'unavailable' })
  })

  it('reports an error instead of throwing when the prompt blows up', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    install.watchInstallPrompt(win)
    const broken = promptEvent()
    broken.prompt = vi.fn(async () => {
      throw new Error('blocked by policy')
    })
    win.fire('beforeinstallprompt', broken)

    expect(await install.promptInstall()).toEqual({ outcome: 'error' })
  })

  it('records an install that finished through the browser menu instead', async () => {
    const win = fakeWindow()
    const install = await freshInstall()
    install.watchInstallPrompt(win)
    win.fire('beforeinstallprompt', promptEvent())

    win.fire('appinstalled')

    expect(install.installState()).toBe('installed')
    expect(install.canPromptInstall()).toBe(false)
  })
})

describe('manual instructions', () => {
  it('walks iOS through the Share sheet', async () => {
    const install = await freshInstall()
    const steps = install.installSteps('ios')
    expect(steps).toHaveLength(3)
    expect(steps[0].step).toMatch(/share/i)
    expect(steps.map((entry) => entry.step).join(' ')).toMatch(/Add to Home Screen/)
    expect(install.installPlatformLabel('ios')).toBe('iPhone / iPad')
  })

  it('walks Android through the browser menu', async () => {
    const install = await freshInstall()
    const steps = install.installSteps('android')
    expect(steps.map((entry) => entry.step).join(' ')).toMatch(/Install app/)
  })

  it('walks desktop through the address bar', async () => {
    const install = await freshInstall()
    const steps = install.installSteps('desktop')
    expect(steps.map((entry) => entry.step).join(' ')).toMatch(/address bar/i)
    expect(steps.every((entry) => entry.detail.length > 0)).toBe(true)
  })
})
