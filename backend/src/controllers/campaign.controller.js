import * as campaignService from '../services/campaign.service.js'

export async function getCampaigns(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const campaigns = await campaignService.getCampaigns(restaurantId)
    res.json({ success: true, data: campaigns })
  } catch (err) {
    next(err)
  }
}

export async function createCampaign(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const campaign = await campaignService.createCampaign(restaurantId, req.body)
    res.json({ success: true, data: campaign })
  } catch (err) {
    next(err)
  }
}
