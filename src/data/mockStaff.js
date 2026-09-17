/* Staff accounts. PINs are the demo's role-based access control. */

export const mockStaff = [
  {
    id: 's01',
    name: 'Vinit Sharma',
    role: 'Manager',
    pin: '1234',
    title: 'Platform Admin',
    phone: '+91 98765 43210',
    active: true,
    joinedDaysAgo: 420,
  },
  {
    id: 's02',
    name: 'Priya Nair',
    role: 'Cashier',
    pin: '2222',
    title: 'Front Desk Cashier',
    phone: '+91 99887 11223',
    active: true,
    joinedDaysAgo: 190,
  },
  {
    id: 's03',
    name: 'Rakesh Yadav',
    role: 'Kitchen',
    pin: '3333',
    title: 'Head Chef · Hot Kitchen',
    phone: '+91 90045 33221',
    active: true,
    joinedDaysAgo: 260,
  },
  {
    id: 's04',
    name: 'Anil Kumar',
    role: 'Cashier',
    pin: '4444',
    title: 'Evening Cashier',
    phone: '+91 98111 22334',
    active: true,
    joinedDaysAgo: 95,
  },
  {
    id: 's05',
    name: 'Sunita More',
    role: 'Kitchen',
    pin: '5555',
    title: 'Cold Station Chef',
    phone: '+91 97654 00991',
    active: true,
    joinedDaysAgo: 140,
  },
]

/** The account the demo boots into so nothing is gated on first load. */
export const DEFAULT_SESSION_STAFF_ID = 's01'
