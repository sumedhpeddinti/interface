import * as menuService from '../services/menu.service.js'

export async function getMenu(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const items = await menuService.getMenuItems(restaurantId)
    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
}

export async function createMenuItem(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const item = await menuService.createMenuItem(restaurantId, req.body)
    res.json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}

export async function updateMenuItem(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const item = await menuService.updateMenuItem(restaurantId, req.params.id, req.body)
    res.json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}

export async function deleteMenuItem(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const item = await menuService.deleteMenuItem(restaurantId, req.params.id)
    res.json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}
