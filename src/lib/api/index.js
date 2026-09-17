import { apiRequest, setAuthToken, getAuthToken } from './client.js'

export const api = {
  // Bootstrap / Initialization
  getBootstrapState: () => apiRequest('/bootstrap'),

  // Auth & Staff
  login: async (pin) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    })
    if (data?.token) setAuthToken(data.token)
    return data
  },
  getMe: () => apiRequest('/auth/me'),
  logout: async () => {
    setAuthToken(null)
    return apiRequest('/auth/logout', { method: 'POST' })
  },
  getStaff: () => apiRequest('/auth/staff'),
  createStaff: (staffData) =>
    apiRequest('/auth/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    }),
  updateStaff: (id, patch) =>
    apiRequest(`/auth/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  // Menu
  createMenuItem: (itemData) =>
    apiRequest('/menu', {
      method: 'POST',
      body: JSON.stringify(itemData),
    }),
  updateMenuItem: (id, patch) =>
    apiRequest(`/menu/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteMenuItem: (id) =>
    apiRequest(`/menu/${id}`, {
      method: 'DELETE',
    }),

  // Tables
  updateTable: (id, patch) =>
    apiRequest(`/tables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  // Orders
  createOrderRound: (orderData) =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),
  updateOrderStatus: (id, status, readyItemIds) =>
    apiRequest(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, readyItemIds }),
    }),

  // Payments / Billing
  settleBill: (paymentData) =>
    apiRequest('/payments/settle', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }),

  // Cash Drawer
  getShift: () => apiRequest('/cash-drawer/shift'),
  openShift: (openingFloat, openedBy) =>
    apiRequest('/cash-drawer/open', {
      method: 'POST',
      body: JSON.stringify({ openingFloat, openedBy }),
    }),
  addCashTransaction: (type, reason, amount, by) =>
    apiRequest('/cash-drawer/transaction', {
      method: 'POST',
      body: JSON.stringify({ type, reason, amount, by }),
    }),
  closeShift: (countedCash, closedBy, notes) =>
    apiRequest('/cash-drawer/close', {
      method: 'POST',
      body: JSON.stringify({ countedCash, closedBy, notes }),
    }),

  // CRM / Guests
  toggleGuestOptOut: (id, optedOut) =>
    apiRequest(`/guests/${id}/opt-out`, {
      method: 'PATCH',
      body: JSON.stringify({ optedOut }),
    }),

  // Campaigns
  createCampaign: (campaignData) =>
    apiRequest('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    }),

  // Expenses
  createExpense: (expenseData) =>
    apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    }),

  // Feedback
  createFeedback: (feedbackData) =>
    apiRequest('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    }),
}

export { setAuthToken, getAuthToken }
