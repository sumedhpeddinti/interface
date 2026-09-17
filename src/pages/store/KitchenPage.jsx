import { useMemo, useState } from 'react'
import { AlertTriangle, ChefHat, CheckCheck, Inbox, Timer, Utensils } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { Badge, Card, EmptyState, InlineNote, Tabs } from '../../components/ui'
import { KPIGrid, PageHeader } from '../../components/store/PageParts'
import { KdsCard } from '../../components/store/KdsCard'
import { useNow } from '../../lib/ticker'
import { kitchenTickets, lateMinutes } from '../../lib/selectors'
import { LATE_THRESHOLD_MIN, ROUND_STATUS, STATIONS } from '../../lib/orders'
import { duration } from '../../lib/format'

export default function KitchenPage() {
  const { state, actions } = useStore()
  const now = useNow()
  const [station, setStation] = useState('All Stations')
  const [lateOnly, setLateOnly] = useState(false)

  const tickets = useMemo(
    () => kitchenTickets(state.orders, station),
    [state.orders, station],
  )

  const lateTickets = tickets.filter((ticket) => lateMinutes(ticket, now) > 0)
  const visible = lateOnly ? lateTickets : tickets

  const totalItems = tickets.reduce(
    (sum, ticket) => sum + (ticket.stationItems || ticket.items).length,
    0,
  )
  const platedItems = tickets.reduce(
    (sum, ticket) =>
      sum +
      (ticket.stationItems || ticket.items).filter((item) =>
        (ticket.readyItemIds || []).includes(item.id),
      ).length,
    0,
  )
  const avgPrep = tickets.length
    ? tickets.reduce((sum, ticket) => sum + (now - ticket.createdAt), 0) / tickets.length
    : 0

  const bumpedToday = state.events.filter((event) => event.type === 'kds').length
  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kitchen display"
        description="Prep tickets by station. Tick items as they are plated, then bump the ticket to push it to the floor and update the guest's tracker."
        badge={
          lateTickets.length > 0 ? (
            <Badge tone="rose" size="md" icon={AlertTriangle}>
              {lateTickets.length} late
            </Badge>
          ) : (
            <Badge tone="emerald" size="md" dot>
              On time
            </Badge>
          )
        }
      />

      <KPIGrid
        columns={4}
        items={[
          {
            label: 'Tickets on the pass',
            value: tickets.length,
            hint: `${state.orders.filter((order) => order.status === ROUND_STATUS.ACCEPTED).length} not started`,
            icon: ChefHat,
            tone: 'amber',
          },
          {
            label: 'Items to plate',
            value: `${platedItems}/${totalItems}`,
            hint: 'ticked ready',
            icon: Utensils,
            tone: 'indigo',
          },
          {
            label: 'Average time on pass',
            value: avgPrep ? duration(avgPrep) : '—',
            hint: `late beyond ${LATE_THRESHOLD_MIN} minutes`,
            icon: Timer,
            tone: lateTickets.length ? 'rose' : 'emerald',
          },
          {
            label: 'Bumped this session',
            value: bumpedToday,
            hint: 'tickets completed',
            icon: CheckCheck,
            tone: 'emerald',
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={station}
          onChange={setStation}
          tabs={[
            {
              id: 'All Stations',
              label: 'All stations',
              count: kitchenTickets(state.orders, 'All Stations').length,
            },
            ...STATIONS.map((name) => ({
              id: name,
              label: name,
              count: kitchenTickets(state.orders, name).length,
            })),
          ]}
        />
        <button
          type="button"
          onClick={() => setLateOnly((value) => !value)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          <AlertTriangle
            size={12}
            strokeWidth={2.2}
            className={lateOnly ? 'text-rose-600' : 'text-zinc-400'}
          />
          Late only
          {lateTickets.length > 0 ? (
            <Badge tone="rose" size="sm" mono>
              {lateTickets.length}
            </Badge>
          ) : null}
        </button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={lateOnly ? 'Nothing is running late' : 'The pass is clear'}
            description={
              lateOnly
                ? 'Every ticket is inside the fifteen minute window.'
                : `New rounds land here the moment the floor acknowledges them. Filtering by ${station}.`
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {visible.map((ticket) => (
            <KdsCard
              key={`${ticket.id}-${station}`}
              ticket={ticket}
              now={now}
              onToggleItem={(target, item) =>
                actions.toggleItemReady({ orderId: target.id, itemId: item.id })
              }
              onStart={(target) => actions.startCooking({ orderId: target.id })}
              onBump={(target) => actions.bumpTicket({ orderId: target.id, actor: staff?.name })}
              onServe={(target) => actions.serveOrder({ orderId: target.id, actor: 'Kitchen pass' })}
            />
          ))}
        </div>
      )}

      <InlineNote tone="zinc" icon={ChefHat}>
        Tickets older than {LATE_THRESHOLD_MIN} minutes are flagged red. Ticking every item on a
        ticket also marks it ready automatically — bumping is for the case where you want to push it
        early.
      </InlineNote>
    </div>
  )
}
