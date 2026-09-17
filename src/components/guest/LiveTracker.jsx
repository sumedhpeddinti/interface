import { Check, ChefHat, Clock, Plus, Receipt } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, VegMark } from '../ui'
import { useNow } from '../../lib/ticker'
import { classNames, clock, duration, money } from '../../lib/format'
import { GUEST_STAGES, STATUS_META, ROUND_STATUS } from '../../lib/orders'

const STAGE_LABELS = {
  sent: 'Sent',
  accepted: 'Accepted',
  cooking: 'Cooking',
  ready: 'Ready',
  served: 'Served',
}

const STAGE_STAMP = {
  sent: (round) => round.createdAt,
  accepted: (round) => round.acknowledgedAt,
  cooking: (round) => round.cookingAt,
  ready: (round) => round.readyAt,
  served: (round) => round.servedAt,
}

function Stepper({ round }) {
  const now = useNow()
  const currentIndex = GUEST_STAGES.indexOf(round.status)
  const activeIndex = currentIndex === -1 ? GUEST_STAGES.length - 1 : currentIndex

  return (
    <div className="px-1">
      <div className="flex items-start">
        {GUEST_STAGES.map((stage, index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          const stamp = STAGE_STAMP[stage]?.(round)
          return (
            <div key={stage} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={classNames(
                    'h-px flex-1',
                    index === 0 ? 'bg-transparent' : done || active ? 'bg-zinc-900' : 'bg-zinc-200',
                  )}
                />
                <span
                  className={classNames(
                    'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
                    done
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : active
                        ? 'border-zinc-900 bg-white text-zinc-900'
                        : 'border-zinc-200 bg-white text-zinc-300',
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : <span className="tnum">{index + 1}</span>}
                  {active ? (
                    <span className="absolute -inset-1 animate-pulse rounded-full border border-zinc-900/25" />
                  ) : null}
                </span>
                <span
                  className={classNames(
                    'h-px flex-1',
                    index === GUEST_STAGES.length - 1
                      ? 'bg-transparent'
                      : done
                        ? 'bg-zinc-900'
                        : 'bg-zinc-200',
                  )}
                />
              </div>
              <p
                className={classNames(
                  'mt-1.5 text-center text-[10px] font-medium leading-tight',
                  active ? 'text-zinc-900' : done ? 'text-zinc-600' : 'text-zinc-400',
                )}
              >
                {STAGE_LABELS[stage]}
              </p>
              <p className="tnum mt-0.5 text-center text-[9px] leading-tight text-zinc-400">
                {stamp ? clock(stamp) : active ? 'now' : '—'}
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-zinc-500">
        {round.status === ROUND_STATUS.SENT
          ? `Waiting for the floor team · ${duration(now - round.createdAt)}`
          : STATUS_META[round.status]?.hint}
      </p>
    </div>
  )
}

function RoundRow({ round }) {
  const meta = STATUS_META[round.status] || STATUS_META.sent
  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="tnum text-xs font-semibold text-zinc-900">Round {round.round}</span>
          <span className="tnum text-[11px] text-zinc-400">{clock(round.createdAt)}</span>
        </div>
        <Badge tone={meta.tone} size="sm" dot pulse={round.status !== ROUND_STATUS.SERVED}>
          {meta.label}
        </Badge>
      </div>
      <ul className="mt-2 space-y-1.5">
        {round.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <VegMark isVeg={item.isVeg} size="sm" />
            <span className="tnum text-[11px] font-semibold text-zinc-500">{item.qty}×</span>
            <span className="min-w-0 flex-1 text-xs text-zinc-700">{item.name}</span>
            <span className="tnum text-xs text-zinc-500">{money(item.price * item.qty)}</span>
          </li>
        ))}
      </ul>
      {round.notes ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
          <span className="font-medium">Kitchen note:</span> {round.notes}
        </p>
      ) : null}
    </li>
  )
}

export function LiveTracker({ tableId, rounds, bill, onAddMore, waiterPending }) {
  const latest = rounds[rounds.length - 1]
  const totalBill = bill?.total || 0
  const itemCount = rounds.reduce(
    (sum, round) => sum + round.items.reduce((lineSum, item) => lineSum + item.qty, 0),
    0,
  )

  return (
    <div className="space-y-4 px-4 py-4">
      <Card className="border-zinc-900/10">
        <CardBody className="p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
              <Check size={15} strokeWidth={2.6} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">
                Round {latest?.round} added to your table&apos;s bill
              </p>
              <p className="text-[11px] text-zinc-500">
                The kitchen has been notified. Nothing to pay right now.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 divide-x divide-zinc-200 rounded-md border border-zinc-200">
            <div className="px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Rounds</p>
              <p className="tnum text-sm font-semibold text-zinc-900">{rounds.length}</p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Items</p>
              <p className="tnum text-sm font-semibold text-zinc-900">{itemCount}</p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Table bill</p>
              <p className="tnum text-sm font-semibold text-zinc-900">{money(totalBill)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {latest ? (
        <Card>
          <CardHeader
            size="sm"
            icon={ChefHat}
            title={`Round ${latest.round} progress`}
            subtitle={`Table ${tableId} · ${clock(latest.createdAt)}`}
            actions={
              <Badge tone={STATUS_META[latest.status]?.tone} size="sm" dot pulse>
                {STATUS_META[latest.status]?.label}
              </Badge>
            }
          />
          <CardBody className="py-5">
            <Stepper round={latest} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          size="sm"
          icon={Receipt}
          title="Your rounds"
          subtitle="Everything ordered on this table, round by round."
        />
        <ul className="divide-y divide-zinc-200">
          {[...rounds].reverse().map((round) => (
            <RoundRow key={round.id} round={round} />
          ))}
        </ul>
      </Card>

      <div className="space-y-2 pb-24">
        <Button variant="secondary" size="lg" block onClick={onAddMore}>
          <Plus size={15} strokeWidth={2.4} />
          Add more to this bill
        </Button>
        {waiterPending ? (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-rose-600">
            <Clock size={12} strokeWidth={2} />
            A steward has been requested and is on the way.
          </p>
        ) : null}
      </div>
    </div>
  )
}
