import webPush from 'web-push'
import { prisma } from '../db/client.js'
import { env } from '../config/env.js'

// Initialize VAPID details with web-push
webPush.setVapidDetails(
  env.VAPID_SUBJECT,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
)

export function getVapidPublicKey() {
  return env.VAPID_PUBLIC_KEY
}

export async function saveSubscription(restaurantId = env.DEFAULT_RESTAURANT_ID, subscription, userAgent = '') {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Invalid subscription object')
  }

  const { endpoint, keys } = subscription
  const { p256dh, auth } = keys

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint },
  })

  if (existing) {
    return prisma.pushSubscription.update({
      where: { endpoint },
      data: {
        p256dh,
        auth,
        userAgent,
        restaurantId,
      },
    })
  }

  return prisma.pushSubscription.create({
    data: {
      endpoint,
      p256dh,
      auth,
      userAgent,
      restaurantId,
    },
  })
}

export async function sendPushNotificationToAll(restaurantId = env.DEFAULT_RESTAURANT_ID, payload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { restaurantId },
  })

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const stringifiedPayload = JSON.stringify(payload)
  let sent = 0
  let failed = 0

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      try {
        await webPush.sendNotification(pushConfig, stringifiedPayload)
        sent++
      } catch (err) {
        failed++
        // 404 or 410 means subscription has expired or user unsubscribed
        if (err.statusCode === 404 || err.statusCode === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } })
          } catch (_) {}
        }
      }
    })
  )

  return { sent, failed, total: subscriptions.length }
}
