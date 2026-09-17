import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../context/StoreContext'
import {
  notificationPermission,
  notificationPayload,
  permissionLabel,
  permissionTone,
  registerNotificationWorker,
  requestNotificationPermission,
  showSystemNotification,
  syncPushSubscription,
} from '../lib/notifications'

/* Turns the store's push feed into real operating-system notifications.

   The in-app slide-down banner stays exactly as it is — this is the layer
   above it. Every send from /store/campaigns, every new round and every floor
   call now also reaches the notification centre, so the demo does not depend
   on the café tab being visible. Renders nothing. */

export function NotificationBridge() {
  const { state, actions } = useStore()
  const feed = state.pushNotifications || []
  const enabled = state.settings?.osNotifications !== false
  const restaurant = state.restaurant?.name || 'Beno'

  const delivered = useRef(new Set())
  const primed = useRef(false)

  useEffect(() => {
    registerNotificationWorker()
    syncPushSubscription()
  }, [])

  useEffect(() => {
    const fresh = feed.filter((entry) => !delivered.current.has(entry.id))

    /* Everything new is accounted for straight away, whichever way it goes.
       A message that arrives while the channel is off or unpermitted is
       history — re-enabling sends the next one, it does not fire a backlog. */
    for (const entry of fresh) delivered.current.add(entry.id)

    /* The first pass over the feed is history, not news, so a reload never
       replays the last broadcast as a fresh system notification. */
    const isFirstPass = !primed.current
    primed.current = true
    if (isFirstPass || fresh.length === 0) return

    if (!enabled) return
    if (notificationPermission() !== 'granted') return

    /* Oldest first, so the newest message is the one left on top of the stack. */
    for (const entry of [...fresh].reverse()) {
      showSystemNotification(notificationPayload(entry, restaurant))
    }
  }, [feed, enabled, restaurant])

  /* A click on the system notification focuses the app — drop that banner. */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined
    const onMessage = (event) => {
      const data = event.data
      if (data?.type !== 'cafe:notification-click') return
      actions.dismissPush({ id: data.notification?.id || null })
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [actions])

  return null
}

/* ------------------------------------------------------------------ hook -- */

/**
 * Live view of the browser's notification permission, kept in sync through the
 * Permissions API where it exists and a window-focus check where it does not.
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState(() => notificationPermission())

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    let disposed = false
    let status = null

    const sync = () => {
      if (!disposed) setPermission(notificationPermission())
    }

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'notifications' })
        .then((result) => {
          if (disposed) return
          status = result
          setPermission(result.state === 'prompt' ? 'default' : result.state)
          result.addEventListener('change', sync)
        })
        .catch(() => {
          /* Safari and friends: fall back to the focus check below */
        })
    }

    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)

    return () => {
      disposed = true
      if (status?.removeEventListener) status.removeEventListener('change', sync)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  const request = useCallback(async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    return result
  }, [])

  return {
    permission,
    label: permissionLabel(permission),
    tone: permissionTone(permission),
    granted: permission === 'granted',
    denied: permission === 'denied',
    request,
  }
}
