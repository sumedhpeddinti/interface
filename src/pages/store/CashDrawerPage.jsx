import { useState } from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  History,
  LockKeyhole,
  Printer,
  Receipt,
  Unlock,
  Wallet,
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  InlineNote,
  Modal,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui'
import { DataRow, KPIGrid, PageHeader, StatusStrip } from '../../components/store/PageParts'
import {
  CashMovementModal,
  CloseShiftModal,
  OpenShiftModal,
} from '../../components/store/CashDrawerModal'
import { useNow } from '../../lib/ticker'
import { cashDrawerSummary, varianceOf } from '../../lib/selectors'
import { printPage } from '../../lib/qr'
import { classNames, clock, dateTimeLabel, duration, money } from '../../lib/format'

function ShiftSummaryModal({ open, onClose, record, restaurant }) {
  if (!record) return null
  const balanced = Math.abs(record.variance) < 0.01
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Shift ${record.id} summary`}
      subtitle="Closing reconciliation report."
      icon={Printer}
      size="md"
      printArea
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
          <Button variant="primary" size="sm" onClick={printPage}>
            <Printer size={13} strokeWidth={1.9} />
            Export summary
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-md font-mono">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-900">
            {restaurant?.name || 'Beno'}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            Shift reconciliation · {record.id}
          </p>
          <p className="text-[11px] text-zinc-600">GSTIN {restaurant?.gstin}</p>
        </div>

        <div className="my-3 border-t border-dashed border-zinc-400" />

        <div className="space-y-2">
          <DataRow label="Opened" value={dateTimeLabel(record.openedAt)} />
          <DataRow label="Closed" value={dateTimeLabel(record.closedAt)} />
          <DataRow label="Closed by" value={record.closedBy} />
          <div className="border-t border-zinc-200 pt-2">
            <DataRow label="Opening float" value={money(record.openingFloat)} />
            <DataRow label="Cash sales" value={money(record.cashSales)} />
            <DataRow label="Cash in" value={money(record.cashIn)} />
            <DataRow label="Cash out" value={`−${money(record.cashOut)}`} />
          </div>
          <div className="border-t border-dashed border-zinc-400 pt-2">
            <DataRow label="Expected in drawer" value={money(record.expectedCash)} />
            <DataRow label="Actual counted" value={money(record.countedCash)} />
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-semibold text-zinc-900">
                {balanced ? 'Variance' : record.variance > 0 ? 'Overage' : 'Shortage'}
              </span>
              <span
                className={classNames(
                  'tnum text-sm font-bold',
                  balanced ? 'text-zinc-900' : record.variance > 0 ? 'text-amber-700' : 'text-rose-700',
                )}
              >
                {money(Math.abs(record.variance))}
              </span>
            </div>
          </div>
        </div>

        {record.notes ? (
          <p className="mt-3 border-t border-dashed border-zinc-400 pt-3 text-[11px] leading-relaxed text-zinc-600">
            Notes: {record.notes}
          </p>
        ) : null}

        <p className="mt-3 border-t border-dashed border-zinc-400 pt-3 text-center text-[10px] text-zinc-500">
          Filed with the day&apos;s GST invoices · {restaurant?.name}
        </p>
      </div>
    </Modal>
  )
}

export default function CashDrawerPage() {
  const { state, actions } = useStore()
  const now = useNow()
  const [openShift, setOpenShift] = useState(false)
  const [closeShift, setCloseShift] = useState(false)
  const [movement, setMovement] = useState(null)
  const [summaryRecord, setSummaryRecord] = useState(null)

  const summary = cashDrawerSummary(state, now)
  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)
  const transactions = state.shift?.cashTransactions || []
  const closedShifts = state.shift?.closedShifts || []

  const cashInvoices = state.invoices.filter(
    (invoice) => invoice.method === 'Cash' && invoice.settledAt >= (state.shift?.openedAt || 0),
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shift & cash drawer"
        description="The drawer is the source of truth at close: float, cash sales from the register, petty cash movements, and the reconciliation variance."
        badge={
          summary.isOpen ? (
            <Badge tone="emerald" size="md" dot pulse>
              Drawer open
            </Badge>
          ) : (
            <Badge tone="rose" size="md">
              Drawer closed
            </Badge>
          )
        }
        actions={
          summary.isOpen ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => setMovement('in')}>
                <ArrowDownCircle size={13} strokeWidth={1.9} />
                Cash in
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setMovement('out')}>
                <ArrowUpCircle size={13} strokeWidth={1.9} />
                Cash out
              </Button>
              <Button size="sm" variant="primary" onClick={() => setCloseShift(true)}>
                <LockKeyhole size={13} strokeWidth={1.9} />
                Close shift
              </Button>
            </>
          ) : (
            <Button size="sm" variant="primary" onClick={() => setOpenShift(true)}>
              <Unlock size={13} strokeWidth={1.9} />
              Open a new shift
            </Button>
          )
        }
      />

      {!summary.isOpen ? (
        <InlineNote tone="amber" icon={LockKeyhole}>
          The drawer is closed, so bill settlements are recorded but not attributed to a shift. Open a
          shift with your float to resume cash tracking.
        </InlineNote>
      ) : null}

      <KPIGrid
        columns={4}
        items={[
          {
            label: 'Expected in drawer',
            value: money(summary.expectedCash),
            hint: `shift ${state.shift?.id} · ${summary.isOpen ? duration(summary.duration) : 'closed'}`,
            icon: Wallet,
            tone: 'emerald',
          },
          {
            label: 'Opening float',
            value: money(summary.openingFloat),
            hint: state.shift?.openedBy ? `counted by ${state.shift.openedBy}` : '—',
            icon: Banknote,
            tone: 'zinc',
          },
          {
            label: 'Cash sales',
            value: money(summary.cashSales),
            hint: `${summary.cashInvoiceCount} cash bill(s)`,
            icon: Receipt,
            tone: 'indigo',
          },
          {
            label: 'Movements',
            value: `${transactions.length}`,
            hint: `in ${money(summary.cashIn, 0)} · out ${money(summary.cashOut, 0)}`,
            icon: ArrowUpCircle,
            tone: summary.cashOut > 0 ? 'rose' : 'zinc',
          },
        ]}
      />

      <StatusStrip
        items={[
          { label: 'Opening float', value: money(summary.openingFloat) },
          { label: 'Cash in', value: money(summary.cashIn), hint: 'petty cash returned' },
          { label: 'Cash out', value: `−${money(summary.cashOut)}`, hint: 'petty cash spent' },
          { label: 'Expected', value: money(summary.expectedCash), hint: 'float + sales + in − out' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={ArrowUpCircle}
            title="Cash movement ledger"
            subtitle="Every manual drawer movement during this shift."
          />
          {transactions.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No cash movements"
              description="Log petty cash for milk, ice or tips so the closing count reconciles."
              compact
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>When</TH>
                    <TH>Type</TH>
                    <TH>Reason</TH>
                    <TH>Recorded by</TH>
                    <TH align="right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {transactions.map((txn) => (
                    <TR key={txn.id}>
                      <TD mono muted>
                        {clock(txn.at)}
                      </TD>
                      <TD>
                        <Badge tone={txn.type === 'in' ? 'emerald' : 'rose'} size="sm">
                          {txn.type === 'in' ? 'Cash in' : 'Cash out'}
                        </Badge>
                      </TD>
                      <TD>{txn.reason}</TD>
                      <TD muted>{txn.by}</TD>
                      <TD align="right" mono className="font-semibold">
                        {txn.type === 'in' ? '' : '−'}
                        {money(txn.amount)}
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
            <CardHeader icon={Receipt} title="Cash bills this shift" />
            {cashInvoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No cash settlements yet" compact />
            ) : (
              <ul className="divide-y divide-zinc-200">
                {cashInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="tnum truncate text-[11px] font-medium text-zinc-900">
                        {invoice.id}
                      </p>
                      <p className="tnum text-[10px] text-zinc-500">
                        {invoice.tableId} · {clock(invoice.settledAt)}
                      </p>
                    </div>
                    <span className="tnum text-xs font-semibold text-zinc-900">
                      {money(invoice.totals.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader icon={Wallet} title="Live reconciliation" />
            <CardBody className="space-y-2.5">
              <DataRow label="Opening float" value={money(summary.openingFloat)} />
              <DataRow label="Cash sales" value={money(summary.cashSales)} />
              <DataRow label="Cash in" value={money(summary.cashIn)} tone="emerald" />
              <DataRow label="Cash out" value={`−${money(summary.cashOut)}`} tone="rose" />
              <div className="flex items-baseline justify-between gap-4 border-t border-zinc-200 pt-2.5">
                <span className="text-xs font-semibold text-zinc-900">Expected in drawer</span>
                <span className="tnum text-sm font-semibold text-zinc-900">
                  {money(summary.expectedCash)}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                block
                disabled={!summary.isOpen}
                onClick={() => setCloseShift(true)}
              >
                Reconcile & close
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          icon={History}
          title="Closed shifts"
          subtitle="Archived reconciliations with variance and closing notes."
        />
        {closedShifts.length === 0 ? (
          <EmptyState icon={History} title="No closed shifts yet" compact />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Shift</TH>
                  <TH>Opened</TH>
                  <TH>Closed</TH>
                  <TH align="right">Float</TH>
                  <TH align="right">Cash sales</TH>
                  <TH align="right">Expected</TH>
                  <TH align="right">Counted</TH>
                  <TH align="right">Variance</TH>
                  <TH align="right">Report</TH>
                </TR>
              </THead>
              <TBody>
                {closedShifts.map((record) => (
                  <TR key={record.id}>
                    <TD mono className="font-semibold">
                      {record.id}
                    </TD>
                    <TD mono muted>
                      {clock(record.openedAt)}
                    </TD>
                    <TD mono muted>
                      {clock(record.closedAt)}
                    </TD>
                    <TD align="right" mono>
                      {money(record.openingFloat, 0)}
                    </TD>
                    <TD align="right" mono>
                      {money(record.cashSales)}
                    </TD>
                    <TD align="right" mono>
                      {money(record.expectedCash)}
                    </TD>
                    <TD align="right" mono>
                      {money(record.countedCash)}
                    </TD>
                    <TD align="right">
                      <span
                        className={classNames(
                          'tnum font-medium',
                          Math.abs(record.variance) < 0.01
                            ? 'text-zinc-600'
                            : record.variance > 0
                              ? 'text-amber-700'
                              : 'text-rose-700',
                        )}
                      >
                        {record.variance > 0 ? '+' : ''}
                        {money(record.variance)}
                      </span>
                    </TD>
                    <TD align="right">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setSummaryRecord(record)}
                      >
                        <Printer size={11} strokeWidth={2} />
                        View
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <OpenShiftModal
        open={openShift}
        onClose={() => setOpenShift(false)}
        onOpen={(openingFloat) =>
          actions.openShift({ openingFloat, by: staff?.name || 'Cashier' })
        }
      />

      <CashMovementModal
        open={Boolean(movement)}
        txnType={movement || 'out'}
        onClose={() => setMovement(null)}
        onSubmit={(payload) => actions.cashTransaction({ ...payload, by: staff?.name })}
      />

      <CloseShiftModal
        open={closeShift}
        onClose={() => setCloseShift(false)}
        summary={summary}
        onConfirm={({ countedCash, notes }) => {
          const expected = summary.expectedCash
          const record = {
            id: state.shift.id,
            openedAt: state.shift.openedAt,
            closedAt: Date.now(),
            openingFloat: summary.openingFloat,
            cashSales: summary.cashSales,
            cashIn: summary.cashIn,
            cashOut: summary.cashOut,
            expectedCash: expected,
            countedCash,
            variance: varianceOf(expected, countedCash),
            closedBy: staff?.name || 'Cashier',
            notes,
          }
          actions.closeShift({ countedCash, notes, by: staff?.name })
          setCloseShift(false)
          setSummaryRecord(record)
        }}
      />

      <ShiftSummaryModal
        open={Boolean(summaryRecord)}
        onClose={() => setSummaryRecord(null)}
        record={summaryRecord}
        restaurant={state.restaurant}
      />
    </div>
  )
}
