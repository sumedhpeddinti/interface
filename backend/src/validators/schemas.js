import { z } from 'zod'

export const loginSchema = {
  body: z.object({
    pin: z.string().length(4, 'PIN must be exactly 4 digits'),
  }),
}

export const createStaffSchema = {
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['Manager', 'Cashier', 'Kitchen']),
    pin: z.string().length(4, 'PIN must be 4 digits'),
    phone: z.string().optional(),
    title: z.string().optional(),
  }),
}

export const menuItemSchema = {
  body: z.object({
    name: z.string().min(1),
    price: z.number().min(0),
    categoryName: z.string().min(1),
    station: z.string().min(1),
    description: z.string().optional(),
    isVeg: z.boolean().optional(),
    isBestseller: z.boolean().optional(),
    available: z.boolean().optional(),
    image: z.string().optional(),
  }),
}

export const updateTableSchema = {
  body: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    seats: z.number().optional(),
    section: z.string().optional(),
    reserved: z.boolean().optional(),
    shape: z.string().optional(),
  }),
}

export const createOrderSchema = {
  body: z.object({
    tableId: z.string().min(1),
    guestName: z.string().optional(),
    guestPhone: z.string().optional(),
    partySize: z.number().optional(),
    notes: z.string().optional(),
    items: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        price: z.number(),
        qty: z.number().min(1),
        station: z.string().optional(),
        isVeg: z.boolean().optional(),
        note: z.string().optional(),
      }),
    ).min(1, 'At least one item is required'),
  }),
}

export const updateOrderStatusSchema = {
  body: z.object({
    status: z.enum(['sent', 'accepted', 'cooking', 'ready', 'served', 'paid', 'void']),
    readyItemIds: z.array(z.string()).optional(),
  }),
}

export const settlePaymentSchema = {
  body: z.object({
    tableId: z.string().min(1),
    method: z.enum(['Cash', 'Card', 'UPI', 'Split']),
    tendered: z.number().optional(),
    discount: z.object({
      type: z.enum(['percent', 'fixed']),
      value: z.number(),
      code: z.string().optional(),
      reason: z.string().optional(),
    }).optional().nullable(),
  }),
}

export const openShiftSchema = {
  body: z.object({
    openingFloat: z.number().min(0),
    openedBy: z.string().min(1),
  }),
}

export const cashTransactionSchema = {
  body: z.object({
    type: z.enum(['in', 'out']),
    reason: z.string().min(1),
    amount: z.number().positive(),
    by: z.string().min(1),
  }),
}

export const closeShiftSchema = {
  body: z.object({
    countedCash: z.number().min(0),
    notes: z.string().optional(),
    closedBy: z.string().min(1),
  }),
}

export const expenseSchema = {
  body: z.object({
    category: z.string().min(1),
    amount: z.number().positive(),
    note: z.string().optional(),
    by: z.string().min(1),
  }),
}

export const feedbackSchema = {
  body: z.object({
    guestName: z.string().min(1),
    tableId: z.string().optional(),
    rating: z.number().min(1).max(5),
    pills: z.array(z.string()).optional(),
    comment: z.string().optional(),
    invoiceId: z.string().optional(),
  }),
}
