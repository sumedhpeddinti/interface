import { Link } from 'react-router-dom'
import {
  Activity,
  BadgeIndianRupee,
  BellRing,
  ChefHat,
  CreditCard,
  ReceiptText,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dot,
  EmptyState,
  InlineNote,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TableWrap,
} from '../../components/ui'
import { KPIGrid, PageHeader, StatusStrip } from '../../components/store/PageParts'
import { useNow } from '../../lib/ticker'
import { campaignTotals, cashDrawerSummary, dashboardMetrics, feedbackSummary, hourlySales, topDishes } from '../../lib/selectors'
import { classNames, clock, compactMoney, duration, money, relativeDay } from '../../lib/format'

const EVENT_TONE = {
  order: 'amber',
  settle: 'emerald',
  kds: 'indigo',
  waiter: 'rose',
  campaign: 'indigo',
  shift: 'zinc',
  expense: 'rose',
  feedback: 'emerald',
  menu: 'zinc',
  transfer: 'zinc',
  serve: 'emerald',
  void: 'rose',
  cash: 'zinc',
}

export default function OverviewPage() {
  const { state } = useStore()
  const now = useNow()

  const metrics = dashboardMetrics(state, now)
  const hourly = hourlySales(state.invoices, now)
  const dishes = topDishes(state.invoices, 5)
  const drawer = cashDrawerSummary(state, now)
  const campaigns = campaignTotals(state.campaigns)
  const reviews = feedbackSummary(state.feedback)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        description="Live position for Beno — revenue taken, tables in service, what is on the pass, and how marketing is performing."
        actions={
          <>
            <Button as={Link} to="/store/live-orders" variant="secondary" size="sm">
              <BellRing size={13} strokeWidth={1.9} />
              Live orders
            </Button>
            <Button as={Link} to="/store/billing" variant="primary" size="sm">
              <CreditCard size={13} strokeWidth={1.9} />
              Open register
            </Button>
          </>
        }
      />

      {metrics.queue.unacknowledged > 0 ? (
        <InlineNote tone="rose" icon={BellRing}>
          <span className="font-semibold">{metrics.queue.unacknowledged} round(s)</span> waiting to be
          acknowledged on the floor.{' '}
          <Link to="/store/live-orders" className="font-medium underline underline-offset-2">
            Open live orders
          </Link>
        </InlineNote>
      ) : null}

      <KPIGrid
        items={[
          {
            label: "Today's revenue",
            value: money(metrics.revenueToday),
            hint: `${metrics.invoiceCountToday} settled bill(s)`,
            icon: BadgeIndianRupee,
            tone: 'emerald',
            delta: 8.4,
          },
          {
            label: 'Orders today',
            value: metrics.roundCountToday,
            hint: 'guest + counter rounds',
            icon: Utensils,
            tone: 'indigo',
            delta: 4.1,
          },
          {
            label: 'Average ticket',
            value: money(metrics.avgTicket),
            hint: 'per settled bill',
            icon: ReceiptText,
            tone: 'zinc',
            delta: -2.3,
          },
          {
            label: 'Table occupancy',
            value: `${metrics.occupancyPercent}%`,
            hint: `${metrics.occupied} occupied · ${metrics.free} free`,
            icon: Users,
            tone: 'amber',
            delta: 6.2,
          },
        ]}
      />

      <StatusStrip
        items={[
          { label: 'Not acknowledged', value: metrics.queue.unacknowledged, hint: 'needs a human' },
          { label: 'In the kitchen', value: metrics.queue.inKitchen, hint: 'on the pass' },
          { label: 'Ready to serve', value: metrics.queue.ready, hint: 'plated now' },
          { label: 'Billed, unpaid', value: metrics.billed, hint: 'awaiting settlement' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={TrendingUp}
            title="Revenue by hour"
            subtitle="Settled bills only, today."
            actions={
              <Badge tone="zinc" size="sm">
                Peak {compactMoney(Math.max(...hourly.map((entry) => entry.value)))}
              </Badge>
            }
          />
          <CardBody>
            <BarChart data={hourly} height={150} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Activity} title="Cash drawer" subtitle={`Shift ${state.shift?.id || '—'}`} />
          <CardBody className="space-y-3">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Expected in drawer</p>
              <p className="tnum mt-1 text-xl font-semibold text-zinc-900">
                {money(drawer.expectedCash)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Float {money(drawer.openingFloat, 0)} + cash sales {money(drawer.cashSales, 0)}
              </p>
            </div>
            <dl className="space-y-2">
              {[
                { label: 'Cash sales', value: money(drawer.cashSales) },
                { label: 'Cash in', value: money(drawer.cashIn) },
                { label: 'Cash out', value: `−${money(drawer.cashOut)}` },
                { label: 'Cash bills', value: drawer.cashInvoiceCount },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 text-xs">
                  <dt className="text-zinc-500">{row.label}</dt>
                  <dd className="tnum font-medium text-zinc-900">{row.value}</dd>
                </div>
              ))}
            </dl>
            <Button as={Link} to="/store/cash-drawer" variant="secondary" size="sm" block>
              Open shift & drawer
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={Utensils}
            title="Top selling dishes"
            subtitle="Across every settled invoice in the ledger."
          />
          {dishes.length === 0 ? (
            <EmptyState icon={Utensils} title="No settled invoices yet" compact />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Dish</TH>
                    <TH align="right">Qty sold</TH>
                    <TH align="right">Revenue</TH>
                    <TH align="right">Share</TH>
                  </TR>
                </THead>
                <TBody>
                  {dishes.map((dish) => {
                    const share = metrics.revenueTotal ? (dish.revenue / metrics.revenueTotal) * 100 : 0
                    return (
                      <TR key={dish.name}>
                        <TD className="font-medium">{dish.name}</TD>
                        <TD align="right" mono>
                          {dish.qty}
                        </TD>
                        <TD align="right" mono>
                          {money(dish.revenue)}
                        </TD>
                        <TD align="right" mono muted>
                          {share.toFixed(1)}%
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={ReceiptText}
            title="Profit & loss"
            subtitle="Gross settled revenue against the expense ledger."
          />
          <CardBody className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs text-zinc-500">Gross revenue</span>
                <span className="tnum text-sm font-semibold text-zinc-900">
                  {money(metrics.revenueTotal)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs text-zinc-500">Operating expenses</span>
                <span className="tnum text-sm font-semibold text-rose-700">
                  −{money(metrics.expenseTotal)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-zinc-200 pt-2.5">
                <span className="text-xs font-semibold text-zinc-900">Net operating profit</span>
                <span
                  className={classNames(
                    'tnum text-sm font-semibold',
                    metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700',
                  )}
                >
                  {money(metrics.netProfit)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Margin {metrics.marginPercent}% · every category in the ledger
              </p>
            </div>
            <Button as={Link} to="/store/expenses" variant="secondary" size="sm" block>
              Open expense ledger
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={Activity}
            title="Recent activity"
            subtitle="Orders, kitchen bumps, settlements and marketing as they happen."
          />
          <ul className="divide-y divide-zinc-200">
            {state.events.slice(0, 8).map((event) => (
              <li key={event.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-1.5">
                  <Dot tone={EVENT_TONE[event.type] || 'zinc'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-zinc-700">{event.message}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    {event.actor} · {clock(event.at)} · {relativeDay(event.at, now)}
                  </p>
                </div>
                <Badge tone={EVENT_TONE[event.type] || 'zinc'} size="sm">
                  {event.type}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader icon={Users} title="Guest pulse" />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">Revenue today</span>
                <span className="tnum text-sm font-semibold text-zinc-900">
                  {money(metrics.revenueToday)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">Average rating</span>
                <span className="tnum text-sm font-semibold text-zinc-900">
                  {reviews.average ? `${reviews.average.toFixed(1)} ★` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">Reviews collected</span>
                <span className="tnum text-sm font-semibold text-zinc-900">{reviews.count}</span>
              </div>
              <Button as={Link} to="/store/feedback" variant="secondary" size="sm" block>
                Open feedback board
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={ChefHat} title="Marketing reach" subtitle="All broadcast campaigns" />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">Messages sent</span>
                <span className="tnum text-sm font-semibold text-zinc-900">{campaigns.sent}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">Open rate</span>
                <span className="tnum text-sm font-semibold text-zinc-900">
                  {campaigns.openRate}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">Attributed revenue</span>
                <span className="tnum text-sm font-semibold text-emerald-700">
                  {money(campaigns.revenue)}
                </span>
              </div>
              <Button as={Link} to="/store/campaigns" variant="secondary" size="sm" block>
                Open campaign console
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <p className="pb-2 text-[11px] text-zinc-400">
        Shift {state.shift?.id} running for {drawer.isOpen ? duration(drawer.duration) : '—'} · last
        synced {clock(now)}
      </p>
    </div>
  )
}
