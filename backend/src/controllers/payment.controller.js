import * as paymentService from '../services/payment.service.js'

export async function settleBill(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const { tableId, method, discount, tendered } = req.body
    const cashierName = req.user?.name || 'Priya Nair'
    const cashierId = req.user?.id || 's02'

    const invoice = await paymentService.settleTableBill(
      restaurantId,
      tableId,
      method,
      discount,
      tendered,
      cashierName,
      cashierId,
    )

    res.json({ success: true, data: invoice })
  } catch (err) {
    next(err)
  }
}
