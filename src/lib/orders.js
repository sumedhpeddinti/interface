/* Order lifecycle — the spine of the whole platform.
   Sent -> Accepted -> Cooking -> Ready -> Served -> Paid */

export const ROUND_STATUS = {
  SENT: 'sent',
  ACCEPTED: 'accepted',
  COOKING: 'cooking',
  READY: 'ready',
  SERVED: 'served',
  PAID: 'paid',
  VOID: 'void',
}

/** The five stages surfaced to the guest progress stepper. */
export const GUEST_STAGES = ['sent', 'accepted', 'cooking', 'ready', 'served']

/** Legal transitions. Anything else is rejected by the reducer. */
export const TRANSITIONS = {
  sent: ['accepted', 'void'],
  accepted: ['cooking', 'ready', 'void'],
  cooking: ['ready', 'void'],
  ready: ['served', 'void'],
  served: ['paid', 'void'],
  paid: [],
  void: [],
}

export const STATUS_META = {
  sent: { label: 'Sent', tone: 'zinc', hint: 'Waiting for the floor team to acknowledge' },
  accepted: { label: 'Accepted', tone: 'amber', hint: 'Sent to the kitchen display' },
  cooking: { label: 'Cooking', tone: 'amber', hint: 'Being prepared right now' },
  ready: { label: 'Ready', tone: 'emerald', hint: 'Ready to be served' },
  served: { label: 'Served', tone: 'indigo', hint: 'On the table' },
  paid: { label: 'Paid', tone: 'emerald', hint: 'Settled' },
  void: { label: 'Void', tone: 'rose', hint: 'Cancelled' },
}

export const STATIONS = ['Hot Kitchen', 'Cold / Salads', 'Bar / Beverages']

export const CATEGORIES = [
  'Top Picks',
  'Main Course',
  'Soups',
  'Starters - Veg',
  'Starters - Non-Veg',
  'Beverages',
  'Desserts',
]

export const TABLE_SECTIONS = ['Main Floor', 'Patio', 'Balcony']

export const TABLE_STATE = {
  FREE: 'Free',
  OCCUPIED: 'Occupied',
  BILLED: 'Billed',
  RESERVED: 'Reserved',
}

export const TABLE_STATE_TONE = {
  Free: 'zinc',
  Occupied: 'amber',
  Billed: 'emerald',
  Reserved: 'indigo',
}

/** Prep time after which a KDS ticket is flagged late. */
export const LATE_THRESHOLD_MIN = 15

export function canTransition(from, to) {
  const allowed = TRANSITIONS[from]
  return Array.isArray(allowed) && allowed.includes(to)
}

export function nextStatus(status) {
  const i = GUEST_STAGES.indexOf(status)
  if (i === -1) return null
  return GUEST_STAGES[i + 1] || null
}

export function isActive(status) {
  return status !== ROUND_STATUS.PAID && status !== ROUND_STATUS.VOID
}

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.sent
}

export function stationTone() {
  return 'zinc'
}

export const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Split']

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Supplies / Ingredients',
  'Payroll',
  'Utilities',
  'Miscellaneous',
]

export const ROLES = {
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  KITCHEN: 'Kitchen',
}

/** Route-level permissions per role. The Manager role is the admin. */
export const ROLE_ACCESS = {
  Manager: [
    'overview',
    'tables',
    'live-orders',
    'kitchen',
    'billing',
    'cash-drawer',
    'invoices',
    'menu',
    'qr-codes',
    'guests',
    'campaigns',
    'expenses',
    'staff',
    'feedback',
  ],
  Cashier: ['overview', 'tables', 'live-orders', 'billing', 'cash-drawer', 'invoices', 'feedback'],
  Kitchen: ['kitchen', 'live-orders'],
}

export function canAccess(role, area) {
  return (ROLE_ACCESS[role] || []).includes(area)
}

export const SEGMENTS = [
  { id: 'all', label: 'All Guests', description: 'Everyone in the guest book' },
  { id: 'inactive', label: 'Inactive (30+ Days)', description: 'No visit in the last 30 days' },
  { id: 'vip', label: 'Top Spenders (VIP)', description: 'Lifetime value above ₹8,000' },
  { id: 'veg', label: 'Veggie Only', description: 'Never ordered a non-veg dish' },
  { id: 'regulars', label: 'Regulars', description: 'Four or more visits' },
]
