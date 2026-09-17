import { Router } from 'express'
import * as orderController from '../controllers/order.controller.js'
import { authenticateToken, authorize, optionalAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createOrderSchema, updateOrderStatusSchema } from '../validators/schemas.js'

const router = Router()

router.get('/orders', optionalAuth, orderController.getOrders)
router.post('/orders', optionalAuth, validate(createOrderSchema), orderController.createOrder)
router.patch('/orders/:id/status', authenticateToken, authorize('Manager', 'Cashier', 'Kitchen'), validate(updateOrderStatusSchema), orderController.updateOrderStatus)

export default router
