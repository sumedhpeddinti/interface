import { Router } from 'express'
import authRoutes from './auth.routes.js'
import bootstrapRoutes from './bootstrap.routes.js'
import menuRoutes from './menu.routes.js'
import tableRoutes from './table.routes.js'
import orderRoutes from './order.routes.js'
import paymentRoutes from './payment.routes.js'
import cashDrawerRoutes from './cashDrawer.routes.js'
import guestRoutes from './guest.routes.js'
import campaignRoutes from './campaign.routes.js'
import expenseRoutes from './expense.routes.js'
import feedbackRoutes from './feedback.routes.js'
import healthRoutes from './health.routes.js'
import pushRoutes from './push.routes.js'

const router = Router()

router.use('/', healthRoutes)
router.use('/auth', authRoutes)
router.use('/', bootstrapRoutes)
router.use('/', menuRoutes)
router.use('/', tableRoutes)
router.use('/', orderRoutes)
router.use('/', paymentRoutes)
router.use('/', cashDrawerRoutes)
router.use('/', guestRoutes)
router.use('/', campaignRoutes)
router.use('/', pushRoutes)
router.use('/', expenseRoutes)
router.use('/', feedbackRoutes)

export default router
