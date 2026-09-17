import * as bootstrapService from '../services/bootstrap.service.js'

export async function getBootstrapState(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || req.headers['x-restaurant-id'] || 'rest_ganesh_cafe_01'
    const state = await bootstrapService.getFullStoreState(restaurantId)
    res.json({
      success: true,
      data: state,
    })
  } catch (err) {
    console.error('getBootstrapState error:', err)
    next(err)
  }
}
