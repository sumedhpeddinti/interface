import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, CheckCheck, ChefHat, Inbox, Search } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  InlineNote,
  SearchInput,
  Tabs,
} from '../../components/ui'
import { KPIGrid, PageHeader } from '../../components/store/PageParts'
import { OrderCard } from '../../components/store/OrderCard'
import { orderQueueCounts } from '../../lib/selectors'
import { ROUND_STATUS, STATUS_META } from '../../lib/orders'
import { classNames, clock } from '../../lib/format'

export default function LiveOrdersPage() {
  const { state, actions } = useStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const queue = state.orders.filter((order) => order.status !== 'void' && order.status !== 'paid')
  const counts = orderQueueCounts(state.orders)
  const alerts = (state.alerts || []).filter((alert) => !alert.resolved)

  const filtered = useMemo(() => {
    const rank = { sent: 0, accepted: 1, cooking: 2, ready: 3, served: 4 }
    const q = query.trim().toLowerCase()
    return queue
      .filter((order) => {
        if (filter === 'new') return order.status === ROUND_STATUS.SENT
        if (filter === 'kitchen')
          return [ROUND_STATUS.ACCEPTED, ROUND_STATUS.COOKING].includes(order.status)
        if (filter === 'ready') return order.status === ROUND_STATUS.READY
        if (filter === 'served') return order.status === ROUND_STATUS.SERVED
        return true
      })
      .filter((order) => {
        if (!q) return true
        return (
          order.tableId.toLowerCase().includes(q) ||
          (order.guestName || '').toLowerCase().includes(q) ||
          (order.guestPhone || '').includes(q) ||
          order.id.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const byRank = (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
        return byRank !== 0 ? byRank : a.createdAt - b.createdAt
      })
  }, [queue, filter, query])

  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)

  function openInBilling(order) {
    actions.setUi({ patch: { billingSelectedTable: order.tableId } })
    navigate('/store/billing')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live orders"
        description="Every round placed from a guest table or the counter, in real time. Acknowledge to silence the alert and push the ticket to the kitchen."
        badge={
          counts.unacknowledged > 0 ? (
            <Badge tone="rose" size="md" dot pulse>
              {counts.unacknowledged} new
            </Badge>
          ) : (
            <Badge tone="emerald" size="md" dot>
              All caught up
            </Badge>
          )
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={alerts.length === 0}
            onClick={() => actions.clearResolvedAlerts()}
          >
            Clear resolved alerts
          </Button>
        }
      />

      <KPIGrid
        columns={3}
        items={[
          {
            label: 'Not acknowledged',
            value: counts.unacknowledged,
            hint: 'waiting on the floor team',
            icon: BellRing,
            tone: 'rose',
          },
          {
            label: 'In the kitchen',
            value: counts.inKitchen,
            hint: 'accepted and cooking',
            icon: ChefHat,
            tone: 'amber',
          },
          {
            label: 'Ready to serve',
            value: counts.ready,
            hint: 'plated and waiting',
            icon: CheckCheck,
            tone: 'emerald',
          },
        ]}
      />

      {alerts.length > 0 ? (
        <Card className="border-rose-200">
          <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2.5">
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-800">
              <BellRing size={13} strokeWidth={2} />
              Floor calls ({alerts.length})
            </p>
            <span className="text-[11px] text-rose-700">
              Guest tapped “Call Waiter” — a chime also played.
            </span>
          </div>
          <ul className="divide-y divide-zinc-200">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-medium text-zinc-900">
                    <span className="tnum">{alert.tableId}</span>
                    <Badge tone={alert.kind === 'order' ? 'amber' : 'rose'} size="sm">
                      {alert.kind === 'order' ? 'New round' : 'Waiter call'}
                    </Badge>
                    <span className="truncate text-zinc-600">{alert.title}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">{alert.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tnum text-[11px] text-zinc-400">{clock(alert.at)}</span>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() =>
                      actions.resolveAlert({ alertId: alert.id, actor: staff?.name || 'Floor' })
                    }
                  >
                    Resolve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: 'all', label: 'All active', count: queue.length },
            { id: 'new', label: 'New', count: counts.unacknowledged },
            { id: 'kitchen', label: 'In kitchen', count: counts.inKitchen },
            { id: 'ready', label: 'Ready', count: counts.ready },
            {
              id: 'served',
              label: 'Served',
              count: queue.filter((order) => order.status === ROUND_STATUS.SERVED).length,
            },
          ]}
        />
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search table, guest, phone or order id"
          className="w-full sm:w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={query ? 'No orders matched that search' : 'Nothing in the queue'}
            description={
              query
                ? 'Try a different table number or guest name.'
                : 'When a guest places a round from their table it lands here instantly, with a chime.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAcknowledge={(target) =>
                actions.acknowledgeOrder({ orderId: target.id, actor: staff?.name || 'Floor' })
              }
              onMarkReady={(target) =>
                actions.bumpTicket({ orderId: target.id, actor: staff?.name || 'Kitchen' })
              }
              onServe={(target) =>
                actions.serveOrder({ orderId: target.id, actor: staff?.name || 'Floor' })
              }
              onOpenBilling={openInBilling}
              onVoid={(target) =>
                actions.voidOrder({
                  orderId: target.id,
                  actor: staff?.name || 'Manager',
                  reason: 'voided from live orders',
                })
              }
            />
          ))}
        </div>
      )}

      {queue.some((order) => order.status === ROUND_STATUS.SERVED) ? (
        <InlineNote tone="zinc">
          Rounds marked <span className="font-medium">{STATUS_META.served.label}</span> are waiting at
          the table for settlement —{' '}
          <button
            type="button"
            className={classNames('font-medium underline underline-offset-2')}
            onClick={() => navigate('/store/billing')}
          >
            open the register
          </button>
          .
        </InlineNote>
      ) : null}
    </div>
  )
}
