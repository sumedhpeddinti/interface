import { BellRing, Check, ChefHat, Clock, Phone, Receipt, XCircle } from 'lucide-react'
import { Badge, Button, Card } from '../ui'
import { useNow } from '../../lib/ticker'
import { classNames, clock, duration, money } from '../../lib/format'
import { ROUND_STATUS, STATUS_META } from '../../lib/orders'

/** Groups a station name onto its items so the pass can read at a glance. */
function groupByStation(items) {
  return items.reduce((groups, item) => {
    const key = item.station || 'Hot Kitchen'
    groups[key] = groups[key] || []
    groups[key].push(item)
    return groups
  }, {})
}

export function OrderCard({ order, onAcknowledge, onMarkReady, onServe, onOpenBilling, onVoid }) {
  const now = useNow()
  const meta = STATUS_META[order.status] || STATUS_META.sent
  const isNew = order.status === ROUND_STATUS.SENT
  const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0)
  const stations = groupByStation(order.items)
  const waited = now - order.createdAt

  return (
    <Card
      className={classNames(
        'overflow-hidden',
        isNew ? 'border-rose-300' : order.status === ROUND_STATUS.READY && 'border-emerald-300',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={classNames(
              'tnum flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold',
              isNew
                ? 'animate-pulse border-rose-300 bg-rose-50 text-rose-700'
                : 'border-zinc-200 bg-white text-zinc-900',
            )}
          >
            {order.tableId}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="tnum text-sm font-semibold text-zinc-900">
                Round {order.round}
              </span>
              <Badge tone={meta.tone} size="sm" dot pulse={order.status !== ROUND_STATUS.SERVED}>
                {meta.label}
              </Badge>
              {isNew ? (
                <Badge tone="rose" size="sm">
                  New
                </Badge>
              ) : null}
            </div>
            <p className="tnum mt-0.5 text-[11px] text-zinc-500">
              {order.id} · placed {clock(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={classNames(
              'tnum flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium',
              isNew
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-zinc-200 bg-white text-zinc-600',
            )}
          >
            <Clock size={11} strokeWidth={2.2} />
            waiting {duration(waited)}
          </span>
          <span className="tnum text-sm font-semibold text-zinc-900">{money(total)}</span>
        </div>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
          <span className="font-medium text-zinc-700">{order.guestName || 'Guest'}</span>
          {order.guestPhone ? (
            <span className="tnum flex items-center gap-1">
              <Phone size={10} strokeWidth={2} />
              {order.guestPhone}
            </span>
          ) : null}
          <span className="tnum">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          {order.enteredBy ? <span>entered by {order.enteredBy}</span> : null}
        </div>

        <div className="mt-3 space-y-3">
          {Object.entries(stations).map(([station, items]) => (
            <div key={station}>
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <ChefHat size={10} strokeWidth={2} />
                {station}
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span className="tnum w-7 shrink-0 text-xs font-semibold text-zinc-900">
                      {item.qty}×
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-zinc-700">
                      {item.name}
                      {item.note ? (
                        <span className="ml-1 text-[11px] italic text-amber-700">“{item.note}”</span>
                      ) : null}
                    </span>
                    <span className="tnum shrink-0 text-xs text-zinc-500">
                      {money(item.price * item.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {order.notes ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
            <span className="font-semibold">Kitchen note:</span> {order.notes}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 bg-zinc-50/60 px-4 py-3">
        {isNew ? (
          <Button variant="primary" size="sm" onClick={() => onAcknowledge?.(order)}>
            <BellRing size={13} strokeWidth={2} />
            Acknowledge
          </Button>
        ) : null}

        {order.status === ROUND_STATUS.COOKING || order.status === ROUND_STATUS.ACCEPTED ? (
          <Button variant="success" size="sm" onClick={() => onMarkReady?.(order)}>
            <Check size={13} strokeWidth={2.6} />
            Mark ready
          </Button>
        ) : null}

        {order.status === ROUND_STATUS.READY ? (
          <Button variant="primary" size="sm" onClick={() => onServe?.(order)}>
            <Check size={13} strokeWidth={2.6} />
            Mark served
          </Button>
        ) : null}

        {order.status === ROUND_STATUS.SERVED ? (
          <Button variant="secondary" size="sm" onClick={() => onOpenBilling?.(order)}>
            <Receipt size={13} strokeWidth={1.9} />
            Settle
          </Button>
        ) : null}

        <Button variant="secondary" size="sm" onClick={() => onOpenBilling?.(order)}>
          <Receipt size={13} strokeWidth={1.9} />
          Open in billing
        </Button>

        <Button variant="ghost" size="sm" onClick={() => onVoid?.(order)} className="ml-auto">
          <XCircle size={13} strokeWidth={1.9} />
          Void
        </Button>
      </div>
    </Card>
  )
}
