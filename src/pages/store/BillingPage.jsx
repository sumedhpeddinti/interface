import { useEffect, useMemo, useState } from 'react'
import {
  BadgeIndianRupee,
  Ban,
  CreditCard,
  Percent,
  Receipt,
  Scissors,
  Search,
  Tag,
  Timer,
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  InlineNote,
  Modal,
  SearchInput,
  Tabs,
} from '../../components/ui'
import { KPIGrid, PageHeader, DataRow } from '../../components/store/PageParts'
import { CashierRegisterModal } from '../../components/store/CashierKeypad'
import { ThermalInvoice } from '../../components/store/ThermalInvoice'
import { useNow } from '../../lib/ticker'
import { applyCoupon } from '../../lib/pricing'
import { discountLabel, invoiceMethodTotals, tableBill } from '../../lib/selectors'
import { STATUS_META } from '../../lib/orders'
import { classNames, clock, duration, money } from '../../lib/format'

export default function BillingPage() {
  const { state, actions } = useStore()
  const now = useNow()
  const [query, setQuery] = useState('')
  const [registerFor, setRegisterFor] = useState(null)
  const [registerMethod, setRegisterMethod] = useState('Cash')
  const [discountOpen, setDiscountOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [receiptId, setReceiptId] = useState(null)

  const [discountMode, setDiscountMode] = useState('percent')
  const [discountValue, setDiscountValue] = useState('10')
  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState('')

  const bills = useMemo(
    () =>
      state.tables
        .map((table) => ({
          table,
          bill: tableBill(state.orders, table.id, (state.billDiscounts || {})[table.id] || null),
        }))
        .filter((entry) => entry.bill.roundCount > 0),
    [state.tables, state.orders, state.billDiscounts],
  )

  const selectedId = state.ui.billingSelectedTable || bills[0]?.table.id || null
  const selected = bills.find((entry) => entry.table.id === selectedId) || null

  const filtered = bills.filter((entry) => {
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return (
      entry.table.id.toLowerCase().includes(q) ||
      (entry.bill.guestName || '').toLowerCase().includes(q) ||
      (entry.bill.guestPhone || '').includes(q)
    )
  })

  const outstanding = bills.reduce((sum, entry) => sum + entry.bill.total, 0)
  const unpaidRounds = bills.reduce((sum, entry) => sum + entry.bill.roundCount, 0)
  const methods = invoiceMethodTotals(state.invoices)
  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)

  /* The reducer records the newly issued invoice id — open its receipt once. */
  useEffect(() => {
    if (state.lastInvoiceId) setReceiptId(state.lastInvoiceId)
  }, [state.lastInvoiceId])

  useEffect(() => {
    if (!discountOpen || !selected) return
    const existing = (state.billDiscounts || {})[selected.table.id]
    if (existing?.mode === 'percent') {
      setDiscountMode('percent')
      setDiscountValue(String(existing.value))
    } else if (existing?.mode === 'flat') {
      setDiscountMode('flat')
      setDiscountValue(String(existing.value))
    } else {
      setDiscountMode('percent')
      setDiscountValue('10')
    }
    setCouponCode('')
    setCouponError('')
  }, [discountOpen, selected?.table.id])

  const receipt = state.invoices.find((invoice) => invoice.id === receiptId) || null

  function openRegister(tableId, method = 'Cash') {
    setRegisterMethod(method)
    setRegisterFor(tableId)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & register"
        description="Inspect an open bill round by round, apply a discount or coupon, split it across payers, then settle it to issue a GST invoice and free the table."
        badge={
          bills.length ? (
            <Badge tone="amber" size="md" mono>
              {bills.length} open
            </Badge>
          ) : (
            <Badge tone="emerald" size="md" dot>
              All settled
            </Badge>
          )
        }
      />

      <KPIGrid
        columns={4}
        items={[
          {
            label: 'Outstanding',
            value: money(outstanding),
            hint: `${unpaidRounds} unpaid round(s)`,
            icon: BadgeIndianRupee,
            tone: 'amber',
          },
          {
            label: 'Open bills',
            value: bills.length,
            hint: 'tables with a live ticket',
            icon: Receipt,
            tone: 'indigo',
          },
          ...methods.slice(0, 2).map((entry) => ({
            label: `${entry.method} takings`,
            value: money(entry.value),
            hint: `${entry.count} bill(s) today`,
            icon: CreditCard,
            tone: 'emerald',
          })),
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <Card className="xl:sticky xl:top-32 xl:self-start">
          <CardHeader
            size="sm"
            icon={Receipt}
            title="Open bills"
            subtitle="Tables currently carrying a tab."
          />
          <div className="border-b border-zinc-200 px-4 py-3">
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Table, guest or phone"
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No open bills"
              description="Every table is settled. Rounds appear here as soon as a guest orders."
              compact
            />
          ) : (
            <ul className="hairline-scroll max-h-[60vh] divide-y divide-zinc-200 overflow-y-auto">
              {filtered.map((entry) => {
                const active = entry.table.id === selectedId
                return (
                  <li key={entry.table.id}>
                    <button
                      type="button"
                      onClick={() => actions.setUi({ patch: { billingSelectedTable: entry.table.id } })}
                      className={classNames(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        active ? 'bg-zinc-50' : 'hover:bg-zinc-50/80',
                      )}
                    >
                      <span
                        className={classNames(
                          'tnum flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold',
                          entry.bill.allServed
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-amber-300 bg-amber-50 text-amber-700',
                        )}
                      >
                        {entry.table.id}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium text-zinc-900">
                            {entry.bill.guestName || 'Guest'}
                          </span>
                          {entry.bill.hasUnacknowledged ? (
                            <Badge tone="rose" size="sm">
                              New
                            </Badge>
                          ) : null}
                        </span>
                        <span className="tnum mt-0.5 block text-[10px] text-zinc-500">
                          {entry.bill.roundCount} rounds · {entry.bill.itemCount} items ·{' '}
                          {entry.bill.seatedAt ? duration(now - entry.bill.seatedAt) : '—'}
                        </span>
                      </span>
                      <span className="tnum shrink-0 text-xs font-semibold text-zinc-900">
                        {money(entry.bill.total, 0)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader
                icon={CreditCard}
                title={`${selected.table.id} · ${selected.table.section}`}
                subtitle={`${selected.bill.roundCount} round(s) · ${selected.bill.itemCount} items · seated ${selected.bill.seatedAt ? duration(now - selected.bill.seatedAt) : '—'}`}
                actions={
                  <>
                    {selected.bill.allServed ? (
                      <Badge tone="emerald" size="md" dot>
                        Ready to settle
                      </Badge>
                    ) : (
                      <Badge tone="amber" size="md" dot pulse>
                        In service
                      </Badge>
                    )}
                    {(state.parkedBills || {})[selected.table.id] ? (
                      <Badge tone="indigo" size="md">
                        Parked
                      </Badge>
                    ) : null}
                  </>
                }
              />

              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDiscountOpen(true)}>
                    <Percent size={13} strokeWidth={2} />
                    Discount
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCouponCode('')
                      setDiscountOpen(true)
                    }}
                  >
                    <Tag size={13} strokeWidth={1.9} />
                    Apply coupon
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openRegister(selected.table.id, 'Split')}>
                    <Scissors size={13} strokeWidth={1.9} />
                    Split bill
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      actions.parkBill({
                        tableId: selected.table.id,
                        parked: !(state.parkedBills || {})[selected.table.id],
                      })
                    }
                  >
                    <Timer size={13} strokeWidth={1.9} />
                    {(state.parkedBills || {})[selected.table.id] ? 'Unpark bill' : 'Park bill'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setVoidOpen(true)}>
                    <Ban size={13} strokeWidth={1.9} />
                    Void bill
                  </Button>
                </div>

                {selected.bill.discountAmount > 0 ? (
                  <InlineNote tone="emerald" icon={Tag}>
                    {discountLabel(selected.bill.discount)} applied —{' '}
                    <span className="tnum font-semibold">{money(selected.bill.discountAmount)}</span>{' '}
                    off a subtotal of {money(selected.bill.subtotal)}.
                  </InlineNote>
                ) : null}

                {selected.bill.hasUnacknowledged ? (
                  <InlineNote tone="amber">
                    This bill contains a round the floor has not acknowledged yet. You can still
                    settle, but the kitchen may not have started it.
                  </InlineNote>
                ) : null}

                <div className="space-y-3">
                  {selected.bill.rounds.map((round) => (
                    <div key={round.id} className="rounded-md border border-zinc-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50/70 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="tnum text-xs font-semibold text-zinc-900">
                            Round {round.round}
                          </span>
                          <Badge tone={STATUS_META[round.status]?.tone} size="sm" dot>
                            {STATUS_META[round.status]?.label}
                          </Badge>
                          <span className="tnum text-[10px] text-zinc-400">{round.id}</span>
                        </div>
                        <span className="tnum text-[11px] text-zinc-500">
                          {clock(round.createdAt)} · {round.guestName}
                        </span>
                      </div>
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-zinc-200">
                            <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                              Item
                            </th>
                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                              Qty
                            </th>
                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                              Rate
                            </th>
                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {round.items.map((item, index) => (
                            <tr key={`${item.id}-${index}`} className="hover:bg-zinc-50/80">
                              <td className="px-3 py-2.5 text-xs text-zinc-900">
                                {item.name}
                                <span className="ml-1.5 text-[10px] text-zinc-400">
                                  {item.station}
                                </span>
                              </td>
                              <td className="tnum px-3 py-2.5 text-right text-xs text-zinc-700">
                                {item.qty}
                              </td>
                              <td className="tnum px-3 py-2.5 text-right text-xs text-zinc-500">
                                {money(item.price)}
                              </td>
                              <td className="tnum px-3 py-2.5 text-right text-xs font-medium text-zinc-900">
                                {money(item.price * item.qty)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {round.notes ? (
                        <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                          {round.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader size="sm" title="Bill summary" icon={Receipt} />
                <CardBody className="space-y-2.5">
                  <DataRow label={`Item total (${selected.bill.itemCount} items)`} value={money(selected.bill.subtotal)} />
                  {selected.bill.discountAmount > 0 ? (
                    <DataRow
                      label={discountLabel(selected.bill.discount)}
                      value={`−${money(selected.bill.discountAmount)}`}
                      tone="emerald"
                    />
                  ) : null}
                  <DataRow label="Taxable value" value={money(selected.bill.taxable)} />
                  <DataRow label="CGST @ 2.5%" value={money(selected.bill.cgst)} />
                  <DataRow label="SGST @ 2.5%" value={money(selected.bill.sgst)} />
                  <div className="flex items-baseline justify-between gap-4 border-t border-zinc-200 pt-2.5">
                    <span className="text-sm font-semibold text-zinc-900">Total payable</span>
                    <span className="tnum text-base font-semibold text-zinc-900">
                      {money(selected.bill.total)}
                    </span>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader size="sm" title="Take payment" icon={CreditCard} />
                <CardBody className="space-y-3">
                  <p className="text-xs leading-relaxed text-zinc-500">
                    Cash settlement feeds the drawer, and every method is recorded against the shift
                    for reconciliation.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="primary" block onClick={() => openRegister(selected.table.id, 'Cash')}>
                      Settle {money(selected.bill.total)}
                    </Button>
                    <Button variant="secondary" block onClick={() => openRegister(selected.table.id, 'UPI')}>
                      UPI
                    </Button>
                    <Button variant="secondary" block onClick={() => openRegister(selected.table.id, 'Card')}>
                      Card
                    </Button>
                    <Button variant="secondary" block onClick={() => openRegister(selected.table.id, 'Split')}>
                      Split
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {state.staff
                      .filter((member) => member.active)
                      .map((member) => (
                        <Badge key={member.id} tone="zinc" size="sm">
                          {member.role} on duty
                        </Badge>
                      ))}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={Receipt}
              title="No open bills"
              description="When a guest places a round it appears here with the full round-by-round breakdown, ready for settlement."
            />
          </Card>
        )}
      </div>

      <CashierRegisterModal
        open={Boolean(registerFor)}
        onClose={() => setRegisterFor(null)}
        tableId={registerFor || '—'}
        invoiceRef="draft"
        initialMethod={registerMethod}
        guests={state.guests}
        staff={staff}
        bill={
          bills.find((entry) => entry.table.id === registerFor)?.bill || {
            total: 0,
            itemCount: 0,
            roundCount: 0,
            discountAmount: 0,
          }
        }
        onSettle={({ tableId, method, tendered, portions, guestId }) => {
          actions.settleBill({
            tableId,
            method,
            tendered,
            portions,
            guestId,
            cashierName: staff?.name || 'Cashier',
          })
          setRegisterFor(null)
        }}
      />

      <Modal
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        title="Discount & coupons"
        subtitle={selected ? `Applies to ${selected.table.id} only.` : ''}
        icon={Percent}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selected) actions.setBillDiscount({ tableId: selected.table.id, discount: null })
                setDiscountOpen(false)
              }}
            >
              Remove discount
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const value = Number(discountValue) || 0
                actions.setBillDiscount({
                  tableId: selected.table.id,
                  discount: value
                    ? {
                        mode: discountMode,
                        value,
                        source: 'manual',
                        label:
                          discountMode === 'percent'
                            ? `Manual ${value}% off`
                            : `Manual ₹${value} off`,
                      }
                    : null,
                })
                setDiscountOpen(false)
              }}
            >
              Apply discount
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Tabs
            value={discountMode}
            onChange={setDiscountMode}
            full
            tabs={[
              { id: 'percent', label: 'Percentage' },
              { id: 'flat', label: 'Flat amount' },
            ]}
          />
          <Field
            label={discountMode === 'percent' ? 'Discount percent' : 'Discount amount (₹)'}
            hint="The welcome offer is replaced whenever a manual discount is applied."
          >
            <Input
              type="number"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
            />
          </Field>

          <div className="border-t border-zinc-200 pt-4">
            <Field label="Coupon code" hint="WELCOME20 · FLAT50 · FEAST100 · PANEER15">
              <Input
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase())
                  setCouponError('')
                }}
                placeholder="WELCOME20"
              />
            </Field>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={!couponCode || !selected}
              onClick={() => {
                const result = applyCoupon(selected.bill.subtotal, couponCode)
                if (!result.ok) {
                  setCouponError(result.error)
                  return
                }
                actions.setBillDiscount({ tableId: selected.table.id, discount: result.discount })
                setDiscountOpen(false)
              }}
            >
              Validate & apply coupon
            </Button>
            {couponError ? (
              <p className="mt-2 text-xs font-medium text-rose-600">{couponError}</p>
            ) : null}
          </div>

          {selected ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <DataRow label="Subtotal" value={money(selected.bill.subtotal)} />
              <DataRow
                label="Current discount"
                value={money(selected.bill.discountAmount)}
                tone={selected.bill.discountAmount ? 'emerald' : undefined}
              />
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmModal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onConfirm={() => {
          if (!selected) return
          selected.bill.rounds.forEach((round) =>
            actions.voidOrder({
              orderId: round.id,
              actor: staff?.name || 'Manager',
              reason: 'voided from the register',
            }),
          )
        }}
        title="Void this bill?"
        description="Every open round on this table is cancelled and removed from the kitchen queue. The rounds stay in the audit trail as voided."
        confirmLabel="Void bill"
        tone="danger"
      />

      <ThermalInvoice
        open={Boolean(receipt)}
        onClose={() => setReceiptId(null)}
        invoice={receipt}
        restaurant={state.restaurant}
      />

      <p className="pb-2 text-[11px] text-zinc-400">
        Register synced {clock(now)} · shift {state.shift?.id} ·{' '}
        {state.shift?.isOpen ? 'drawer open' : 'drawer closed'} · {state.invoices.length} invoice(s)
        issued in the ledger
      </p>
    </div>
  )
}
