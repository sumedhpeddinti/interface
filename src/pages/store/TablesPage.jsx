import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Check,
  Clock,
  CreditCard,
  LayoutGrid,
  Plus,
  Receipt,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Drawer,
  EmptyState,
  Modal,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
} from '../../components/ui'
import { KPIGrid, PageHeader } from '../../components/store/PageParts'
import { FloorPlanView } from '../../components/store/FloorPlanView'
import { AddItemsModal } from '../../components/store/AddItemsModal'
import { useNow } from '../../lib/ticker'
import {
  deriveTableState,
  openRoundsOfTable,
  seatedSince,
  tableBill,
} from '../../lib/selectors'
import { ROUND_STATUS, STATUS_META, TABLE_SECTIONS, TABLE_STATE, TABLE_STATE_TONE } from '../../lib/orders'
import { classNames, clock, duration, money } from '../../lib/format'

export default function TablesPage() {
  const { state, actions } = useStore()
  const navigate = useNavigate()
  const now = useNow()
  const [section, setSection] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  const [addItemsOpen, setAddItemsOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const view = state.ui.tablesView || 'plan'
  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)

  const entries = useMemo(
    () =>
      state.tables.map((table) => {
        const bill = tableBill(state.orders, table.id)
        return {
          table,
          status: deriveTableState(table, state.orders),
          total: bill.total,
          roundCount: bill.roundCount,
          itemCount: bill.itemCount,
          seatedAt: seatedSince(state.orders, table.id),
          bill,
        }
      }),
    [state.tables, state.orders],
  )

  const filtered = section === 'All' ? entries : entries.filter((e) => e.table.section === section)
  const selected = entries.find((entry) => entry.table.id === selectedId) || null

  const counts = {
    [TABLE_STATE.FREE]: entries.filter((entry) => entry.status === TABLE_STATE.FREE).length,
    [TABLE_STATE.OCCUPIED]: entries.filter((entry) => entry.status === TABLE_STATE.OCCUPIED).length,
    [TABLE_STATE.BILLED]: entries.filter((entry) => entry.status === TABLE_STATE.BILLED).length,
    [TABLE_STATE.RESERVED]: entries.filter((entry) => entry.status === TABLE_STATE.RESERVED).length,
  }
  const covers = entries
    .filter((entry) => entry.status !== TABLE_STATE.FREE)
    .reduce((sum, entry) => sum + entry.table.seats, 0)

  const rounds = selected ? openRoundsOfTable(state.orders, selected.table.id) : []
  const freeTables = entries.filter((entry) => entry.status === TABLE_STATE.FREE)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Floor & tables"
        description="Twelve tables across the Main Floor, Patio and Balcony. Tap any table to inspect its live ticket, add a round, transfer it or send it to the register."
        actions={
          <Tabs
            value={view}
            onChange={(next) => actions.setUi({ patch: { tablesView: next } })}
            tabs={[
              { id: 'plan', label: 'Floor plan', icon: LayoutGrid },
              { id: 'list', label: 'List matrix', icon: UtensilsCrossed },
            ]}
          />
        }
      />

      <KPIGrid
        columns={5}
        items={[
          { label: 'Free', value: counts.Free, hint: 'ready to seat', icon: Check, tone: 'zinc' },
          { label: 'Occupied', value: counts.Occupied, hint: 'in service', icon: Users, tone: 'amber' },
          { label: 'Billed', value: counts.Billed, hint: 'awaiting payment', icon: Receipt, tone: 'emerald' },
          { label: 'Reserved', value: counts.Reserved, hint: 'held for a booking', icon: Clock, tone: 'indigo' },
          { label: 'Covers seated', value: covers, hint: 'guests on the floor', icon: Users, tone: 'zinc' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={section}
          onChange={setSection}
          tabs={[
            { id: 'All', label: 'All sections', count: entries.length },
            ...TABLE_SECTIONS.map((name) => ({
              id: name,
              label: name,
              count: entries.filter((entry) => entry.table.section === name).length,
            })),
          ]}
        />
        <p className="text-[11px] text-zinc-400">
          Seated timers and tab totals update live. {counts.Occupied + counts.Billed} tables in
          service.
        </p>
      </div>

      {view === 'plan' ? (
        <FloorPlanView
          entries={filtered}
          selectedId={selectedId}
          now={now}
          onSelect={(tableId) => setSelectedId(tableId)}
        />
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Table</TH>
                  <TH>Section</TH>
                  <TH align="right">Seats</TH>
                  <TH>Status</TH>
                  <TH align="right">Rounds</TH>
                  <TH align="right">Items</TH>
                  <TH align="right">Tab total</TH>
                  <TH>Seated</TH>
                  <TH align="right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((entry) => (
                  <TR key={entry.table.id} onClick={() => setSelectedId(entry.table.id)}>
                    <TD className="tnum font-semibold">{entry.table.id}</TD>
                    <TD muted>{entry.table.section}</TD>
                    <TD align="right" mono muted>
                      {entry.table.seats}
                    </TD>
                    <TD>
                      <Badge tone={TABLE_STATE_TONE[entry.status]} size="sm" dot pulse={entry.status === TABLE_STATE.OCCUPIED}>
                        {entry.status}
                      </Badge>
                    </TD>
                    <TD align="right" mono>
                      {entry.roundCount}
                    </TD>
                    <TD align="right" mono muted>
                      {entry.itemCount}
                    </TD>
                    <TD align="right" mono className="font-semibold">
                      {money(entry.total)}
                    </TD>
                    <TD mono muted>
                      {entry.seatedAt ? duration(now - entry.seatedAt) : '—'}
                    </TD>
                    <TD align="right">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedId(entry.table.id)
                        }}
                      >
                        Open ticket
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected ? `${selected.table.id} · ${selected.table.section}` : ''}
        subtitle={
          selected
            ? `${selected.table.seats} seats · ${selected.status}${selected.seatedAt ? ` · seated ${duration(now - selected.seatedAt)}` : ''}`
            : ''
        }
        footer={
          selected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Table bill</span>
                <span className="tnum text-base font-semibold text-zinc-900">
                  {money(selected.bill.total)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" block onClick={() => setAddItemsOpen(true)}>
                  <Plus size={13} strokeWidth={2.4} />
                  Add items
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  block
                  disabled={selected.roundCount === 0}
                  onClick={() => {
                    actions.setUi({ patch: { billingSelectedTable: selected.table.id } })
                    navigate('/store/billing')
                  }}
                >
                  <CreditCard size={13} strokeWidth={1.9} />
                  Open bill
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-2">
              <Badge tone={TABLE_STATE_TONE[selected.status]} size="md" dot>
                {selected.status}
              </Badge>
              {selected.table.reserved ? (
                <Badge tone="indigo" size="md">
                  Reserved
                </Badge>
              ) : null}
              {selected.bill.hasUnacknowledged ? (
                <Badge tone="rose" size="md" dot pulse>
                  New round
                </Badge>
              ) : null}
            </div>

            <div className="grid grid-cols-3 divide-x divide-zinc-200 rounded-md border border-zinc-200">
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">Rounds</p>
                <p className="tnum text-sm font-semibold text-zinc-900">{selected.roundCount}</p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">Items</p>
                <p className="tnum text-sm font-semibold text-zinc-900">{selected.itemCount}</p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">Tab</p>
                <p className="tnum text-sm font-semibold text-zinc-900">
                  {money(selected.total)}
                </p>
              </div>
            </div>

            {rounds.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="No open ticket"
                description="Add a counter round to start a bill, or reserve the table for a booking."
                compact
              />
            ) : (
              rounds.map((round) => (
                <div key={round.id} className="rounded-md border border-zinc-200">
                  <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/70 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="tnum text-xs font-semibold text-zinc-900">
                        Round {round.round}
                      </span>
                      <Badge tone={STATUS_META[round.status]?.tone} size="sm">
                        {STATUS_META[round.status]?.label}
                      </Badge>
                    </div>
                    <span className="tnum text-[11px] text-zinc-400">{clock(round.createdAt)}</span>
                  </div>
                  <ul className="divide-y divide-zinc-200">
                    {round.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 px-3 py-2">
                        <span className="tnum w-6 shrink-0 text-xs font-semibold text-zinc-900">
                          {item.qty}×
                        </span>
                        <span className="min-w-0 flex-1 text-xs text-zinc-700">
                          {item.name}
                          <span className="ml-1 text-[10px] text-zinc-400">{item.station}</span>
                        </span>
                        <span className="tnum text-xs text-zinc-500">
                          {money(item.price * item.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {round.notes ? (
                    <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                      {round.notes}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50/60 px-3 py-2">
                    <span className="text-[11px] text-zinc-500">
                      {round.guestName || 'Guest'}
                      {round.guestPhone ? ` · ${round.guestPhone}` : ''}
                    </span>
                    {round.status !== ROUND_STATUS.SERVED ? (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() =>
                          actions.serveOrder({ orderId: round.id, actor: staff?.name || 'Floor' })
                        }
                      >
                        <Check size={11} strokeWidth={2.6} />
                        Mark served
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}

            <div className="space-y-2 rounded-md border border-zinc-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Quick actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setAddItemsOpen(true)}>
                  <Plus size={13} strokeWidth={2.4} />
                  Add items
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={selected.roundCount === 0}
                  onClick={() => setTransferOpen(true)}
                >
                  <ArrowLeftRight size={13} strokeWidth={2} />
                  Transfer table
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    actions.setTableReserved({
                      tableId: selected.table.id,
                      reserved: !selected.table.reserved,
                    })
                  }
                >
                  {selected.table.reserved ? 'Release hold' : 'Reserve table'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={selected.roundCount === 0}
                  onClick={() =>
                    rounds
                      .filter((round) => round.status !== ROUND_STATUS.SERVED)
                      .forEach((round) =>
                        actions.serveOrder({ orderId: round.id, actor: staff?.name || 'Floor' }),
                      )
                  }
                >
                  <Check size={13} strokeWidth={2.4} />
                  Serve all
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      <AddItemsModal
        open={addItemsOpen}
        onClose={() => setAddItemsOpen(false)}
        menu={state.menu}
        tableId={selected?.table.id || '—'}
        onAdd={(items) => {
          actions.addRound({
            tableId: selected.table.id,
            items,
            actor: staff?.name || 'Counter',
            guestName: selected.bill.guestName,
            guestPhone: selected.bill.guestPhone,
          })
          setAddItemsOpen(false)
        }}
      />

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer table"
        subtitle={
          selected
            ? `Move every open round from ${selected.table.id} to another table.`
            : ''
        }
        icon={ArrowLeftRight}
        size="sm"
      >
        {freeTables.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No free tables"
            description="Every table is currently in service or held."
            compact
          />
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {freeTables.map((entry) => (
              <li key={entry.table.id}>
                <button
                  type="button"
                  onClick={() => {
                    actions.transferTable({
                      fromTableId: selected.table.id,
                      toTableId: entry.table.id,
                      actor: staff?.name || 'Floor',
                    })
                    setSelectedId(entry.table.id)
                    setTransferOpen(false)
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="tnum text-sm font-semibold text-zinc-900">
                      {entry.table.id}
                    </span>
                    <span className="text-[11px] text-zinc-500">{entry.table.section}</span>
                  </span>
                  <span className="tnum text-[11px] text-zinc-400">
                    {entry.table.seats} seats
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
