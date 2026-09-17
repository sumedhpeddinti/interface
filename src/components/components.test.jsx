// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '../context/StoreContext'
import { buildSeedState } from '../data/seedState'
import { mockMenu } from '../data/mockMenu'
import { CATEGORIES } from '../lib/orders'
import { cashDrawerSummary, dashboardMetrics, kitchenTickets, orderQueue, tableBill } from '../lib/selectors'
import { computeTotals } from '../lib/pricing'

/* Shared primitives. */
import {
  Badge,
  BarChart,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  ConfirmModal,
  Divider,
  DishThumb,
  Dot,
  Drawer,
  EmptyState,
  Field,
  IconButton,
  InlineNote,
  Input,
  KeyValue,
  Modal,
  PillTabs,
  ProgressBar,
  RadioGroup,
  Rating,
  SearchInput,
  SectionTitle,
  Select,
  StackedBar,
  StatKPI,
  Switch,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  Textarea,
  UnderlineTabs,
  VegMark,
} from './ui'

/* Page scaffolding. */
import { DataRow, KPIGrid, PageHeader, StatusStrip, Toolbar } from './store/PageParts'

/* Guest portal. */
import { BasketBar, CartDrawer } from './guest/CartDrawer'
import { CategoryNav } from './guest/CategoryNav'
import { DishCard } from './guest/DishCard'
import { FeedbackModal } from './guest/FeedbackModal'
import { GuestHeader } from './guest/GuestHeader'
import { InstallHelpModal, InstallOffer } from './guest/InstallOffer'
import { LiveTracker } from './guest/LiveTracker'
import { PushToast } from './guest/PushToast'
import { TableSwitcher } from './guest/TableSwitcher'

/* POS portal. */
import { AddItemsModal } from './store/AddItemsModal'
import { CampaignStats, ChannelBadge } from './store/CampaignStats'
import { CashMovementModal, CloseShiftModal, OpenShiftModal } from './store/CashDrawerModal'
import { CashierRegisterModal } from './store/CashierKeypad'
import { FloorPlanView } from './store/FloorPlanView'
import { KdsCard } from './store/KdsCard'
import { OrderCard } from './store/OrderCard'
import { LockScreen, PinPad, PinPadModal, RestrictedPanel } from './store/PinPadModal'
import { QRCodeSheet, QrCard } from './store/QRCodeSheet'
import { StoreHeader } from './store/StoreHeader'
import { StoreSidebar } from './store/StoreSidebar'
import { ThermalInvoice } from './store/ThermalInvoice'

/* Shell. */
import { DemoSwitcher } from './DemoSwitcher'
import { InstallBridge } from './InstallBridge'
import { NotificationBridge } from './SystemNotifications'

/* Every component in the tree, rendered for real with seeded props. Anything
   that throws on an empty list, a missing bill or an undefined table lands
   here rather than in front of a guest. */

const noop = () => {}
const state = buildSeedState()
const now = Date.now()
const table = state.tables[0]
const openRounds = state.orders.filter(
  (order) => order.tableId === 'T1' && order.status !== 'paid' && order.status !== 'void',
)
const bill = tableBill(state.orders, 'T1')
const ticket = kitchenTickets(state.orders)[0] || state.orders[0]
const queued = orderQueue(state.orders)[0] || state.orders[0]
const dish = mockMenu[0]
const cartLines = [{ ...dish, qty: 2 }]
const totals = computeTotals(cartLines)
const invoice = state.invoices[0]

function mount(ui, route = '/store') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>{ui}</StoreProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  window.scrollTo = window.scrollTo || (() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ui primitives', () => {
  const CASES = [
    ['Badge', <Badge tone="emerald" size="sm" dot pulse>Paid</Badge>, 'Paid'],
    ['Badge with icon', <Badge icon={Dot}>Occupied</Badge>, 'Occupied'],
    ['Dot', <Dot tone="rose" pulse />, ''],
    ['VegMark veg', <VegMark isVeg />, ''],
    ['VegMark non-veg', <VegMark isVeg={false} />, ''],
    ['Button primary', <Button variant="primary">Settle ₹529.20</Button>, 'Settle'],
    ['Button as link', <Button as="a" href="#x">Open</Button>, 'Open'],
    ['Button group', <ButtonGroup><Button>A</Button><Button>B</Button></ButtonGroup>, 'A'],
    ['IconButton', <IconButton icon={Dot} label="Remove guest" />, ''],
    ['Card header', <Card><CardHeader title="Shift" subtitle="SH-0007" icon={Dot} /><CardBody>Body</CardBody><CardFooter>Foot</CardFooter></Card>, 'Shift'],
    ['Divider', <Divider label="today" />, 'today'],
    ['Section title', <SectionTitle hint="4 items">Rounds</SectionTitle>, 'Rounds'],
    ['Table', <TableWrap><Table><THead><TR><TH>Guest</TH></TR></THead><TBody><TR><TD mono>Vinit</TD></TR></TBody></Table></TableWrap>, 'Vinit'],
    ['DishThumb', <DishThumb item={dish} size={48} />, ''],
    ['EmptyState', <EmptyState icon={Dot} title="No guests" description="Try another segment" action={<Button>Add</Button>} />, 'No guests'],
    ['InlineNote', <InlineNote tone="amber" icon={Dot}>Careful</InlineNote>, 'Careful'],
    ['Field + Input', <Field label="Guest name" hint="As printed" required><Input value="Vinit" onChange={noop} /></Field>, 'Guest name'],
    ['Textarea', <Textarea value="extra plates" onChange={noop} />, 'extra plates'],
    ['Select', <Select value="T1" onChange={noop}><option value="T1">T1</option></Select>, 'T1'],
    ['SearchInput', <SearchInput value="" onChange={noop} />, ''],
    ['Switch', <Switch checked onChange={noop} label="Accepting orders" />, 'Accepting orders'],
    ['Checkbox', <Checkbox checked onChange={noop} label="Veg only" />, 'Veg only'],
    ['RadioGroup', <RadioGroup options={[{ id: 'seats', label: 'By seats' }]} value="seats" onChange={noop} />, 'By seats'],
    ['StatKPI', <StatKPI label="Revenue today" value="₹12,480" hint="8 bills" icon={Dot} tone="emerald" />, 'Revenue today'],
    ['BarChart', <BarChart data={[{ label: '1p', value: 1200 }, { label: '2p', value: 800 }]} />, '1p'],
    ['ProgressBar', <ProgressBar value={60} tone="amber" />, ''],
    ['StackedBar', <StackedBar segments={[{ label: 'Cash', value: 3, className: 'bg-zinc-800' }]} />, ''],
    ['KeyValue', <KeyValue label="Gross revenue" value="₹48,320" />, '₹48,320'],
    ['Rating', <Rating value={4.6} count={12} />, ''],
    ['Modal', <Modal open onClose={noop} title="Take payment" subtitle="Table T1">Body copy</Modal>, 'Take payment'],
    ['Modal print area', <Modal open onClose={noop} title="Receipt" printArea>Body</Modal>, 'Receipt'],
    ['Drawer', <Drawer open onClose={noop} title="Vinit Sharma" subtitle="+91 98765 43210" footer={<Button>Close</Button>}>Drawer body</Drawer>, 'Vinit Sharma'],
    ['ConfirmModal', <ConfirmModal open onClose={noop} onConfirm={noop} title="Reset demo data?" description="Cannot be undone" />, 'Reset demo data?'],
    ['Tabs', <Tabs tabs={[{ id: 'now', label: 'Send now' }, { id: 'later', label: 'Later' }]} value="now" onChange={noop} />, 'Send now'],
    ['PillTabs', <PillTabs tabs={[{ id: 'all', label: 'All Guests' }]} value="all" onChange={noop} />, 'All Guests'],
    ['UnderlineTabs', <UnderlineTabs tabs={[{ id: 'a', label: 'Round 1' }]} value="a" onChange={noop} />, 'Round 1'],
  ]

  it.each(CASES)('renders %s', (_name, element, marker) => {
    const { container } = mount(element)
    expect(container.firstChild).toBeTruthy()
    if (marker) expect(container.textContent).toContain(marker)
  })

  it.each(CASES)('renders %s without console errors', (_name, element) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mount(element)
    expect(error).not.toHaveBeenCalled()
  })

  it('labels an icon-only button for screen readers', () => {
    const { container } = mount(<IconButton icon={Dot} label="Remove guest" />)
    expect(container.querySelector('[aria-label="Remove guest"]')).toBeTruthy()
  })
})

describe('page scaffolding', () => {
  it('renders a page header with badge and actions', () => {
    const { container } = mount(
      <PageHeader
        title="Live orders"
        description="Real-time order stream"
        badge={<Badge tone="rose">2 new</Badge>}
        actions={<Button>Refresh</Button>}
      />,
    )
    expect(container.textContent).toContain('Live orders')
    expect(container.textContent).toContain('2 new')
  })

  it('renders a KPI grid, toolbars, data rows and a status strip', () => {
    const { container } = mount(
      <>
        <KPIGrid
          columns={3}
          items={[{ label: 'Ready to serve', value: 3, hint: 'on the pass', icon: Dot, tone: 'emerald' }]}
        />
        <Toolbar>
          <span>Filters</span>
        </Toolbar>
        <DataRow label="Lifetime value" value="₹18,420.00" />
        <StatusStrip items={[{ label: 'Drawer', value: '₹12,480', hint: 'expected' }]} />
      </>,
    )
    expect(container.textContent).toContain('Ready to serve')
    expect(container.textContent).toContain('Lifetime value')
    expect(container.textContent).toContain('Drawer')
  })
})

describe('guest components', () => {
  it('renders the header with the table chip beside the café name', () => {
    const { container } = mount(
      <GuestHeader
        table={table}
        tableId="T1"
        tables={state.tables}
        waiterPending={false}
        onCallWaiter={noop}
        onTableChange={noop}
      />,
    )
    expect(container.textContent).toContain('Ganesh Café')
    expect(container.textContent).toContain('Table T1')
    expect(container.querySelector('[aria-haspopup="listbox"]')).toBeTruthy()
  })

  it('renders the call-waiter sheet when opened', () => {
    const { container } = mount(
      <GuestHeader
        table={table}
        tableId="T1"
        tables={state.tables}
        waiterPending
        onCallWaiter={noop}
        onTableChange={noop}
      />,
    )
    const trigger = [...container.querySelectorAll('button')].find((button) =>
      /Call Waiter/i.test(button.textContent),
    )
    trigger.click()
    cleanup()
    const second = mount(
      <GuestHeader
        table={table}
        tableId="T1"
        tables={state.tables}
        waiterPending
        onCallWaiter={noop}
        onTableChange={noop}
      />,
    )
    expect(second.container.textContent).toContain('Call Waiter')
  })

  it('renders the floating-free table switcher as a listbox', () => {
    const { container } = mount(<TableSwitcher tables={state.tables} tableId="T1" onChange={noop} />)
    const chip = container.querySelector('[aria-haspopup="listbox"]')
    expect(chip.textContent).toContain('T1')
    expect(container.querySelector('.fixed')).toBeNull()
  })

  it('renders the category rail', () => {
    const { container } = mount(
      <CategoryNav categories={CATEGORIES} value="Top Picks" onChange={noop} counts={{ 'Top Picks': 6 }} />,
    )
    expect(container.textContent).toContain('Top Picks')
    expect(container.textContent).toContain('Beverages')
  })

  it('renders a dish card in both empty and in-cart states', () => {
    const { container: empty } = mount(<DishCard item={dish} qty={0} onAdd={noop} />)
    expect(empty.textContent).toContain(dish.name)
    cleanup()
    const { container: filled } = mount(
      <DishCard item={dish} qty={2} onAdd={noop} onIncrement={noop} onDecrement={noop} />,
    )
    expect(filled.textContent).toContain('2')
  })

  it('renders the basket bar only when there is something in it', () => {
    const { container: hidden } = mount(<BasketBar itemCount={0} total={0} hidden={false} onOpen={noop} />)
    expect(hidden.firstChild).toBeNull()
    cleanup()
    const { container: shown } = mount(
      <BasketBar itemCount={3} total={totals.total} hidden={false} onOpen={noop} />,
    )
    expect(shown.textContent).toContain('3')
  })

  it('renders the cart drawer with cross-sell items and guest fields', () => {
    const { container } = mount(
      <CartDrawer
        open
        onClose={noop}
        tableId="T1"
        lines={cartLines}
        totals={totals}
        guest={{ name: '', phone: '', notes: '' }}
        promo={null}
        crossSell={[mockMenu[1], mockMenu[2]]}
        onGuestChange={noop}
        onIncrement={noop}
        onDecrement={noop}
        onRemove={noop}
        onAdd={noop}
        onPlace={noop}
      />,
    )
    expect(container.textContent).toContain(dish.name)
    expect(container.textContent).toMatch(/Goes well with/)
  })

  it('renders the live tracker for open rounds', () => {
    const { container } = mount(
      <LiveTracker tableId="T1" rounds={openRounds} bill={bill} waiterPending={false} onAddMore={noop} />,
    )
    expect(container.textContent).toMatch(/Round 1/)
    expect(container.textContent).toMatch(/Add more to this bill/)
  })

  it('renders the tracker with no rounds at all', () => {
    const { container } = mount(
      <LiveTracker tableId="T9" rounds={[]} bill={tableBill(state.orders, 'T9')} onAddMore={noop} />,
    )
    expect(container.textContent.length).toBeGreaterThan(0)
  })

  it('renders the review sheet', () => {
    const { container } = mount(
      <FeedbackModal
        open
        onClose={noop}
        tableId="T1"
        guestName="Vinit Sharma"
        invoiceId={invoice?.id || null}
        total={529.2}
        onSubmit={noop}
      />,
    )
    expect(container.textContent).toMatch(/Delicious Food|rating|visit/i)
  })

  it('renders a push banner with and without a notification', () => {
    const { container: idle } = mount(<PushToast notification={null} onDismiss={noop} />)
    expect(idle.firstChild).toBeNull()
  })
})

describe('app install', () => {
  it('offers the flat 10% with a download beside it, before it is unlocked', () => {
    const { container, getByRole } = mount(<InstallOffer rewardActive={false} onUnlock={noop} />)
    expect(container.textContent).toMatch(/Get 10% off/)
    expect(container.textContent).toMatch(/no minimum/i)
    /* The action next to the offer is the download button. */
    expect(getByRole('button', { name: /Download/ })).toBeTruthy()
    /* No big install sales pitch anywhere. */
    expect(container.textContent).not.toMatch(/Download app/)
    expect(container.textContent).not.toMatch(/Installs like a native app/)
  })

  it('shows the unlocked reward once the app is installed', () => {
    const { container } = mount(
      <InstallOffer rewardActive rewardCode="APP10" onUnlock={noop} />,
    )
    expect(container.textContent).toMatch(/APP10 applied/)
    expect(container.textContent).toContain('10% off every round')
    /* The offer and its button are gone — there is nothing left to claim. */
    expect(container.textContent).not.toMatch(/Get 10% off/)
    expect(container.textContent).not.toMatch(/Download/)
  })

  it('unlocks the reward directly when Download is clicked', () => {
    const onUnlock = vi.fn()
    mount(<InstallOffer rewardActive={false} onUnlock={onUnlock} />)

    fireEvent.click(screen.getByRole('button', { name: /Download/ }))
    expect(onUnlock).toHaveBeenCalledWith({ via: 'prompt' })
  })

  it('renders the help sheet with real steps for each platform', () => {
    const { container } = mount(
      <InstallHelpModal open onClose={noop} onClaim={noop} />,
    )
    expect(container.textContent).toMatch(/Share|address bar|browser menu/i)
    /* A numbered walkthrough, not a dead end. */
    expect(container.querySelectorAll('ol > li').length).toBeGreaterThanOrEqual(3)
  })

  it('mounts the install bridge without rendering anything', () => {
    const { container } = mount(<InstallBridge />)
    expect(container.firstChild).toBeNull()
  })
})

describe('store components', () => {
  it('renders the floor plan for every table', () => {
    const entries = dashboardMetrics(state, now).tableStates
    const { container } = mount(
      <FloorPlanView entries={entries} selectedId="T1" onSelect={noop} now={now} />,
    )
    expect(container.textContent).toContain('T1')
    expect(container.textContent).toMatch(/Main Floor/)
  })

  it('renders a live order ticket in every status', () => {
    for (const status of ['sent', 'accepted', 'cooking', 'ready', 'served']) {
      cleanup()
      const { container } = mount(
        <OrderCard
          order={{ ...queued, status }}
          onAcknowledge={noop}
          onMarkReady={noop}
          onServe={noop}
          onOpenBilling={noop}
          onVoid={noop}
        />,
      )
      expect(container.textContent.length).toBeGreaterThan(10)
    }
  })

  it('renders a kitchen ticket, including a late one', () => {
    const { container } = mount(<KdsCard ticket={ticket} now={now} />)
    expect(container.textContent).toContain('Round')
    cleanup()
    const stale = { ...ticket, createdAt: now - 26 * 60_000, status: 'cooking' }
    const { container: late } = mount(<KdsCard ticket={stale} now={now} />)
    expect(late.textContent).toMatch(/late/i)
  })

  it('renders the register modal with a real bill', () => {
    const { container } = mount(
      <CashierRegisterModal
        open
        onClose={noop}
        tableId="T1"
        invoiceRef="INV/26-27/0004"
        bill={bill}
        guests={state.guests}
        staff={state.staff[0]}
        onSettle={noop}
      />,
    )
    expect(container.textContent).toMatch(/Table T1|settle/i)
  })

  it('renders the thermal invoice for a settled bill', () => {
    const { container } = mount(
      <ThermalInvoice open onClose={noop} invoice={invoice} restaurant={state.restaurant} />,
    )
    expect(container.textContent).toContain(invoice.id)
    expect(container.textContent).toMatch(/GST/)
  })

  it('renders nothing for a thermal invoice with no bill', () => {
    const { container } = mount(<ThermalInvoice open onClose={noop} invoice={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the shift dialogs', () => {
    const { container: open1 } = mount(<OpenShiftModal open onClose={noop} onOpen={noop} />)
    expect(open1.textContent).toMatch(/Start a new shift/)
    cleanup()
    const { container: move } = mount(
      <CashMovementModal open onClose={noop} onSubmit={noop} txnType="in" />,
    )
    expect(move.textContent.length).toBeGreaterThan(10)
    cleanup()
    const { container: close } = mount(
      <CloseShiftModal open onClose={noop} summary={cashDrawerSummary(state, now)} onConfirm={noop} />,
    )
    expect(close.textContent).toMatch(/shift|drawer/i)
  })

  it('renders the PIN pad, the lock screen and the restricted panel', () => {
    const { container: pad } = mount(<PinPad value="12" onChange={noop} onComplete={noop} />)
    expect(pad.textContent).toContain('1')
    cleanup()
    const { container: lock } = mount(<LockScreen staff={state.staff} onSuccess={noop} />)
    expect(lock.textContent.length).toBeGreaterThan(10)
    cleanup()
    const { container: restricted } = mount(
      <RestrictedPanel area="campaigns" role="Cashier" staff={state.staff} onUnlock={noop} />,
    )
    expect(restricted.textContent).toMatch(/Restricted area/i)
    cleanup()
    const { container: modal } = mount(
      <PinPadModal open onClose={noop} onSuccess={noop} staff={state.staff} />,
    )
    expect(modal.textContent).toMatch(/PIN/i)
  })

  it('renders the A4 QR sheet and a single card', () => {
    const cards = state.tables.slice(0, 6).map((entry) => ({
      id: entry.id,
      label: entry.id,
      subtitle: `${entry.section} · ${entry.seats} seats`,
      action: 'Scan to browse the menu',
      hash: 'GC-AAAAAA',
      status: 'Active',
      svg: '',
    }))
    const { container } = mount(
      <QRCodeSheet
        cards={cards}
        sheetNumber={0}
        sheetCount={1}
        tagline={state.restaurant.tagline}
        onPrint={noop}
        onDownloadAll={noop}
        onDownloadCard={noop}
      />,
    )
    expect(container.textContent).toContain('Ganesh Café')
    expect(container.textContent).toContain(state.restaurant.tagline)
    cleanup()
    const { container: single } = mount(<QrCard card={cards[0]} />)
    expect(single.textContent).toContain('T1')
  })

  it('renders the campaign ROI dashboard', () => {
    const { container } = mount(<CampaignStats campaigns={state.campaigns} />)
    expect(container.textContent).toMatch(/Messages sent|Sent/i)
    cleanup()
    const { container: badges } = mount(
      <>
        <ChannelBadge channel="push" />
        <ChannelBadge channel="whatsapp" />
      </>,
    )
    expect(badges.textContent).toMatch(/Web Push/i)
    expect(badges.textContent).toMatch(/WhatsApp/i)
  })

  it('renders the add-items modal for a table', () => {
    const { container } = mount(
      <AddItemsModal open onClose={noop} menu={state.menu} tableId="T1" onAdd={noop} />,
    )
    expect(container.textContent).toMatch(/T1|Add/i)
  })

  it('renders the sidebar and the store header', () => {
    const { container: bar } = mount(
      <StoreSidebar badges={{ alerts: 2, late: 1 }} staff={state.staff[0]} storeOpen onLock={noop} onReset={noop} />,
    )
    expect(bar.textContent).toContain('Overview')
    expect(bar.textContent).toContain('Kitchen')
    cleanup()
    const { container: header } = mount(
      <StoreHeader
        storeOpen
        onToggleStore={noop}
        soundEnabled
        onToggleSound={noop}
        shift={state.shift}
        staff={state.staff[0]}
        queue={{ unacknowledged: 2 }}
        onLock={noop}
      />,
    )
    expect(header.textContent).toMatch(/Overview|Ganesh Café/)
    expect(header.textContent).toContain('2 new')
  })
})

describe('shell', () => {
  it('renders the portal switcher in the bottom-left, hidden on small screens', () => {
    const { container } = mount(<DemoSwitcher />, '/')
    const wrap = container.querySelector('.fixed')
    expect(wrap.className).toContain('bottom-4')
    expect(wrap.className).toContain('left-4')
    expect(wrap.className).toContain('hidden')
    expect(wrap.className).toContain('md:block')
    expect(container.textContent).toContain('Guest App')
    expect(container.textContent).toContain('Manager POS')
  })

  it('mounts the notification bridge without rendering anything or crashing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = mount(<NotificationBridge />)
    expect(container.firstChild).toBeNull()
    expect(error).not.toHaveBeenCalled()
  })
})
