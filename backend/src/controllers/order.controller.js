import * as orderService from '../services/order.service.js'

export async function getOrders(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const orders = await orderService.getOrders(restaurantId)
    res.json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
}

export async function createOrder(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const order = await orderService.createOrderRound(restaurantId, {
      ...req.body,
      actor: req.user?.name || 'Guest',
    })
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const { status, readyItemIds } = req.body
    const order = await orderService.updateOrderStatus(
      restaurantId,
      req.params.id,
      status,
      readyItemIds,
      req.user?.name || 'Staff',
    )
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}
