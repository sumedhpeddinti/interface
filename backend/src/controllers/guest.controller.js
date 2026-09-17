import * as guestService from '../services/guest.service.js'

export async function getGuests(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const guests = await guestService.getGuests(restaurantId)
    res.json({ success: true, data: guests })
  } catch (err) {
    next(err)
  }
}

export async function toggleOptOut(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const { optedOut } = req.body
    const guest = await guestService.updateGuestOptOut(restaurantId, req.params.id, optedOut)
    res.json({ success: true, data: guest })
  } catch (err) {
    next(err)
  }
}
