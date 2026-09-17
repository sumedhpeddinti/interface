import { useMemo, useState } from 'react'
import { BadgeIndianRupee, Printer, ReceiptText, Search, TrendingUp } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SearchInput,
  Table,
  TableWrap,
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui'
import { KPIGrid, PageHeader } from '../../components/store/PageParts'
import { ThermalInvoice } from '../../components/store/ThermalInvoice'
import { invoiceMethodTotals } from '../../lib/selectors'
import { classNames, dateTimeLabel, money, pct, relativeDay } from '../../lib/format'
import { useNow } from '../../lib/ticker'

export default function InvoicesPage() {
  const { state } = useStore()
  const now = useNow()
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('All')
  const [receiptId, setReceiptId] = useState(null)

  const invoices = state.invoices
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices
      .filter((invoice) => (method === 'All' ? true : invoice.method === method))
      .filter((invoice) => {
        if (!q) return true
        return (
          invoice.id.toLowerCase().includes(q) ||
          invoice.tableId.toLowerCase().includes(q) ||
          (invoice.guestName || '').toLowerCase().includes(q) ||
          (invoice.guestPhone || '').includes(q)
        )
      })
      .sort((a, b) => b.settledAt - a.settledAt)
  }, [invoices, method, query])

  const gross = invoices.reduce((sum, invoice) => sum + invoice.totals.total, 0)
  const tax = invoices.reduce((sum, invoice) => sum + invoice.totals.tax, 0)
  const discounts = invoices.reduce((sum, invoice) => sum + invoice.totals.discountAmount, 0)
  const avg = invoices.length ? gross / invoices.length : 0
  const methods = invoiceMethodTotals(invoices)

  const receipt = invoices.find((invoice) => invoice.id === receiptId) || null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="Every GST invoice issued from the register. Reprint a thermal copy at any time."
        badge={
          <Badge tone="zinc" size="md" mono>
            {invoices.length} issued
          </Badge>
        }
      />

      <KPIGrid
        columns={4}
        items={[
          {
            label: 'Gross revenue',
            value: money(gross),
            hint: `${invoices.length} invoice(s)`,
            icon: BadgeIndianRupee,
            tone: 'emerald',
          },
          {
            label: 'GST collected',
            value: money(tax),
            hint: 'CGST + SGST at 5%',
            icon: TrendingUp,
            tone: 'indigo',
          },
          {
            label: 'Discounts given',
            value: money(discounts),
            hint: `${pct(discounts, gross + discounts, 1)}% of gross value`,
            icon: ReceiptText,
            tone: 'amber',
          },
          {
            label: 'Average invoice',
            value: money(avg),
            hint: 'per settled bill',
            icon: ReceiptText,
            tone: 'zinc',
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={method}
          onChange={setMethod}
          tabs={[
            { id: 'All', label: 'All methods', count: invoices.length },
            ...methods.map((entry) => ({
              id: entry.method,
              label: entry.method,
              count: entry.count,
            })),
          ]}
        />
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Invoice, table, guest or phone"
          className="w-full sm:w-72"
        />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No invoices matched"
            description="Settle a bill from the register and the GST invoice will be filed here."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Invoice</TH>
                  <TH>Table</TH>
                  <TH>Guest</TH>
                  <TH>Method</TH>
                  <TH align="right">Items</TH>
                  <TH align="right">Subtotal</TH>
                  <TH align="right">Discount</TH>
                  <TH align="right">GST</TH>
                  <TH align="right">Total</TH>
                  <TH>Settled</TH>
                  <TH align="right" />
                </TR>
              </THead>
              <TBody>
                {filtered.map((invoice) => (
                  <TR key={invoice.id}>
                    <TD mono className="font-medium">
                      {invoice.id}
                    </TD>
                    <TD mono>{invoice.tableId}</TD>
                    <TD>
                      <span className="block text-xs font-medium text-zinc-900">
                        {invoice.guestName || 'Walk-in'}
                      </span>
                      {invoice.guestPhone ? (
                        <span className="tnum block text-[10px] text-zinc-400">
                          {invoice.guestPhone}
                        </span>
                      ) : null}
                    </TD>
                    <TD>
                      <Badge
                        tone={
                          invoice.method === 'Cash'
                            ? 'emerald'
                            : invoice.method === 'UPI'
                              ? 'indigo'
                              : 'zinc'
                        }
                        size="sm"
                      >
                        {invoice.method}
                      </Badge>
                    </TD>
                    <TD align="right" mono muted>
                      {invoice.totals.itemCount}
                    </TD>
                    <TD align="right" mono muted>
                      {money(invoice.totals.subtotal)}
                    </TD>
                    <TD align="right" mono>
                      {invoice.totals.discountAmount > 0 ? (
                        <span className="text-emerald-700">
                          −{money(invoice.totals.discountAmount)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TD>
                    <TD align="right" mono muted>
                      {money(invoice.totals.tax)}
                    </TD>
                    <TD align="right" mono className="font-semibold">
                      {money(invoice.totals.total)}
                    </TD>
                    <TD>
                      <span className="tnum block text-xs text-zinc-700">
                        {dateTimeLabel(invoice.settledAt)}
                      </span>
                      <span className="block text-[10px] text-zinc-400">
                        {relativeDay(invoice.settledAt, now)} · {invoice.cashierName}
                      </span>
                    </TD>
                    <TD align="right">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setReceiptId(invoice.id)}
                      >
                        <Printer size={11} strokeWidth={2} />
                        Reprint
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {methods.map((entry) => (
          <Card key={entry.method} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {entry.method}
            </p>
            <p className="tnum mt-1 text-lg font-semibold text-zinc-900">{money(entry.value)}</p>
            <p className={classNames('mt-0.5 text-[11px] text-zinc-500')}>
              {entry.count} invoice(s) · {pct(entry.value, gross, 1)}% of takings
            </p>
          </Card>
        ))}
      </div>

      <ThermalInvoice
        open={Boolean(receipt)}
        onClose={() => setReceiptId(null)}
        invoice={receipt}
        restaurant={state.restaurant}
      />
    </div>
  )
}
