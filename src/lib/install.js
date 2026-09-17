/* Real app installation — the browser's own "Install app" flow.

   Chrome fires `beforeinstallprompt` once the app is installable (manifest,
   icons, a service worker that handles fetch, and a secure context). We catch
   that event, hold it, and hand it back on the guest's tap, so the "Download
   app" button is not a screenshot: it opens the browser's real install dialog
   and the app lands on the home screen with its own icon and window.

   Browsers that never fire the event — iOS Safari above all, where installing
   is a Share-sheet action — fall back to honest step-by-step instructions
   instead of a button that does nothing.

   Every function is total: nothing throws, and nothing claims an install that
   did not happen. */

export const INSTALL_STATE = {
  /** Running as an installed app, or the install completed this session. */
  INSTALLED: 'installed',
  /** The browser's install prompt is captured and one tap away. */
  READY: 'ready',
  /** Installable by hand (menu / Share sheet), but no programmatic prompt. */
  MANUAL: 'manual',
  /** No browser environment at all (server render, tests, old browsers). */
  UNSUPPORTED: 'unsupported',
}

const watched = new WeakSet()
const listeners = new Set()

let deferredPrompt = null
let installedThisSession = false

function win() {
  return typeof window === 'undefined' ? null : window
}

function nav() {
  return typeof navigator === 'undefined' ? null : navigator
}

/** Already opened from the home screen, rather than in a browser tab. */
export function isStandalone() {
  const w = win()
  if (w?.matchMedia) {
    for (const query of ['(display-mode: standalone)', '(display-mode: minimal-ui)']) {
      try {
        if (w.matchMedia(query)?.matches) return true
      } catch {
        /* matchMedia exists but refused the query — try the next signal */
      }
    }
  }
  /* iOS Safari predates display-mode and exposes its own flag. */
  return nav()?.standalone === true
}

export function installPlatform(userAgent = nav()?.userAgent || '') {
  const ua = String(userAgent)
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** 'installed' | 'ready' | 'manual' | 'unsupported' */
export function installState() {
  if (installedThisSession || isStandalone()) return INSTALL_STATE.INSTALLED
  if (!win()) return INSTALL_STATE.UNSUPPORTED
  if (deferredPrompt) return INSTALL_STATE.READY
  return INSTALL_STATE.MANUAL
}

export function installStateLabel(state = installState()) {
  switch (state) {
    case INSTALL_STATE.INSTALLED:
      return 'Installed — Ganesh Café opens from your home screen'
    case INSTALL_STATE.READY:
      return 'Ready to install — one tap opens the browser’s install dialog'
    case INSTALL_STATE.MANUAL:
      return 'Add to home screen from your browser menu'
    default:
      return 'This browser cannot install web apps'
  }
}

/** True only while a real, browser-issued install prompt is in hand. */
export function canPromptInstall() {
  return Boolean(deferredPrompt) && !isStandalone()
}

export function subscribeInstall(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  for (const listener of [...listeners]) {
    try {
      listener(installState())
    } catch {
      /* one bad subscriber must not stop the others */
    }
  }
}

/**
 * Capture the browser's install prompt. Safe to call repeatedly and from
 * anywhere: each window is watched at most once. Returns a detach function.
 */
export function watchInstallPrompt(target = win()) {
  if (!target || typeof target.addEventListener !== 'function') return () => {}
  if (watched.has(target)) return () => {}
  watched.add(target)

  const onPrompt = (event) => {
    /* Without this the browser shows its own mini-infobar and we lose the
       chance to offer the install at the moment the guest actually wants it. */
    event.preventDefault?.()
    deferredPrompt = event
    emit()
  }

  const onInstalled = () => {
    installedThisSession = true
    deferredPrompt = null
    emit()
  }

  target.addEventListener('beforeinstallprompt', onPrompt)
  target.addEventListener('appinstalled', onInstalled)

  return () => {
    watched.delete(target)
    target.removeEventListener('beforeinstallprompt', onPrompt)
    target.removeEventListener('appinstalled', onInstalled)
  }
}

/**
 * Hand the held prompt back to the browser. Must be called from a user
 * gesture. Resolves with what the guest actually chose.
 * @returns {Promise<{outcome:'accepted'|'dismissed'|'unavailable'|'error'}>}
 */
export async function promptInstall() {
  const event = deferredPrompt
  if (!event || typeof event.prompt !== 'function') return { outcome: 'unavailable' }

  /* A held prompt is single-use: whichever way the guest answers, drop it so a
     second tap cannot re-open a spent dialog. */
  deferredPrompt = null

  try {
    await event.prompt()
    const choice = await event.userChoice
    const outcome = choice?.outcome === 'accepted' ? 'accepted' : 'dismissed'
    if (outcome === 'accepted') {
      installedThisSession = true
      emit()
    }
    return { outcome }
  } catch {
    return { outcome: 'error' }
  }
}

/** Manual steps for a browser that cannot show a prompt. */
export function installSteps(platform = installPlatform()) {
  if (platform === 'ios') {
    return [
      { step: 'Tap the Share button', detail: 'The square with the arrow, in Safari’s toolbar.' },
      { step: 'Choose “Add to Home Screen”', detail: 'Scroll the share sheet if you do not see it.' },
      { step: 'Tap “Add”', detail: 'Ganesh Café appears on your home screen as an app.' },
    ]
  }
  if (platform === 'android') {
    return [
      { step: 'Open the browser menu', detail: 'The ⋮ button at the top right.' },
      { step: 'Tap “Install app” or “Add to Home screen”', detail: 'Chrome names it per the manifest.' },
      { step: 'Confirm', detail: 'The icon lands on your home screen and opens without the browser.' },
    ]
  }
  return [
    {
      step: 'Look for the install icon in the address bar',
      detail: 'A small monitor-with-arrow, at the right end of the URL field.',
    },
    {
      step: 'Or open the browser menu → “Install Ganesh Café”',
      detail: 'Chrome, Edge and Brave all put it under the ⋮ menu.',
    },
    { step: 'Confirm the install', detail: 'It opens in its own window, like a native app.' },
  ]
}

export function installPlatformLabel(platform = installPlatform()) {
  if (platform === 'ios') return 'iPhone / iPad'
  if (platform === 'android') return 'Android'
  return 'Desktop browser'
}
