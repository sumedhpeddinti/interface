import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { authenticateToken, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, createStaffSchema } from '../validators/schemas.js'

const router = Router()

router.post('/login', validate(loginSchema), authController.login)
router.get('/me', authenticateToken, authController.getMe)
router.post('/logout', authController.logout)

router.get('/staff', authenticateToken, authorize('Manager'), authController.getStaff)
router.post('/staff', authenticateToken, authorize('Manager'), validate(createStaffSchema), authController.createStaff)
router.patch('/staff/:id', authenticateToken, authorize('Manager'), authController.updateStaff)

export default router
