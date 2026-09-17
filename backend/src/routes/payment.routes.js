import { Router } from 'express'
import * as paymentController from '../controllers/payment.controller.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { settlePaymentSchema } from '../validators/schemas.js'

const router = Router()

router.post('/payments/settle', authenticateToken, authorize('Manager', 'Cashier'), validate(settlePaymentSchema), paymentController.settleBill)

export default router
