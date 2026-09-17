import * as pushService from '../services/push.service.js'

export async function getVapidKey(req, res, next) {
  try {
    const key = pushService.getVapidPublicKey()
    res.json({ success: true, data: { publicKey: key } })
  } catch (err) {
    next(err)
  }
}

export async function subscribe(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const subscription = req.body.subscription || req.body
    const userAgent = req.headers['user-agent'] || ''

    const saved = await pushService.saveSubscription(restaurantId, subscription, userAgent)
    res.json({ success: true, data: saved })
  } catch (err) {
    next(err)
  }
}

export async function broadcastPush(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const result = await pushService.sendPushNotificationToAll(restaurantId, req.body)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}
