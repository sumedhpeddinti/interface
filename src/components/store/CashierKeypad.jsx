import { useEffect, useMemo, useState } from 'react'
import { Banknote, CreditCard, Delete, Info, Smartphone, Split, Users } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Switch, Tabs } from '../ui'
import { classNames, money, round2 } from '../../lib/format'

/* Cashier register: tender method, quick cash chips, touch keypad and live
   change calculation. Split supports equal-by-seat and custom portions. */

const QUICK_CASH = [
  { label: 'Exact', value: null },
  { label: '₹100', value: 100 },
  { label: '₹200', value: 200 },
  { label: '₹500', value: 500 },
  { label: '₹1,000', value: 1000 },
  { label: '₹2,000', value: 2000 },
]

const METHODS = [
  { id: 'Cash', label: 'Cash', icon: Banknote },
  { id: 'Card', label: 'Card', icon: CreditCard },
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'Split', label: 'Split', icon: Split },
]

function Keypad({ value, onChange }) {
  const push = (key) => {
    if (key === 'back') return onChange(value.slice(0, -1))
    if (key === 'clear') return onChange('')
    if (key === '.' && value.includes('.')) return
    if (key === '.' && !value) return onChange('0.')
    const next = `${value}${key}`
    const [, decimals] = next.split('.')
    if (decimals && decimals.length > 2) return
    return onChange(next)
  }

  useEffect(() => {
    const onKey = (event) => {
      if (/^[0-9]$/.test(event.key)) push(event.key)
      else if (event.key === '.') push('.')
      else if (event.key === 'Backspace') push('back')
      else if (event.key === 'Escape') push('clear')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => push(key)}
          className="tnum flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        aria-label="Backspace"
        onClick={() => push('back')}
        className="flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50"
      >
        <Delete size={17} strokeWidth={1.8} />
      </button>
    </div>
  )
}

export function CashierRegisterModal({
  open,
  onClose,
  tableId,
  invoiceRef,
  bill,
  guests,
  staff,
  initialMethod = 'Cash',
  onSettle,
}) {
  const [method, setMethod] = useState('Cash')
  const [tendered, setTendered] = useState('')
  const [loyalty, setLoyalty] = useState(true)
  const [guestId, setGuestId] = useState('')
  const [splitMode, setSplitMode] = useState('seats')
  const [seatCount, setSeatCount] = useState(2)
  const [portions, setPortions] = useState([])
  const [tip, setTip] = useState('')

  const total = round2(bill?.total || 0)

  useEffect(() => {
    if (!open) return
    setMethod(initialMethod || 'Cash')
    setTendered('')
    setTip('')
    setSplitMode('seats')
    setSeatCount(2)
    setPortions([])
    setLoyalty(true)
    const match = (guests || []).find(
      (guest) =>
        bill?.guestPhone &&
        String(guest.phone).replace(/\D/g, '') === String(bill.guestPhone).replace(/\D/g, ''),
    )
    setGuestId(match?.id || '')
  }, [open, bill?.guestPhone, guests, initialMethod])

  /* Equal split with the rounding remainder pushed onto the last portion. */
  const seatPortions = useMemo(() => {
    const count = Math.max(2, Math.min(12, Number(seatCount) || 2))
    const base = Math.floor((total / count) * 100) / 100
    const list = Array.from({ length: count }, (_, index) => ({
      id: `seat-${index + 1}`,
      label: `Seat ${index + 1}`,
      amount: base,
    }))
    const assigned = round2(base * count)
    const remainder = round2(total - assigned)
    if (list.length) list[list.length - 1].amount = round2(list[list.length - 1].amount + remainder)
    return list
  }, [seatCount, total])

  const activePortions =
    method !== 'Split' ? [] : splitMode === 'seats' ? seatPortions : portions

  const covered = round2(activePortions.reduce((sum, portion) => sum + Number(portion.amount || 0), 0))
  const tenderedValue = round2(Number(tendered) || 0)
  const payable = round2(total + (Number(tip) || 0))
  const change = round2(tenderedValue - payable)
  const cashReady = method !== 'Cash' || tenderedValue >= payable
  const splitReady = method !== 'Split' || covered >= payable
  const canTake = (method === 'Cash' ? cashReady : true) && splitReady

  function setPortionMethod(id, nextMethod) {
    setPortions((current) => current.map((p) => (p.id === id ? { ...p, method: nextMethod } : p)))
  }

  function submit() {
    const settledTendered =
      method === 'Cash' ? tenderedValue : method === 'Split' ? covered : payable
    onSettle?.({
      tableId,
      method,
      tendered: settledTendered,
      portions:
        method === 'Split'
          ? activePortions.map((portion) => ({ ...portion, method: portion.method || 'Cash' }))
          : null,
      tip: Number(tip) || 0,
      guestId: loyalty ? guestId : null,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Bill ${invoiceRef} on ${tableId}`}
      subtitle="A GST invoice is issued, the table is freed and the guest sees their settled receipt."
      icon={CreditCard}
      size="md"
      footer={
        <>
          <div className="mr-auto">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">Amount due</p>
            <p className="tnum text-base font-semibold text-zinc-900">{money(payable)}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={!canTake} onClick={submit}>
            Take payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-zinc-700">
              Settling {bill.roundCount} round(s) · {bill.itemCount} items
            </span>
            <span className="tnum text-sm font-semibold text-zinc-900">{money(total)}</span>
          </div>
          {bill.discountAmount > 0 ? (
            <p className="tnum mt-1 text-[11px] text-emerald-700">
              {bill.discount?.code || 'Offer'} applied · −{money(bill.discountAmount)} saved
            </p>
          ) : null}
        </div>

        <Tabs
          value={method}
          onChange={setMethod}
          full
          tabs={METHODS.map((entry) => ({ id: entry.id, label: entry.label, icon: entry.icon }))}
        />

        {method === 'Cash' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5">
              {QUICK_CASH.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setTendered(String(chip.value === null ? payable : chip.value))}
                  className="tnum h-8 rounded-md border border-zinc-200 bg-white text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:bg-zinc-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-md border border-zinc-900 bg-zinc-900 px-3 py-2.5">
              <span className="text-xs text-white/70">Cash received</span>
              <span className="tnum text-lg font-semibold text-white">
                {tendered ? money(tenderedValue) : '₹0.00'}
              </span>
            </div>

            <Keypad value={tendered} onChange={setTendered} />

            <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2.5">
              <span className="text-xs font-medium text-zinc-700">
                {change >= 0 ? 'Change to return' : 'Still short by'}
              </span>
              <span
                className={classNames(
                  'tnum text-base font-semibold',
                  change >= 0 ? 'text-emerald-700' : 'text-rose-700',
                )}
              >
                {money(Math.abs(change))}
              </span>
            </div>
          </div>
        ) : null}

        {method === 'Split' ? (
          <div className="space-y-3">
            <Tabs
              value={splitMode}
              onChange={setSplitMode}
              size="sm"
              tabs={[
                { id: 'seats', label: 'By seats', icon: Users },
                { id: 'custom', label: 'Custom amounts' },
              ]}
            />

            {splitMode === 'seats' ? (
              <>
                <Field label="Number of seats">
                  <Input
                    type="number"
                    min={2}
                    max={12}
                    value={seatCount}
                    onChange={(event) => setSeatCount(event.target.value)}
                  />
                </Field>
                <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
                  {seatPortions.map((portion) => (
                    <li
                      key={portion.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="text-xs font-medium text-zinc-700">{portion.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="tnum text-xs font-semibold text-zinc-900">
                          {money(portion.amount)}
                        </span>
                        <Select
                          value={portion.method || 'Cash'}
                          onChange={(event) =>
                            setPortions((current) => {
                              const exists = current.some((p) => p.id === portion.id)
                              const merged = exists
                                ? current.map((p) =>
                                    p.id === portion.id ? { ...p, method: event.target.value } : p,
                                  )
                                : [...current, { ...portion, method: event.target.value }]
                              return merged
                            })
                          }
                          className="h-7 w-24 text-xs"
                        >
                          {METHODS.filter((entry) => entry.id !== 'Split').map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.label}
                            </option>
                          ))}
                        </Select>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="space-y-2">
                {portions.length === 0 ? (
                  <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] text-zinc-500">
                    Add a portion for each payer. Amounts must cover the bill.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {portions.map((portion) => (
                      <li key={portion.id} className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={portion.amount}
                          onChange={(event) =>
                            setPortions((current) =>
                              current.map((p) =>
                                p.id === portion.id ? { ...p, amount: event.target.value } : p,
                              ),
                            )
                          }
                          className="tnum h-8 flex-1"
                        />
                        <Select
                          value={portion.method}
                          onChange={(event) => setPortionMethod(portion.id, event.target.value)}
                          className="h-8 w-24 text-xs"
                        >
                          {METHODS.filter((entry) => entry.id !== 'Split').map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.label}
                            </option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setPortions((current) => current.filter((p) => p.id !== portion.id))
                          }
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setPortions((current) => [
                      ...current,
                      {
                        id: `p-${Date.now()}`,
                        label: `Payer ${current.length + 1}`,
                        amount: round2(Math.max(0, total - covered)),
                        method: 'Cash',
                      },
                    ])
                  }
                >
                  Add portion
                </Button>
              </div>
            )}

            <div
              className={classNames(
                'flex items-center justify-between rounded-md border px-3 py-2.5',
                covered >= payable ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
              )}
            >
              <span className="text-xs font-medium text-zinc-700">
                {covered >= payable ? 'Fully covered' : 'Remaining to allocate'}
              </span>
              <span
                className={classNames(
                  'tnum text-sm font-semibold',
                  covered >= payable ? 'text-emerald-700' : 'text-amber-700',
                )}
              >
                {money(Math.abs(round2(payable - covered)))}
              </span>
            </div>
          </div>
        ) : null}

        {method === 'Card' || method === 'UPI' ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
              <Info size={13} strokeWidth={1.9} />
              {method === 'Card'
                ? 'Collect on the card terminal, then confirm.'
                : 'Confirm once the UPI transfer lands.'}
            </p>
            <p className="tnum mt-2 text-lg font-semibold text-zinc-900">{money(payable)}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tip (optional)" hint="Goes to the floor pool">
            <Input
              type="number"
              value={tip}
              onChange={(event) => setTip(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Loyalty" hint="Credit this visit to a guest">
            <Select
              value={guestId}
              disabled={!loyalty}
              onChange={(event) => setGuestId(event.target.value)}
            >
              <option value="">Guest from phone</option>
              {(guests || []).map((guest) => (
                <option key={guest.id} value={guest.id}>
                  {guest.name} · {guest.phone}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Switch
          checked={loyalty}
          onChange={setLoyalty}
          label="Assign loyalty to a guest"
          hint="Adds the visit and spend to their CRM record on settlement."
        />

        <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-200 pt-3">
          <Badge tone="zinc" size="sm">
            GST 5% · CGST 2.5 + SGST 2.5
          </Badge>
          <Badge tone="zinc" size="sm">
            {bill.itemCount} items
          </Badge>
          <Badge tone="zinc" size="sm">
            {bill.roundCount} rounds
          </Badge>
        </div>
      </div>
    </Modal>
  )
}
