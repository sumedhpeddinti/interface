import { Router } from 'express'
import * as bootstrapController from '../controllers/bootstrap.controller.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

router.get('/bootstrap', optionalAuth, bootstrapController.getBootstrapState)

export default router
