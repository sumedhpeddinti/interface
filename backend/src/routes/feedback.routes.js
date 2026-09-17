import { Router } from 'express'
import * as feedbackController from '../controllers/feedback.controller.js'
import { authenticateToken, authorize, optionalAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { feedbackSchema } from '../validators/schemas.js'

const router = Router()

router.get('/feedback', authenticateToken, authorize('Manager', 'Cashier'), feedbackController.getFeedback)
router.post('/feedback', optionalAuth, validate(feedbackSchema), feedbackController.createFeedback)

export default router
