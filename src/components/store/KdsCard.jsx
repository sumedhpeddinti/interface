import { AlertTriangle, Check, CheckCheck, Flame, Play, Timer } from 'lucide-react'
import { Badge, Button, Card } from '../ui'
import { useNow } from '../../lib/ticker'
import { classNames, clock, duration, money } from '../../lib/format'
import { LATE_THRESHOLD_MIN, ROUND_STATUS } from '../../lib/orders'

export function KdsCard({ ticket, now, onToggleItem, onBump, onStart, onServe }) {
  const items = ticket.stationItems || ticket.items
  const ready = new Set(ticket.readyItemIds || [])
  const elapsed = now - ticket.createdAt
  const minutesOnPass = elapsed / 60000
  const late = minutesOnPass > LATE_THRESHOLD_MIN
  const allReady = items.every((item) => ready.has(item.id))
  const readyCount = items.filter((item) => ready.has(item.id)).length
  const waiting = ticket.status === ROUND_STATUS.ACCEPTED

  return (
    <Card
      className={classNames(
        'flex flex-col overflow-hidden',
        late ? 'border-rose-300' : allReady && 'border-emerald-300',
      )}
    >
      <div
        className={classNames(
          'flex items-center justify-between gap-3 border-b px-4 py-3',
          late ? 'border-rose-200 bg-rose-50' : 'border-zinc-200 bg-zinc-50/70',
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={classNames(
              'tnum flex h-10 w-10 items-center justify-center rounded-md border text-sm font-semibold',
              late ? 'border-rose-300 bg-white text-rose-700' : 'border-zinc-200 bg-white text-zinc-900',
            )}
          >
            {ticket.tableId}
          </span>
          <div>
            <p className="tnum text-sm font-semibold text-zinc-900">Round {ticket.round}</p>
            <p className="tnum text-[11px] text-zinc-500">
              {ticket.id} · fired {clock(ticket.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {late ? (
            <Badge tone="rose" size="md" icon={AlertTriangle}>
              {Math.floor(minutesOnPass)}m+ late
            </Badge>
          ) : (
            <Badge tone={allReady ? 'emerald' : 'amber'} size="md" dot pulse={!allReady}>
              {allReady ? 'All items up' : `${readyCount}/${items.length} plated`}
            </Badge>
          )}
          <span className="tnum flex items-center gap-1 text-[11px] text-zinc-500">
            <Timer size={10} strokeWidth={2.2} />
            {duration(elapsed)}
          </span>
        </div>
      </div>

      <ul className="flex-1 divide-y divide-zinc-200">
        {items.map((item) => {
          const done = ready.has(item.id)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onToggleItem?.(ticket, item)}
                className={classNames(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  done ? 'bg-emerald-50/60' : 'hover:bg-zinc-50',
                )}
              >
                <span
                  className={classNames(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                    done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 bg-white',
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : null}
                </span>
                <span className="tnum w-7 shrink-0 text-sm font-semibold text-zinc-900">
                  {item.qty}×
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={classNames(
                      'block text-sm font-medium',
                      done ? 'text-zinc-400 line-through' : 'text-zinc-900',
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
                    <Flame size={9} strokeWidth={2} />
                    {item.station}
                    {item.note ? (
                      <span className="normal-case italic tracking-normal text-amber-700">
                        “{item.note}”
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="tnum shrink-0 text-xs text-zinc-400">
                  {money(item.price * item.qty)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {ticket.notes ? (
        <p className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] leading-relaxed text-amber-800">
          <span className="font-semibold">Note:</span> {ticket.notes}
        </p>
      ) : null}

      <div className="flex items-center gap-2 border-t border-zinc-200 bg-zinc-50/60 px-4 py-3">
        {waiting ? (
          <Button variant="secondary" size="sm" onClick={() => onStart?.(ticket)}>
            <Play size={13} strokeWidth={2.2} />
            Start
          </Button>
        ) : null}
        <Button variant="success" size="sm" block onClick={() => onBump?.(ticket)}>
          <CheckCheck size={14} strokeWidth={2.4} />
          Bump ticket
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onServe?.(ticket)}>
          Served
        </Button>
      </div>
    </Card>
  )
}
