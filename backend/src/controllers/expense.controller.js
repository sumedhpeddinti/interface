import * as expenseService from '../services/expense.service.js'

export async function getExpenses(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const expenses = await expenseService.getExpenses(restaurantId)
    res.json({ success: true, data: expenses })
  } catch (err) {
    next(err)
  }
}

export async function createExpense(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const expense = await expenseService.createExpense(restaurantId, req.body)
    res.json({ success: true, data: expense })
  } catch (err) {
    next(err)
  }
}
