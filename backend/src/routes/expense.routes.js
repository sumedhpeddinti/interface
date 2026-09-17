import { Router } from 'express'
import * as expenseController from '../controllers/expense.controller.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { expenseSchema } from '../validators/schemas.js'

const router = Router()

router.get('/expenses', authenticateToken, authorize('Manager'), expenseController.getExpenses)
router.post('/expenses', authenticateToken, authorize('Manager'), validate(expenseSchema), expenseController.createExpense)

export default router
