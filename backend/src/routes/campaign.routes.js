import { Router } from 'express'
import * as campaignController from '../controllers/campaign.controller.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

router.get('/campaigns', optionalAuth, campaignController.getCampaigns)
router.post('/campaigns', optionalAuth, campaignController.createCampaign)

export default router
