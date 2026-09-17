import { useMemo, useState } from 'react'
import { BadgeIndianRupee, PiggyBank, Plus, Receipt, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  IconButton,
  Input,
  ProgressBar,
  Select,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from '../../components/ui'
import { DataRow, KPIGrid, PageHeader, StatusStrip } from '../../components/store/PageParts'
import { EXPENSE_CATEGORIES } from '../../lib/orders'
import { dashboardMetrics } from '../../lib/selectors'
import { classNames, dateLabel, money, pct, relativeDay } from '../../lib/format'
import { useNow } from '../../lib/ticker'

export default function ExpensesPage() {
  const { state, actions } = useStore()
  const now = useNow()
  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)

  const [category, setCategory] = useState('Supplies / Ingredients')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const metrics = dashboardMetrics(state, now)
  const expenses = state.expenses

  const byCategory = useMemo(() => {
    const tally = new Map()
    for (const expense of expenses) {
      const entry = tally.get(expense.category) || { category: expense.category, total: 0, count: 0 }
      entry.total += expense.amount
      entry.count += 1
      tally.set(expense.category, entry)
    }
    return [...tally.values()].sort((a, b) => b.total - a.total)
  }, [expenses])

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => (b.at || 0) - (a.at || 0)),
    [expenses],
  )

  const canLog = Number(amount) > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expenses & P&L"
        description="Log operating costs against settled revenue to see the real margin. Rent, supplies, payroll and utilities all feed the same ledger."
        badge={
          <Badge tone={metrics.netProfit >= 0 ? 'emerald' : 'rose'} size="md">
            {metrics.netProfit >= 0 ? 'In profit' : 'At a loss'}
          </Badge>
        }
      />

      <KPIGrid
        columns={4}
        items={[
          {
            label: 'Gross revenue',
            value: money(metrics.revenueTotal),
            hint: `${state.invoices.length} settled invoice(s)`,
            icon: BadgeIndianRupee,
            tone: 'emerald',
          },
          {
            label: 'Operating expenses',
            value: money(metrics.expenseTotal),
            hint: `${expenses.length} entries logged`,
            icon: TrendingDown,
            tone: 'rose',
          },
          {
            label: 'Net operating profit',
            value: money(metrics.netProfit),
            hint: metrics.netProfit >= 0 ? 'after all costs' : 'costs exceed revenue',
            icon: TrendingUp,
            tone: metrics.netProfit >= 0 ? 'emerald' : 'rose',
          },
          {
            label: 'Margin',
            value: `${metrics.marginPercent}%`,
            hint: `of ${money(metrics.revenueTotal, 0)} gross`,
            icon: TrendingUp,
            tone: 'indigo',
          },
        ]}
      />

      <StatusStrip
        items={[
          { label: 'Cost ratio', value: `${pct(metrics.expenseTotal, metrics.revenueTotal, 1)}%`, hint: 'expenses ÷ revenue' },
          { label: "Today's revenue", value: money(metrics.revenueToday), hint: `${metrics.invoiceCountToday} bill(s)` },
          { label: 'Average expense', value: money(expenses.length ? metrics.expenseTotal / expenses.length : 0), hint: 'per entry' },
          { label: 'Categories in use', value: byCategory.length, hint: `of ${EXPENSE_CATEGORIES.length}` },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            icon={Receipt}
            title="Expense ledger"
            subtitle="Newest first. Every entry feeds straight into the profit calculation."
          />
          {sorted.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses logged"
              description="Add rent, supplies or payroll to see the net margin."
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Category</TH>
                    <TH>Note</TH>
                    <TH>Logged by</TH>
                    <TH align="right">Amount</TH>
                    <TH align="right" />
                  </TR>
                </THead>
                <TBody>
                  {sorted.map((expense) => (
                    <TR key={expense.id}>
                      <TD>
                        <span className="tnum block text-xs text-zinc-900">
                          {dateLabel(expense.at)}
                        </span>
                        <span className="block text-[10px] text-zinc-400">
                          {relativeDay(expense.at, now)}
                        </span>
                      </TD>
                      <TD>
                        <Badge tone="zinc" size="sm">
                          {expense.category}
                        </Badge>
                      </TD>
                      <TD muted>{expense.note}</TD>
                      <TD muted>{expense.by}</TD>
                      <TD align="right" mono className="font-semibold">
                        −{money(expense.amount)}
                      </TD>
                      <TD align="right">
                        <IconButton
                          icon={Trash2}
                          label={`Delete ${expense.note || expense.category}`}
                          variant="secondary"
                          onClick={() => actions.deleteExpense({ id: expense.id })}
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader icon={Plus} title="Log an expense" subtitle="Goes into the ledger immediately." />
            <CardBody className="space-y-3">
              <Field label="Category">
                <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {EXPENSE_CATEGORIES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount (₹)" required>
                <Input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Field>
              <Field label="Notes">
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. Weekly vegetable, dairy and poultry run"
                />
              </Field>
              <Button
                variant="primary"
                size="sm"
                block
                disabled={!canLog}
                onClick={() => {
                  actions.addExpense({
                    category,
                    amount: Number(amount),
                    note: note.trim(),
                    at: new Date(`${date}T12:00:00`).getTime(),
                    by: staff?.name || 'Manager',
                  })
                  setAmount('')
                  setNote('')
                }}
              >
                Add to ledger
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={PiggyBank} title="Profit & loss" />
            <CardBody className="space-y-2.5">
              <DataRow label="Gross revenue" value={money(metrics.revenueTotal)} />
              <DataRow
                label="Operating expenses"
                value={`−${money(metrics.expenseTotal)}`}
                tone="rose"
              />
              <div className="flex items-baseline justify-between gap-4 border-t border-zinc-200 pt-2.5">
                <span className="text-sm font-semibold text-zinc-900">Net profit</span>
                <span
                  className={classNames(
                    'tnum text-base font-semibold',
                    metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700',
                  )}
                >
                  {money(metrics.netProfit)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Margin {metrics.marginPercent}% across {state.invoices.length} invoices
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          icon={TrendingDown}
          title="Cost breakdown"
          subtitle="Where the money goes, largest first."
        />
        <CardBody className="space-y-3.5">
          {byCategory.length === 0 ? (
            <p className="text-xs text-zinc-500">No expenses logged yet.</p>
          ) : (
            byCategory.map((entry) => (
              <div key={entry.category}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium text-zinc-700">{entry.category}</span>
                  <span className="flex items-center gap-2">
                    <span className="tnum text-xs text-zinc-500">
                      {pct(entry.total, metrics.expenseTotal, 1)}%
                    </span>
                    <span className="tnum text-sm font-semibold text-zinc-900">
                      {money(entry.total)}
                    </span>
                  </span>
                </div>
                <ProgressBar
                  className="mt-1.5"
                  value={entry.total}
                  max={byCategory[0].total}
                  tone={entry.category === 'Payroll' ? 'indigo' : 'rose'}
                />
                <p className="mt-1 text-[10px] text-zinc-400">{entry.count} entry(s)</p>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  )
}
