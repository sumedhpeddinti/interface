import { useEffect, useState } from 'react'
import { BellRing, ChefHat, Droplets, Sparkles, Utensils } from 'lucide-react'
import { Badge, Button, Textarea } from '../ui'
import { TableSwitcher } from './TableSwitcher'
import { InstallOffer } from './InstallOffer'
import { classNames } from '../../lib/format'

/* Sticky guest header plus the Call Waiter bottom sheet. The table chip sits
   directly beside the café name, so switching tables reads as changing what
   this menu is pointed at rather than as a debugging control. */

const REQUESTS = [
  { id: 'Water', label: 'Water', icon: Droplets },
  { id: 'Cutlery', label: 'Cutlery', icon: Utensils },
  { id: 'Clean Table', label: 'Clean Table', icon: Sparkles },
  { id: 'Call Staff', label: 'Call Staff', icon: BellRing },
]

export function GuestHeader({
  table,
  tableId,
  tables = [],
  waiterPending,
  onCallWaiter,
  onTableChange,
  rewardActive,
  rewardCode,
  onUnlock,
}) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(null)

  useEffect(() => {
    if (!sent) return undefined
    const timer = window.setTimeout(() => setSent(null), 2600)
    return () => window.clearTimeout(timer)
  }, [sent])

  function fire(request) {
    onCallWaiter?.({ tableId, request, note: note.trim() })
    setSent(request)
    setNote('')
    setOpen(false)
  }

  return (
    <>
      <header data-guest-table-id={tableId} className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-900 text-white">
              <ChefHat size={17} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold leading-tight text-zinc-900">
                  Beno
                </p>
                <TableSwitcher tables={tables} tableId={tableId} onChange={onTableChange} />
              </div>
              <p className="tnum truncate text-[11px] leading-tight text-zinc-500">
                {table?.section || 'Main Floor'} · {table?.seats || 2} seats · Table {tableId}
              </p>
            </div>
          </div>

          <div className="relative shrink-0">
            <Button
              size="sm"
              variant="secondary"
              icon={undefined}
              onClick={() => setOpen(true)}
              className="relative"
            >
              <BellRing size={13} strokeWidth={1.9} />
              Call Waiter
            </Button>
            {waiterPending ? (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
              </span>
            ) : null}
          </div>
        </div>

        {/* Get 10% off · [Download] — full-width strip under the brand row;
            hides itself once the reward is claimed. */}
        <InstallOffer rewardActive={rewardActive} rewardCode={rewardCode} onUnlock={onUnlock} />

        {sent ? (
          <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800">
            Request sent · {sent}. A steward is on the way.
          </div>
        ) : null}
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-zinc-900/25"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Call waiter"
            className="relative z-10 w-full max-w-md rounded-t-xl border border-zinc-200 bg-white p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">How can we help?</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  We will notify the floor team for {tableId}.
                </p>
              </div>
              <Badge tone="zinc" size="sm">
                {tableId}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {REQUESTS.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => fire(request.id)}
                  className={classNames(
                    'flex items-center gap-2.5 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-zinc-800',
                    'transition-colors hover:border-zinc-300 hover:bg-zinc-50',
                  )}
                >
                  <request.icon size={15} strokeWidth={1.8} className="text-zinc-500" />
                  {request.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <Textarea
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Anything specific? (optional)"
              />
            </div>

            <div className="mt-3 flex gap-2">
              <Button variant="secondary" block onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" block onClick={() => fire('Call Staff')}>
                Notify staff
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
