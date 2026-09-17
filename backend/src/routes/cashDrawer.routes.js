import { Router } from 'express'
import * as cashController from '../controllers/cashDrawer.controller.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { openShiftSchema, cashTransactionSchema, closeShiftSchema } from '../validators/schemas.js'

const router = Router()

router.get('/cash-drawer/shift', authenticateToken, authorize('Manager', 'Cashier'), cashController.getShift)
router.post('/cash-drawer/open', authenticateToken, authorize('Manager', 'Cashier'), validate(openShiftSchema), cashController.openShift)
router.post('/cash-drawer/transaction', authenticateToken, authorize('Manager', 'Cashier'), validate(cashTransactionSchema), cashController.addTransaction)
router.post('/cash-drawer/close', authenticateToken, authorize('Manager', 'Cashier'), validate(closeShiftSchema), cashController.closeShift)

export default router
