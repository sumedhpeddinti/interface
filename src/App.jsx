import { Navigate, Route, Routes } from 'react-router-dom'
import { DemoSwitcher } from './components/DemoSwitcher'
import { InstallBridge } from './components/InstallBridge'
import { NotificationBridge } from './components/SystemNotifications'
import StoreLayout from './components/store/StoreLayout'
import GuestPage from './pages/GuestPage'
import OverviewPage from './pages/store/OverviewPage'
import TablesPage from './pages/store/TablesPage'
import LiveOrdersPage from './pages/store/LiveOrdersPage'
import KitchenPage from './pages/store/KitchenPage'
import BillingPage from './pages/store/BillingPage'
import CashDrawerPage from './pages/store/CashDrawerPage'
import InvoicesPage from './pages/store/InvoicesPage'
import MenuPage from './pages/store/MenuPage'
import QrCodesPage from './pages/store/QrCodesPage'
import GuestsPage from './pages/store/GuestsPage'
import CampaignsPage from './pages/store/CampaignsPage'
import ExpensesPage from './pages/store/ExpensesPage'
import StaffPage from './pages/store/StaffPage'
import FeedbackPage from './pages/store/FeedbackPage'

/* Two portals, one store:
   /            guest dining PWA (also /t/:tableId, ?table=T5, ?promo=, ?feedback=1)
   /store       managerial POS and back-of-house suite */

export default function App() {
  return (
    <>
      <NotificationBridge />
      <InstallBridge />
      <DemoSwitcher />
      <Routes>
        <Route path="/" element={<GuestPage />} />
        <Route path="/t/:tableId" element={<GuestPage />} />

        <Route path="/store" element={<StoreLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="live-orders" element={<LiveOrdersPage />} />
          <Route path="kitchen" element={<KitchenPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="cash-drawer" element={<CashDrawerPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="qr-codes" element={<QrCodesPage />} />
          <Route path="guests" element={<GuestsPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
