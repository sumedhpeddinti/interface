// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from '../context/StoreContext'
import GuestPage from './GuestPage'
import OverviewPage from './store/OverviewPage'
import TablesPage from './store/TablesPage'
import LiveOrdersPage from './store/LiveOrdersPage'
import KitchenPage from './store/KitchenPage'
import BillingPage from './store/BillingPage'
import CashDrawerPage from './store/CashDrawerPage'
import InvoicesPage from './store/InvoicesPage'
import MenuPage from './store/MenuPage'
import QrCodesPage from './store/QrCodesPage'
import GuestsPage from './store/GuestsPage'
import CampaignsPage from './store/CampaignsPage'
import ExpensesPage from './store/ExpensesPage'
import StaffPage from './store/StaffPage'
import FeedbackPage from './store/FeedbackPage'

/* Every screen in the product, mounted for real inside its store and router.
   This is the suite that catches a page which renders fine until a seeded
   table has no bill, a list is empty, or a selector returns undefined. */

function renderGuest(route, path = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <Routes>
          <Route path={path} element={<GuestPage />} />
        </Routes>
      </StoreProvider>
    </MemoryRouter>,
  )
}

function renderAt(ui, route = '/store') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </StoreProvider>
    </MemoryRouter>,
  )
}

const PAGES = [
  ['Overview', OverviewPage, '/store', 'Recent activity'],
  ['Floor & Tables', TablesPage, '/store/tables', 'Floor'],
  ['Live Orders', LiveOrdersPage, '/store/live-orders', 'In kitchen'],
  ['Kitchen (KDS)', KitchenPage, '/store/kitchen', 'Hot Kitchen'],
  ['Billing', BillingPage, '/store/billing', 'Billing'],
  ['Shift & Cash Drawer', CashDrawerPage, '/store/cash-drawer', 'cash'],
  ['Invoices', InvoicesPage, '/store/invoices', 'INV/26-27'],
  ['Menu Manager', MenuPage, '/store/menu', '₹'],
  ['QR Code Studio', QrCodesPage, '/store/qr-codes', 'QR'],
  ['Guests & CRM', GuestsPage, '/store/guests', 'Guests in CRM'],
  ['Campaigns', CampaignsPage, '/store/campaigns', 'Campaign composer'],
  ['Expenses & P&L', ExpensesPage, '/store/expenses', 'Operating'],
  ['Staff & Roles', StaffPage, '/store/staff', 'Role permissions'],
  ['Feedback', FeedbackPage, '/store/feedback', 'Feedback'],
]

beforeEach(() => {
  window.localStorage.clear()
  /* jsdom ships neither of these, and the store's effects touch both. */
  window.scrollTo = window.scrollTo || (() => {})
  window.print = window.print || (() => {})
})

afterEach(() => {
  cleanup()
})

describe('store pages', () => {
  it.each(PAGES)('mounts %s with real seeded data', (_name, Page, route, marker) => {
    const { container } = renderAt(<Page />, route)
    expect(container.textContent.length).toBeGreaterThan(80)
    expect(container.textContent.toLowerCase()).toContain(marker.toLowerCase())
  })

  it.each(PAGES)('does not log an error while rendering %s', (_name, Page, route) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt(<Page />, route)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})

describe('guest app', () => {
  /* The menu is the ordering page, so scanning a QR always lands there — even
     on a table that already has a bill from an earlier sitting. */
  it('lands on the menu even when the table already has an open bill', () => {
    const { container } = renderGuest('/')
    expect(screen.getByText('Ganesh Café')).toBeTruthy()
    expect(screen.getByText(/Call Waiter/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/Search the menu/i)).toBeTruthy()
    expect(container.textContent).toMatch(/Top Picks/)
    expect(screen.getAllByText('Add').length).toBeGreaterThan(0)
    /* The existing bill is offered, not forced on the guest. */
    expect(container.textContent).toMatch(/round live on your bill/)
    expect(container.textContent).not.toMatch(/Your rounds/)
  })

  it('opens the existing bill when the guest taps the banner', () => {
    const { container } = renderGuest('/')
    fireEvent.click(screen.getByText(/round live on your bill/i))
    expect(container.textContent).toMatch(/Your rounds/)
    expect(container.textContent).toMatch(/Add more to this bill/)
  })

  it('advances to the tracker once the guest places an order', () => {
    const { container } = renderGuest('/')
    fireEvent.click(screen.getAllByText('Add')[0])
    fireEvent.click(screen.getByText(/item in your basket/i))
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Vinit/i), {
      target: { value: 'Vinit' },
    })
    fireEvent.change(screen.getByPlaceholderText(/98765 43210/), {
      target: { value: '9876543210' },
    })
    fireEvent.click(screen.getByText(/^Place order/))
    /* The basket is replaced by the live tracker, as a second round on T1. */
    expect(container.textContent).toMatch(/Round 2/)
    expect(container.textContent).toMatch(/Your rounds/)
  })

  it('honours a table from the deep link /t/:tableId', () => {
    const { container } = renderGuest('/t/T7', '/t/:tableId')
    expect(container.textContent).toContain('Table T7')
  })

  it('honours ?table=T9 from a scanned QR code', () => {
    const { container } = renderGuest('/?table=T9')
    expect(container.textContent).toContain('Table T9')
  })

  it('opens the review sheet directly for ?feedback=1', () => {
    const { container } = renderGuest('/?feedback=1')
    expect(container.textContent).toMatch(/How was|rating|review/i)
  })
})
