import * as tableService from '../services/table.service.js'

export async function getTables(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const tables = await tableService.getTables(restaurantId)
    res.json({ success: true, data: tables })
  } catch (err) {
    next(err)
  }
}

export async function updateTable(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const table = await tableService.updateTable(restaurantId, req.params.id, req.body)
    res.json({ success: true, data: table })
  } catch (err) {
    next(err)
  }
}
