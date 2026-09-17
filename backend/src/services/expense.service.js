import { prisma } from '../db/client.js'
import { env } from '../config/env.js'

export async function getExpenses(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  return prisma.expense.findMany({
    where: { restaurantId },
    orderBy: { at: 'desc' },
  })
}

export async function createExpense(restaurantId, data) {
  const count = await prisma.expense.count({ where: { restaurantId } })
  const id = `EXP-${String(count + 1).padStart(4, '0')}`

  const expense = await prisma.expense.create({
    data: {
      id,
      restaurantId,
      category: data.category,
      amount: Number(data.amount),
      note: data.note || '',
      at: Date.now(),
      by: data.by,
    },
  })

  return expense
}
