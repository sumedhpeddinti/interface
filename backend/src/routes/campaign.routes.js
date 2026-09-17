import { Router } from 'express'
import * as campaignController from '../controllers/campaign.controller.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/campaigns', authenticateToken, authorize('Manager'), campaignController.getCampaigns)
router.post('/campaigns', authenticateToken, authorize('Manager'), campaignController.createCampaign)

export default router
