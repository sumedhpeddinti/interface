import * as feedbackService from '../services/feedback.service.js'

export async function getFeedback(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const list = await feedbackService.getFeedback(restaurantId)
    res.json({ success: true, data: list })
  } catch (err) {
    next(err)
  }
}

export async function createFeedback(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const fb = await feedbackService.createFeedback(restaurantId, req.body)
    res.json({ success: true, data: fb })
  } catch (err) {
    next(err)
  }
}
