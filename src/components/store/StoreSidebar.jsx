import { NavLink } from 'react-router-dom'
import {
  Banknote,
  BellRing,
  BookOpen,
  ChefHat,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  Megaphone,
  MessageSquare,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Badge, Dot, IconButton } from '../ui'
import { classNames } from '../../lib/format'
import { LATE_THRESHOLD_MIN } from '../../lib/orders'

/* Minimalist monotoned navigation — Medusa Admin density. */

export const NAV_GROUPS = [
  {
    id: 'operations',
    items: [
      { to: '/store', end: true, area: 'overview', label: 'Overview', icon: LayoutDashboard },
      { to: '/store/tables', area: 'tables', label: 'Floor & Tables', icon: LayoutGrid },
      {
        to: '/store/live-orders',
        area: 'live-orders',
        label: 'Live Orders',
        icon: BellRing,
        badge: 'alerts',
      },
      { to: '/store/kitchen', area: 'kitchen', label: 'Kitchen (KDS)', icon: ChefHat, badge: 'late' },
    ],
  },
  {
    id: 'register',
    label: 'Register',
    items: [
      { to: '/store/billing', area: 'billing', label: 'Billing & Register', icon: CreditCard },
      { to: '/store/cash-drawer', area: 'cash-drawer', label: 'Shift & Cash Drawer', icon: Banknote },
      { to: '/store/invoices', area: 'invoices', label: 'Invoices', icon: ReceiptText },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    items: [
      { to: '/store/menu', area: 'menu', label: 'Menu Manager', icon: BookOpen },
      { to: '/store/qr-codes', area: 'qr-codes', label: 'QR Code Studio', icon: QrCode },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    items: [
      { to: '/store/guests', area: 'guests', label: 'Guests & CRM', icon: Users },
      { to: '/store/campaigns', area: 'campaigns', label: 'Campaigns & Loyalty', icon: Megaphone },
      { to: '/store/expenses', area: 'expenses', label: 'Expenses & P&L', icon: TrendingUp },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { to: '/store/staff', area: 'staff', label: 'Staff & Roles', icon: ShieldCheck },
      { to: '/store/feedback', area: 'feedback', label: 'Feedback', icon: MessageSquare },
    ],
  },
]

export function StoreSidebar({ badges = {}, staff, storeOpen, onLock, onReset }) {
  return (
    <aside className="no-print flex h-full w-16 shrink-0 flex-col border-r border-zinc-200 bg-white lg:w-60">
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-3 lg:px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white">
          <ChefHat size={16} strokeWidth={1.8} />
        </span>
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-semibold leading-tight text-zinc-900">Beno</p>
          <p className="flex items-center gap-1.5 text-[10px] leading-tight text-zinc-500">
            <Dot tone={storeOpen ? 'emerald' : 'rose'} pulse={storeOpen} />
            {storeOpen ? 'Open · Service' : 'Closed'}
          </p>
        </div>
      </div>

      <nav className="hairline-scroll min-h-0 flex-1 overflow-y-auto px-2 py-3 lg:px-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-4 last:mb-0">
            {group.label ? (
              <p className="mb-1.5 hidden px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 lg:block">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const count = badges[item.badge] || 0
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      title={item.label}
                      className={({ isActive }) =>
                        classNames(
                          'group flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors',
                          'justify-center lg:justify-start',
                          isActive
                            ? 'bg-zinc-100 text-zinc-900'
                            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                        )
                      }
                    >
                      <item.icon size={16} strokeWidth={1.8} className="shrink-0" />
                      <span className="hidden min-w-0 flex-1 truncate lg:block">{item.label}</span>
                      {count > 0 ? (
                        <span className="hidden lg:block">
                          <Badge tone={item.badge === 'alerts' ? 'rose' : 'amber'} size="sm" mono>
                            {count}
                          </Badge>
                        </span>
                      ) : null}
                      {count > 0 ? (
                        <span className="absolute right-1.5 top-1.5 lg:hidden">
                          <Dot tone={item.badge === 'alerts' ? 'rose' : 'amber'} pulse />
                        </span>
                      ) : null}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* The bottom-left band is kept clear: the Guest App / Manager POS
          switcher floats there, in this same column. */}
      <div className="border-t border-zinc-200 p-2 pb-14 lg:p-3 lg:pb-14">
        <div className="flex items-center gap-2.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
            {staff?.name?.slice(0, 1) || 'V'}
          </span>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-[12px] font-medium leading-tight text-zinc-900">
              {staff?.name || 'Vinit Sharma'}
            </p>
            <p className="truncate text-[10px] leading-tight text-zinc-500">
              {staff?.title || 'Platform Admin'}
            </p>
          </div>
          <Badge tone="indigo" size="sm" className="hidden lg:inline-flex">
            {staff?.role || 'Manager'}
          </Badge>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onLock}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Lock size={13} strokeWidth={1.9} />
            <span className="hidden lg:inline">Quick lock</span>
          </button>
          <IconButton
            icon={RefreshCw}
            label="Reset demo data"
            variant="secondary"
            onClick={onReset}
          />
        </div>
      </div>
    </aside>
  )
}

export function lateTicketCount(orders, now = Date.now()) {
  return (orders || []).filter(
    (order) =>
      ['accepted', 'cooking'].includes(order.status) &&
      (now - order.createdAt) / 60000 > LATE_THRESHOLD_MIN,
  ).length
}
