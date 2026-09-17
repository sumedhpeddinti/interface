import { Router } from 'express'
import * as guestController from '../controllers/guest.controller.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/guests', authenticateToken, authorize('Manager', 'Cashier'), guestController.getGuests)
router.patch('/guests/:id/opt-out', authenticateToken, authorize('Manager', 'Cashier'), guestController.toggleOptOut)

export default router
