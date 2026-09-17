import { Router } from 'express'
import * as tableController from '../controllers/table.controller.js'
import { authenticateToken, authorize, optionalAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { updateTableSchema } from '../validators/schemas.js'

const router = Router()

router.get('/tables', optionalAuth, tableController.getTables)
router.patch('/tables/:id', authenticateToken, authorize('Manager', 'Cashier'), validate(updateTableSchema), tableController.updateTable)

export default router
