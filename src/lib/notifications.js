/* Real system notifications — the honest half of the push demo.

   The slide-down banner in the guest app is theatre. This module is the real
   thing: it asks the browser's notification permission, routes the message
   through a notification-only service worker, and hands it to the operating
   system's notification centre. A broadcast from /store/campaigns then lands
   on the guest's machine the way the Zomato and Swiggy popups in the reference
   deck do, and clicking it brings the café screen back to the front.

   Every function here is total: nothing throws, and nothing reports success
   it did not achieve. */

const WORKER_URL = '/sw.js'

/** `Notification.permission`, plus an explicit state for browsers without it. */
export const PERMISSION_UNSUPPORTED = 'unsupported'

export function notificationsSupported() {
  return typeof window !== 'undefined' && typeof window.Notification === 'function'
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function notificationPermission() {
  if (!notificationsSupported()) return PERMISSION_UNSUPPORTED
  return window.Notification.permission || 'default'
}

export function permissionLabel(permission = notificationPermission()) {
  switch (permission) {
    case 'granted':
      return 'Allowed — messages appear in the system notification centre'
    case 'denied':
      return 'Blocked — the browser is refusing notifications for this site'
    case PERMISSION_UNSUPPORTED:
      return 'This browser has no notification support'
    default:
      return 'Not asked yet — only the in-app banner is delivered right now'
  }
}

export function permissionTone(permission = notificationPermission()) {
  if (permission === 'granted') return 'emerald'
  if (permission === 'denied') return 'rose'
  return 'amber'
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function getActiveServiceWorkerRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    let reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      reg = await navigator.serviceWorker.register(WORKER_URL, { scope: '/' })
    }
    if (reg.installing || reg.waiting) {
      const worker = reg.installing || reg.waiting
      await new Promise((resolve) => {
        if (worker.state === 'activated') return resolve()
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve()
        })
        setTimeout(resolve, 800)
      })
    }
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((res) => setTimeout(() => res(reg), 800)),
    ])
    return readyReg || reg
  } catch (err) {
    console.warn('Service worker registration lookup error:', err)
    return null
  }
}

export async function syncPushSubscription() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  if (window.Notification?.permission !== 'granted') return null

  try {
    const registration = await getActiveServiceWorkerRegistration()
    if (!registration || !registration.pushManager) return null

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const apiBase = import.meta.env?.VITE_API_URL || '/api'
      const vapidUrl = `${apiBase.replace(/\/$/, '')}/push/vapid-key`
      const vapidRes = await fetch(vapidUrl).then((r) => r.json()).catch(() => null)
      const vapidKey = vapidRes?.data?.publicKey
      if (vapidKey) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }
    }

    if (subscription) {
      const apiBase = import.meta.env?.VITE_API_URL || '/api'
      const subUrl = `${apiBase.replace(/\/$/, '')}/push/subscribe`
      await fetch(subUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      }).catch(() => {})
      return subscription
    }
  } catch (err) {
    console.warn('Push subscription sync notice:', err)
  }
  return null
}

/** Must be called from a user gesture, or the browser silently ignores it. */
export async function requestNotificationPermission() {
  if (!notificationsSupported()) return PERMISSION_UNSUPPORTED
  try {
    const result = await window.Notification.requestPermission()
    if (result === 'granted') {
      syncPushSubscription().catch(() => {})
    }
    return result || notificationPermission()
  } catch {
    return notificationPermission()
  }
}

export async function registerNotificationWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  if (typeof window !== 'undefined' && window.isSecureContext === false) return null
  try {
    const reg = await navigator.serviceWorker.register(WORKER_URL, { scope: '/' })
    if (window.Notification?.permission === 'granted') {
      syncPushSubscription().catch(() => {})
    }
    return reg
  } catch {
    return null
  }
}

/**
 * Deliver one notification. Prefers the service-worker path, because that is
 * what a real Web Push payload takes and it keeps working while the tab sits
 * in the background; falls back to the plain constructor when the worker is
 * unavailable for any reason.
 */
export async function showSystemNotification({
  title,
  body = '',
  tag,
  id,
  url = '/',
  coupon = null,
  kind = 'push',
  silent = false,
  requireInteraction = false,
  at = Date.now(),
} = {}) {
  if (!title) return { shown: false, via: 'empty' }
  if (!notificationsSupported()) return { shown: false, via: PERMISSION_UNSUPPORTED }
  if (window.Notification.permission !== 'granted') {
    return { shown: false, via: 'permission', permission: window.Notification.permission }
  }

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    silent,
    requireInteraction: true,
    data: { id: id || tag || null, url, coupon, kind, at },
  }

  /* `renotify` is only legal alongside a tag — Chrome throws without one. */
  if (tag || id) {
    options.tag = String(tag || id)
    options.renotify = true
  }

  // 1. Primary path: Service Worker Registration (Required on Android Chrome)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await getActiveServiceWorkerRegistration()
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, options)
        return { shown: true, via: 'service-worker' }
      }
    } catch (err) {
      console.warn('Service worker showNotification error:', err)
    }
  }

  // 2. Desktop fallback
  try {
    if (typeof window !== 'undefined' && window.Notification) {
      new window.Notification(title, options) // eslint-disable-line no-new
      return { shown: true, via: 'constructor' }
    }
  } catch (err) {
    console.warn('Constructor notification error:', err)
    return { shown: false, via: 'error' }
  }
}

/** Turn a store push entry into the payload the operating system expects. */
export function notificationPayload(entry, restaurant = 'Ganesh Café') {
  if (!entry) return null
  const channel =
    entry.kind === 'campaign'
      ? entry.channel === 'whatsapp'
        ? 'WhatsApp'
        : 'Web Push'
      : entry.kind === 'waiter'
        ? 'Floor'
        : 'Kitchen'
  return {
    title: entry.title || restaurant,
    body: entry.body || '',
    tag: entry.id,
    id: entry.id,
    coupon: entry.coupon || null,
    kind: entry.kind || 'push',
    url: entry.url || '/',
    source: `${channel} · ${restaurant}`,
  }
}

export async function closeAllSystemNotifications() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 0
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return 0
    const open = await registration.getNotifications()
    open.forEach((notification) => notification.close())
    return open.length
  } catch {
    return 0
  }
}
