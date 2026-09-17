/* Service worker for the guest app.

   Two jobs. It owns the notification the operating system shows — the same
   code path a real Web Push payload takes — and brings the café screen forward
   when that notification is clicked.

   It also has to answer `fetch` for the browser to consider the app
   installable. That handler deliberately does nothing: no `respondWith`, no
   cache, so the network stays in charge and a stale bundle can never be served
   during development. */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/* Deliberately empty: its presence is what makes the app installable, and
   staying silent keeps the browser's normal network handling in place. */
self.addEventListener('fetch', () => {})

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  event.notification.close()

  event.waitUntil(
    (async () => {
      const target = data.url || '/'
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'cafe:notification-click', notification: data })
          return client.focus()
        }
      }

      if (self.clients.openWindow) return self.clients.openWindow(target)
      return undefined
    })(),
  )
})
