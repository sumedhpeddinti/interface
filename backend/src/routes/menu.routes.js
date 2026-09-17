import { Router } from 'express'
import * as menuController from '../controllers/menu.controller.js'
import { authenticateToken, authorize, optionalAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { menuItemSchema } from '../validators/schemas.js'

const router = Router()

router.get('/menu', optionalAuth, menuController.getMenu)
router.post('/menu', authenticateToken, authorize('Manager'), validate(menuItemSchema), menuController.createMenuItem)
router.patch('/menu/:id', authenticateToken, authorize('Manager'), menuController.updateMenuItem)
router.delete('/menu/:id', authenticateToken, authorize('Manager'), menuController.deleteMenuItem)

export default router
