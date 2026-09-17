import * as cashService from '../services/cashDrawer.service.js'

export async function getShift(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const result = await cashService.getActiveShift(restaurantId)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function openShift(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const { openingFloat, openedBy } = req.body
    const shift = await cashService.openShift(restaurantId, openingFloat, openedBy || req.user?.name)
    res.json({ success: true, data: shift })
  } catch (err) {
    next(err)
  }
}

export async function addTransaction(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const { type, reason, amount, by } = req.body
    const ct = await cashService.addCashTransaction(restaurantId, type, reason, amount, by || req.user?.name)
    res.json({ success: true, data: ct })
  } catch (err) {
    next(err)
  }
}

export async function closeShift(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const { countedCash, closedBy, notes } = req.body
    const shift = await cashService.closeShift(restaurantId, countedCash, closedBy || req.user?.name, notes)
    res.json({ success: true, data: shift })
  } catch (err) {
    next(err)
  }
}
