import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChefHat, Search } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { Badge, Button, EmptyState } from '../components/ui'
import { showSystemNotification } from '../lib/notifications'
import { InstallOffer } from '../components/guest/InstallOffer'
import { GuestHeader } from '../components/guest/GuestHeader'
import { CategoryNav } from '../components/guest/CategoryNav'
import { DishCard } from '../components/guest/DishCard'
import { CartDrawer, BasketBar } from '../components/guest/CartDrawer'
import { LiveTracker } from '../components/guest/LiveTracker'
import { FeedbackModal } from '../components/guest/FeedbackModal'
import { PushToast } from '../components/guest/PushToast'
import { CATEGORIES } from '../lib/orders'
import { normalizeTableId } from '../data/mockTables'
import { INSTALL_REWARD, applyCoupon, computeTotals } from '../lib/pricing'
import { money } from '../lib/format'
import { openRoundsOfTable, roundsOfTable, tableBill } from '../lib/selectors'

export default function GuestPage() {
  const { state, actions } = useStore()
  const params = useParams()
  const [searchParams] = useSearchParams()

  const [category, setCategory] = useState('Top Picks')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('menu')
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const linkParam = params.tableId || searchParams.get('table')
  const linkTable = useMemo(
    () => normalizeTableId(linkParam, state.tables),
    [linkParam, state.tables],
  )
  const promoParam = searchParams.get('promo')
  const feedbackOnly = searchParams.get('feedback') === '1'

  /* Adopt the QR payload: /t/:tableId, ?table=T11, ?promo=CODE, ?feedback=1 */
  useEffect(() => {
    if (linkTable && linkTable !== state.ui.guestTableId) {
      actions.setGuestTable({ tableId: linkTable })
      setView('menu')
    }
  }, [linkTable, state.ui.guestTableId, actions])

  useEffect(() => {
    if (promoParam && promoParam.toUpperCase() !== state.ui.promoCode) {
      actions.setUi({ patch: { promoCode: promoParam.toUpperCase() } })
    }
  }, [promoParam, state.ui.promoCode, actions])

  useEffect(() => {
    if (feedbackOnly) setFeedbackOpen(true)
  }, [feedbackOnly])

  const tableId = linkTable || state.ui.guestTableId || state.tables?.[0]?.id || 'T1'
  const table = useMemo(
    () =>
      state.tables.find((entry) => entry.id === tableId) || {
        id: tableId,
        section: 'Main Floor',
        seats: 4,
      },
    [state.tables, tableId],
  )
  const promo = state.ui.promoCode || null
  const installUnlocked = Boolean(state.ui.appInstalled)

  /* Installing the app is the guest claiming APP10: the flag rides on the
     device, and every round they send afterwards carries the discount onto the
     table's bill without anyone re-entering a code. */
  function grantInstallReward({ via } = {}) {
    if (!installUnlocked) {
      actions.setUi({
        patch: {
          appInstalled: true,
          installUnlockedAt: Date.now(),
          /* Never trample a voucher the guest scanned in from a QR. */
          ...(promo ? {} : { promoCode: INSTALL_REWARD.code }),
        },
      })
    }
    if (via === 'prompt') {
      showSystemNotification({
        title: 'Beno installed',
        body: `Your flat 10% off (${INSTALL_REWARD.code}) is unlocked at table ${tableId}.`,
        tag: 'beno-installed',
        kind: 'campaign',
      })
    }
  }

  const openRounds = openRoundsOfTable(state.orders, tableId)
  const allRounds = roundsOfTable(state.orders, tableId)
  const bill = tableBill(state.orders, tableId)

  /* Scanning a table's QR must always land on the menu — that is the ordering
     page. The tracker takes over only when a round is placed from this
     session, so a table that already has a bill from an earlier sitting does
     not hijack the first screen; the "rounds live on your bill" banner is how
     the guest reaches that existing bill. */
  const openRoundKey = openRounds.map((round) => round.id).join('|')
  const seenRounds = useRef(null)

  useEffect(() => {
    seenRounds.current = null
  }, [tableId])

  useEffect(() => {
    const ids = openRoundKey ? openRoundKey.split('|') : []
    if (seenRounds.current === null) {
      seenRounds.current = ids
      return
    }
    if (ids.some((id) => !seenRounds.current.includes(id))) {
      seenRounds.current = ids
      setView('tracker')
    } else if (ids.length === 0 && view === 'tracker') {
      seenRounds.current = []
      setView('menu')
    }
  }, [openRoundKey, view])

  /* Settlement arrives from the POS — surface the review sheet immediately. */
  const prompt = state.feedbackPrompt?.tableId === tableId ? state.feedbackPrompt : null
  useEffect(() => {
    if (prompt) setFeedbackOpen(true)
  }, [prompt?.invoiceId])

  const lastInvoice = useMemo(
    () => state.invoices.find((invoice) => invoice.tableId === tableId) || null,
    [state.invoices, tableId],
  )

  const cartLines = useMemo(
    () =>
      Object.entries(state.cart.items)
        .map(([id, qty]) => {
          const item = state.menu.find((entry) => entry.id === id)
          return item ? { ...item, qty } : null
        })
        .filter(Boolean),
    [state.cart.items, state.menu],
  )

  const cartTotals = useMemo(() => {
    let discount = null
    if (promo) {
      const result = applyCoupon(
        cartLines.reduce((sum, line) => sum + line.price * line.qty, 0),
        promo,
      )
      if (result.ok) discount = result.discount
    }
    return computeTotals(cartLines, discount)
  }, [cartLines, promo])

  const crossSell = useMemo(() => {
    const inCart = new Set(cartLines.map((line) => line.id))
    const preferred = ['Soups', 'Beverages', 'Desserts', 'Main Course']
    const pool = state.menu.filter((item) => item.available !== false && !inCart.has(item.id))
    const scored = pool
      .map((item) => {
        const rank = preferred.indexOf(item.category)
        return { item, score: (rank === -1 ? 9 : rank) + (item.isBestseller ? -0.5 : 0) }
      })
      .sort((a, b) => a.score - b.score)
    return scored.slice(0, 3).map((entry) => entry.item)
  }, [state.menu, cartLines])

  const visibleDishes = useMemo(() => {
    const q = query.trim().toLowerCase()
    const available = state.menu.filter((item) => item.available !== false)
    if (q) {
      return available.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q),
      )
    }
    if (category === 'Top Picks') return available.filter((item) => item.isBestseller)
    return available.filter((item) => item.category === category)
  }, [state.menu, category, query])

  const categoryCounts = useMemo(() => {
    const counts = { 'Top Picks': state.menu.filter((item) => item.isBestseller).length }
    for (const name of CATEGORIES) {
      counts[name] = state.menu.filter((item) => item.category === name).length
    }
    return counts
  }, [state.menu])

  const cartCount = cartLines.reduce((sum, line) => sum + line.qty, 0)
  const waiterPending = (state.alerts || []).some(
    (alert) => alert.kind === 'waiter' && alert.tableId === tableId && !alert.resolved,
  )
  const settled =
    allRounds.length > 0 && allRounds.every((round) => round.status === 'paid') && openRounds.length === 0

  return (
    <div className="min-h-screen bg-zinc-50">
      <PushToast
        notification={state.pushNotifications?.[0]}
        onDismiss={(id) => actions.dismissPush({ id })}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-sm">
        <GuestHeader
          table={table}
          tableId={tableId}
          tables={state.tables}
          waiterPending={waiterPending}
          onCallWaiter={(payload) => actions.callWaiter(payload)}
          rewardActive={installUnlocked}
          rewardCode={INSTALL_REWARD.code}
          onUnlock={grantInstallReward}
          onTableChange={(next) => {
            actions.setGuestTable({ tableId: next })
            setView('menu')
          }}
        />

        {settled && !prompt ? (
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-800">
                  This bill has been settled. Thank you!
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700">
                  {lastInvoice
                    ? `${lastInvoice.id} · ${money(lastInvoice.totals.total)} · ${lastInvoice.method}`
                    : 'Paid at the counter'}
                </p>
              </div>
              <Button size="xs" variant="successSoft" onClick={() => setFeedbackOpen(true)}>
                Rate visit
              </Button>
            </div>
          </div>
        ) : null}

        {view === 'tracker' ? (
          <LiveTracker
            tableId={tableId}
            rounds={openRounds}
            bill={bill}
            waiterPending={waiterPending}
            onAddMore={() => setView('menu')}
            onCancelOrder={(orderId) =>
              actions.voidOrder({
                orderId,
                actor: 'Guest',
                reason: 'Cancelled by guest',
              })
            }
          />
        ) : (
          <>
            {openRounds.length > 0 ? (
              <button
                type="button"
                onClick={() => setView('tracker')}
                className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-left transition-colors hover:bg-zinc-100"
              >
                <span className="flex items-center gap-2">
                  <ChefHat size={14} strokeWidth={1.9} className="text-zinc-500" />
                  <span className="text-[11px] font-medium text-zinc-700">
                    {openRounds.length} {openRounds.length === 1 ? 'round' : 'rounds'} live on your
                    bill
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="tnum text-[11px] font-semibold text-zinc-900">
                    {money(bill.total)}
                  </span>
                  <ArrowRight size={13} strokeWidth={2} className="text-zinc-400" />
                </span>
              </button>
            ) : null}

            <div className="border-b border-zinc-200 bg-white px-4 py-3">
              <div className="relative">
                <Search
                  size={14}
                  strokeWidth={2}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the menu — paneer, biryani, chai…"
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>

            {query ? null : (
              <CategoryNav
                categories={CATEGORIES}
                value={category}
                onChange={setCategory}
                counts={categoryCounts}
              />
            )}

            <div className="flex-1 pb-28">
              {visibleDishes.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Nothing matched that search"
                  description="Try a different dish name, or browse the categories above."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setQuery('')}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <>
                  {query ? (
                    <p className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-[11px] text-zinc-500">
                      <span className="tnum font-medium text-zinc-700">{visibleDishes.length}</span>{' '}
                      results for “{query}”
                    </p>
                  ) : null}
                  {visibleDishes.map((item) => (
                    <DishCard
                      key={item.id}
                      item={item}
                      qty={state.cart.items[item.id] || 0}
                      onAdd={(dish) => actions.addToCart({ item: dish })}
                      onIncrement={(dish) => actions.addToCart({ item: dish })}
                      onDecrement={(dish) =>
                        actions.setCartQty({
                          id: dish.id,
                          qty: (state.cart.items[dish.id] || 0) - 1,
                        })
                      }
                    />
                  ))}
                </>
              )}

              <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-5 text-center">
                <Badge tone="zinc" size="sm">
                  Beno · {table?.section}
                </Badge>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                  Order as many rounds as you like — settle everything together at the end. Prices
                  exclude 5% GST.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <BasketBar
        itemCount={cartCount}
        total={cartTotals.total}
        hidden={view === 'tracker'}
        onOpen={() => actions.toggleCart({ open: true })}
      />

      <CartDrawer
        open={state.cart.open}
        onClose={() => actions.toggleCart({ open: false })}
        tableId={tableId}
        lines={cartLines}
        totals={cartTotals}
        guest={state.cart.guest}
        promo={promo}
        crossSell={crossSell}
        onGuestChange={(patch) => actions.setCartGuest({ patch })}
        onIncrement={(line) => actions.addToCart({ item: line })}
        onDecrement={(line) =>
          actions.setCartQty({ id: line.id, qty: (state.cart.items[line.id] || 0) - 1 })
        }
        onRemove={(line) => actions.setCartQty({ id: line.id, qty: 0 })}
        onAdd={(item) => actions.addToCart({ item })}
        onPlace={() => {
          actions.placeOrder({
            tableId,
            guestName: state.cart.guest.name.trim(),
            guestPhone: state.cart.guest.phone.trim(),
            notes: state.cart.guest.notes.trim(),
          })
          setView('tracker')
        }}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => {
          setFeedbackOpen(false)
          if (prompt) actions.dismissFeedbackPrompt()
        }}
        tableId={tableId}
        guestName={prompt?.guestName || lastInvoice?.guestName || 'Guest'}
        invoiceId={prompt?.invoiceId || lastInvoice?.id || null}
        total={prompt?.total || lastInvoice?.totals?.total || 0}
        onSubmit={({ rating, pills, comment }) =>
          actions.addFeedback({
            rating,
            pills,
            comment,
            tableId,
            guestName: prompt?.guestName || lastInvoice?.guestName || 'Guest',
            invoiceId: prompt?.invoiceId || lastInvoice?.id || null,
          })
        }
      />
    </div>
  )
}
