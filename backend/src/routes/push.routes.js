import { Router } from 'express'
import * as pushController from '../controllers/push.controller.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

router.get('/push/vapid-key', pushController.getVapidKey)
router.post('/push/subscribe', optionalAuth, pushController.subscribe)
router.post('/push/broadcast', optionalAuth, pushController.broadcastPush)

export default router
