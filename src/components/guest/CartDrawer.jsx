import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, DishThumb, Field, Input, InlineNote, Textarea, VegMark } from '../ui'
import { classNames, money } from '../../lib/format'
import { INSTALL_REWARD } from '../../lib/pricing'

function CrossSell({ items, onAdd }) {
  if (!items.length) return null
  return (
    <div className="border-t border-zinc-200 bg-zinc-50/70 px-4 py-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        <Sparkles size={12} strokeWidth={2} className="text-amber-500" />
        Goes well with your order
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-2"
          >
            <DishThumb item={item} size={40} rounded="rounded" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-900">{item.name}</p>
              <p className="tnum text-[11px] text-zinc-500">{money(item.price)}</p>
            </div>
            <Button size="xs" variant="secondary" onClick={() => onAdd(item)}>
              <Plus size={11} strokeWidth={2.4} />
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CartDrawer({
  open,
  onClose,
  tableId,
  lines,
  totals,
  guest,
  onGuestChange,
  onIncrement,
  onDecrement,
  onRemove,
  onAdd,
  crossSell,
  onPlace,
  promo,
  placing,
}) {
  const [errors, setErrors] = useState({})

  if (!open) return null

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)

  function submit() {
    const next = {}
    if (!guest.name.trim()) next.name = 'Please tell the kitchen who to serve'
    const phone = String(guest.phone || '').replace(/\D/g, '')
    if (phone.length < 10) next.phone = 'Enter a 10-digit mobile number'
    setErrors(next)
    if (Object.keys(next).length) return
    onPlace?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="absolute inset-0 bg-zinc-900/25" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your basket"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-x border-zinc-200 bg-white"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600">
              <ShoppingBag size={15} strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Your basket</h2>
              <p className="tnum text-[11px] text-zinc-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} • {tableId}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="hairline-scroll flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className="text-sm font-medium text-zinc-900">Your basket is empty</p>
              <p className="mt-1 text-xs text-zinc-500">
                Add a few dishes and they will be sent straight to the kitchen.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-3 px-4 py-3.5">
                  <DishThumb item={line} size={52} rounded="rounded" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <VegMark isVeg={line.isVeg} size="sm" />
                      <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-zinc-900">
                        {line.name}
                      </p>
                      <button
                        type="button"
                        aria-label={`Remove ${line.name}`}
                        onClick={() => onRemove(line)}
                        className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={13} strokeWidth={1.9} />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="tnum text-xs text-zinc-500">
                        {money(line.price)} × {line.qty} = {money(line.price * line.qty)}
                      </span>
                      <div className="inline-flex h-7 items-center overflow-hidden rounded-md border border-zinc-200 bg-white">
                        <button
                          type="button"
                          aria-label={`One less ${line.name}`}
                          onClick={() => onDecrement(line)}
                          className="flex h-full w-7 items-center justify-center text-zinc-600 hover:bg-zinc-100"
                        >
                          <Minus size={12} strokeWidth={2.4} />
                        </button>
                        <span className="tnum flex h-full min-w-6 items-center justify-center border-x border-zinc-200 px-1 text-xs font-semibold">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`One more ${line.name}`}
                          onClick={() => onIncrement(line)}
                          className="flex h-full w-7 items-center justify-center text-zinc-600 hover:bg-zinc-100"
                        >
                          <Plus size={12} strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <CrossSell items={crossSell} onAdd={onAdd} />

          {promo ? (
            <div className="px-4 pt-4">
              <InlineNote tone="emerald" icon={Sparkles}>
                {promo === INSTALL_REWARD.code ? (
                  <>
                    App reward <span className="tnum font-semibold">{promo}</span> — flat 10% off
                    with no minimum, carried onto this bill automatically.
                  </>
                ) : (
                  <>
                    Voucher <span className="tnum font-semibold">{promo}</span> will be applied —
                    our team will confirm it at your table.
                  </>
                )}
              </InlineNote>
            </div>
          ) : null}

          <div className="border-t border-zinc-200 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Guest details
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              Needed for the kitchen ticket and for your loyalty wallet.
            </p>
            <div className="mt-3 space-y-3">
              <Field label="Name" required error={errors.name}>
                <Input
                  value={guest.name}
                  invalid={Boolean(errors.name)}
                  onChange={(event) => onGuestChange?.({ name: event.target.value })}
                  placeholder="e.g. Vinit"
                  autoComplete="name"
                />
              </Field>
              <Field label="Mobile number" required error={errors.phone} hint="Used to track your order and loyalty points.">
                <Input
                  value={guest.phone}
                  invalid={Boolean(errors.phone)}
                  onChange={(event) => onGuestChange?.({ phone: event.target.value })}
                  placeholder="98765 43210"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Special instructions">
                <Textarea
                  rows={2}
                  value={guest.notes}
                  onChange={(event) => onGuestChange?.({ notes: event.target.value })}
                  placeholder="Anything else the kitchen should know (spice levels, extra plates)"
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-zinc-200 bg-zinc-50/70 px-4 py-4">
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Item total</dt>
                <dd className="tnum font-medium text-zinc-900">{money(totals.subtotal)}</dd>
              </div>
              {totals.discountAmount > 0 ? (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-emerald-700">
                    <Badge tone="emerald" size="sm">
                      {totals.discount.code || 'Offer'}
                    </Badge>
                    {totals.discount.label}
                  </dt>
                  <dd className="tnum font-medium text-emerald-700">
                    −{money(totals.discountAmount)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">CGST 2.5%</dt>
                <dd className="tnum text-zinc-900">{money(totals.cgst)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">SGST 2.5%</dt>
                <dd className="tnum text-zinc-900">{money(totals.sgst)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
                <dt className="text-sm font-semibold text-zinc-900">To pay</dt>
                <dd className="tnum text-sm font-semibold text-zinc-900">{money(totals.total)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-zinc-200 bg-white px-4 py-3">
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!lines.length || placing}
            onClick={submit}
          >
            {placing ? 'Sending…' : `Place order • ${money(totals.total)}`}
          </Button>
          <p className="mt-2 text-center text-[10px] text-zinc-400">
            No payment now — settle at the table when you are done.
          </p>
        </div>
      </div>
    </div>
  )
}

export function BasketBar({ itemCount, total, onOpen, hidden }) {
  if (hidden || itemCount === 0) return null
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <button
        type="button"
        onClick={onOpen}
        className={classNames(
          'flex w-full max-w-[calc(28rem-1.5rem)] items-center justify-between gap-3 rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-3 text-left transition-colors hover:bg-zinc-800',
        )}
      >
        <span className="flex items-center gap-2.5">
          <span className="tnum flex h-6 min-w-6 items-center justify-center rounded-full bg-white/15 px-1.5 text-xs font-semibold text-white">
            {itemCount}
          </span>
          <span className="text-xs font-medium text-white">
            {itemCount === 1 ? 'item in your basket' : 'items in your basket'} — tap to review and
            send
          </span>
        </span>
        <span className="tnum shrink-0 text-sm font-semibold text-white">{money(total)}</span>
      </button>
    </div>
  )
}
