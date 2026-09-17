import { useMemo, useState } from 'react'
import {
  Bell,
  BellOff,
  Crown,
  Leaf,
  QrCode,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  Drawer,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PillTabs,
  SearchInput,
  Table,
  TableWrap,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  TR,
} from '../../components/ui'
import { DataRow, KPIGrid, PageHeader } from '../../components/store/PageParts'
import { useNow } from '../../lib/ticker'
import { SEGMENTS } from '../../lib/orders'
import { guestStats, optedOutCount, segmentGuests, segmentSize } from '../../lib/selectors'
import { dateTimeLabel, duration, initials, money, relativeDay } from '../../lib/format'
import { showSystemNotification } from '../../lib/notifications'

export default function GuestsPage() {
  const { state, actions } = useStore()
  const now = useNow()
  const [segment, setSegment] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', phone: '' })
  const [notifyTarget, setNotifyTarget] = useState(null)
  const [notifyDraft, setNotifyDraft] = useState({ title: '', body: '', coupon: '' })
  const [notifySentSuccess, setNotifySentSuccess] = useState(false)

  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)
  const stats = guestStats(state, now)
  const optedOut = optedOutCount(state.guests)

  const guests = useMemo(() => {
    const base = segmentGuests(state.guests, segment, now)
    const q = query.trim().toLowerCase()
    return base
      .filter((guest) =>
        q ? guest.name.toLowerCase().includes(q) || String(guest.phone).includes(q) : true,
      )
      .sort((a, b) => b.totalSpend - a.totalSpend)
  }, [state.guests, segment, query, now])

  const selected = state.guests.find((guest) => guest.id === selectedId) || null
  const history = selected
    ? state.invoices.filter(
        (invoice) =>
          String(invoice.guestPhone || '').replace(/\D/g, '') ===
          String(selected.phone).replace(/\D/g, ''),
      )
    : []

  function openNotifyModal(guest) {
    setNotifyTarget(guest)
    setNotifySentSuccess(false)
    setNotifyDraft({
      title: `Special treat for you, ${guest.name.split(' ')[0]}! 🎉`,
      body: `Enjoy 20% off on your favorite ${guest.favoriteDish || 'delicacies'} at Ganesh Café!`,
      coupon: 'FEAST20',
    })
  }

  function handleSendQuickNotification() {
    if (!notifyDraft.title.trim()) return

    // 1. Dispatch in-app push notification
    actions.pushNotification({
      notification: {
        kind: 'campaign',
        channel: notifyTarget?.source === 'app' ? 'push' : 'whatsapp',
        title: notifyDraft.title,
        body: notifyDraft.body,
        coupon: notifyDraft.coupon || null,
      },
    })

    // 2. Trigger real OS/browser notification
    showSystemNotification({
      title: notifyDraft.title,
      body: notifyDraft.body,
      coupon: notifyDraft.coupon || null,
      kind: 'campaign',
    })

    // 3. Log event
    actions.dispatch({
      type: 'SEND_CAMPAIGN',
      name: `Direct Alert · ${notifyTarget?.name}`,
      heading: notifyDraft.title,
      body: notifyDraft.body,
      coupon: notifyDraft.coupon,
      channel: notifyTarget?.source === 'app' ? 'push' : 'whatsapp',
      audience: 'custom',
      audienceLabel: notifyTarget?.name || 'Guest',
      audienceSize: 1,
      sent: 1,
      opened: 1,
      walkIns: 0,
      revenue: 0,
      status: 'completed',
      createdBy: staff?.name || 'Manager',
    })

    setNotifySentSuccess(true)
    setTimeout(() => {
      setNotifyTarget(null)
      setNotifySentSuccess(false)
    }, 1200)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Guests & CRM"
        description="Every guest captured from table QR menu scanner orders, app installs, or counter billing. Reach them with instant notifications and offers."
        badge={
          <div className="flex items-center gap-2">
            <Badge tone="indigo" size="md" mono>
              {stats.total} guests
            </Badge>
            {optedOut ? (
              <Badge tone="zinc" size="md" mono>
                {optedOut} opted out
              </Badge>
            ) : null}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                actions.setUi({ patch: { guestSegment: segment } })
              }}
            >
              <Send size={13} strokeWidth={2} />
              Broadcast to segment
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setDraft({ name: '', phone: '' })
                setAddOpen(true)
              }}
            >
              <UserPlus size={13} strokeWidth={2} />
              Add guest
            </Button>
          </div>
        }
      />

      <KPIGrid
        columns={4}
        items={[
          { label: 'Guests in CRM', value: stats.total, hint: `${stats.active} active in 30 days`, icon: Users, tone: 'indigo' },
          { label: 'Inactive 30+ days', value: stats.inactive, hint: 'win-back opportunity', icon: UserRound, tone: 'rose' },
          { label: 'Lifetime value', value: money(stats.ltv), hint: `${money(stats.avgSpend)} average`, icon: Crown, tone: 'emerald' },
          { label: 'Average visits', value: stats.avgVisits, hint: 'per guest record', icon: Users, tone: 'zinc' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          value={segment}
          onChange={setSegment}
          tabs={SEGMENTS.map((entry) => ({
            id: entry.id,
            label: `${entry.label} · ${segmentSize(state.guests, entry.id, now)}`,
          }))}
        />
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or phone"
          className="w-full sm:w-64"
        />
      </div>

      <Card>
        {guests.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No guests in this segment"
            description="Try another segment, or capture a guest by placing an order from the guest app."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Guest</TH>
                  <TH>Channel / Source</TH>
                  <TH>Phone</TH>
                  <TH align="right">Visits</TH>
                  <TH align="right">Lifetime value</TH>
                  <TH>Favourite dish</TH>
                  <TH>Last visit</TH>
                  <TH align="center">Diet</TH>
                  <TH align="right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {guests.map((guest) => (
                  <TR key={guest.id} onClick={() => setSelectedId(guest.id)}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
                          {initials(guest.name)}
                        </span>
                        <div className="min-w-0">
                          <span className="block text-xs font-medium text-zinc-900">{guest.name}</span>
                        </div>
                        {guest.totalSpend >= 8000 ? (
                          <Badge tone="amber" size="sm">
                            VIP
                          </Badge>
                        ) : null}
                        {guest.optedOut ? (
                          <Badge tone="zinc" size="sm" icon={BellOff}>
                            Opted out
                          </Badge>
                        ) : null}
                      </div>
                    </TD>
                    <TD>
                      {guest.source === 'app' ? (
                        <Badge tone="emerald" size="sm">
                          <Smartphone size={11} className="mr-1 inline text-emerald-600" />
                          App Installed
                        </Badge>
                      ) : (
                        <Badge tone="indigo" size="sm">
                          <QrCode size={11} className="mr-1 inline text-indigo-600" />
                          QR Menu Scanner
                        </Badge>
                      )}
                    </TD>
                    <TD mono muted>
                      {guest.phone || '—'}
                    </TD>
                    <TD align="right" mono>
                      {guest.visits}
                    </TD>
                    <TD align="right" mono className="font-semibold">
                      {money(guest.totalSpend)}
                    </TD>
                    <TD muted>{guest.favoriteDish || '—'}</TD>
                    <TD>
                      <span className="block text-xs text-zinc-700">
                        {relativeDay(guest.lastVisit, now)}
                      </span>
                      <span className="block text-[10px] text-zinc-400">
                        {now - guest.lastVisit > 30 * 86400000 ? 'inactive' : 'active'}
                      </span>
                    </TD>
                    <TD align="center">
                      {guest.vegOnly ? (
                        <span className="inline-flex justify-center" title="Vegetarian only">
                          <Leaf size={13} strokeWidth={2} className="text-emerald-600" />
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">—</span>
                      )}
                    </TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => openNotifyModal(guest)}
                          disabled={guest.optedOut}
                        >
                          <Send size={11} strokeWidth={2} />
                          Send Offer
                        </Button>
                        <IconButton
                          icon={Trash2}
                          label={`Remove ${guest.name}`}
                          variant="ghost"
                          onClick={() => setDeleteTarget(guest)}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name || ''}
        subtitle={selected ? `${selected.phone} · joined ${relativeDay(selected.joinedAt, now)}` : ''}
        footer={
          selected ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" block onClick={() => setSelectedId(null)}>
                Close
              </Button>
              <Button
                size="sm"
                variant="primary"
                block
                onClick={() => {
                  openNotifyModal(selected)
                  setSelectedId(null)
                }}
              >
                <Send size={13} strokeWidth={2} />
                Send Notification / Offer
              </Button>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="indigo" size="md">
                {selected.visits} visits
              </Badge>
              {selected.source === 'app' ? (
                <Badge tone="emerald" size="md">
                  <Smartphone size={12} className="mr-1 inline text-emerald-600" />
                  App Installed
                </Badge>
              ) : (
                <Badge tone="indigo" size="md">
                  <QrCode size={12} className="mr-1 inline text-indigo-600" />
                  QR Scanner User
                </Badge>
              )}
              {selected.totalSpend >= 8000 ? (
                <Badge tone="amber" size="md">
                  VIP
                </Badge>
              ) : null}
              {selected.vegOnly ? (
                <Badge tone="emerald" size="md">
                  Veg only
                </Badge>
              ) : null}
              {now - selected.lastVisit > 30 * 86400000 ? (
                <Badge tone="rose" size="md">
                  Inactive
                </Badge>
              ) : null}
              {selected.optedOut ? (
                <Badge tone="zinc" size="md" icon={BellOff}>
                  Opted out of marketing
                </Badge>
              ) : (
                <Badge tone="emerald" size="md" icon={Bell}>
                  Marketing on
                </Badge>
              )}
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                    <Sparkles size={13} className="text-emerald-600" />
                    Instant Notification & Offer
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
                    Send a direct discount or food alert to {selected.name}&apos;s device immediately.
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => {
                    openNotifyModal(selected)
                  }}
                  disabled={selected.optedOut}
                >
                  <Send size={11} strokeWidth={2} />
                  Send Offer
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50/70 px-3 py-2.5">
              <p className="max-w-sm text-[11px] leading-relaxed text-zinc-500">
                {selected.optedOut
                  ? 'Excluded from every campaign audience until they opt back in.'
                  : 'Included in campaign audiences for the segments they match.'}
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  actions.setGuestOptOut({
                    id: selected.id,
                    value: !selected.optedOut,
                    actor: staff?.name,
                  })
                }
              >
                {selected.optedOut ? (
                  <>
                    <Bell size={13} strokeWidth={2} />
                    Opt back in
                  </>
                ) : (
                  <>
                    <BellOff size={13} strokeWidth={2} />
                    Mark opted out
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-md border border-zinc-200 p-3">
              <DataRow label="Lifetime value" value={money(selected.totalSpend)} />
              <DataRow
                label="Average spend"
                value={money(selected.visits ? selected.totalSpend / selected.visits : 0)}
                className="mt-2"
              />
              <DataRow label="Favourite dish" value={selected.favoriteDish || '—'} mono={false} className="mt-2" />
              <DataRow label="Last visit" value={dateTimeLabel(selected.lastVisit)} className="mt-2" />
              <DataRow label="First seen" value={relativeDay(selected.joinedAt, now)} mono={false} className="mt-2" />
              <DataRow label="Acquisition source" value={selected.source === 'app' ? 'Mobile App Install' : 'Table QR Menu Scanner'} mono={false} className="mt-2" />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Invoice history ({history.length})
              </p>
              {history.length === 0 ? (
                <p className="mt-2 text-[11px] text-zinc-500">
                  No settled invoices recorded for this phone number yet.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200">
                  {history.map((invoice) => (
                    <li key={invoice.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="tnum truncate text-[11px] font-medium text-zinc-900">
                          {invoice.id}
                        </p>
                        <p className="tnum text-[10px] text-zinc-500">
                          {invoice.tableId} · {invoice.method} ·{' '}
                          {relativeDay(invoice.settledAt, now)}
                        </p>
                      </div>
                      <span className="tnum text-xs font-semibold text-zinc-900">
                        {money(invoice.totals.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Open tickets
              </p>
              <ul className="mt-2 space-y-1.5">
                {state.orders
                  .filter(
                    (order) =>
                      String(order.guestPhone || '').replace(/\D/g, '') ===
                        String(selected.phone).replace(/\D/g, '') &&
                      order.status !== 'paid' &&
                      order.status !== 'void',
                  )
                  .map((order) => (
                    <li
                      key={order.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2"
                    >
                      <span className="tnum text-[11px] text-zinc-700">
                        {order.tableId} · Round {order.round}
                      </span>
                      <Badge tone="amber" size="sm">
                        {order.status}
                      </Badge>
                    </li>
                  ))}
                {state.orders.filter(
                  (order) =>
                    String(order.guestPhone || '').replace(/\D/g, '') ===
                      String(selected.phone).replace(/\D/g, '') &&
                    order.status !== 'paid' &&
                    order.status !== 'void',
                ).length === 0 ? (
                  <li className="text-[11px] text-zinc-500">Nothing open right now.</li>
                ) : null}
              </ul>
            </div>

            <p className="text-[11px] text-zinc-400">
              Guest record {selected.id} · session length average{' '}
              {duration(now - selected.joinedAt)}
            </p>
          </div>
        ) : null}
      </Drawer>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => actions.deleteGuest({ id: deleteTarget.id })}
        title={`Remove ${deleteTarget?.name || 'guest'}?`}
        description="The CRM record and its segment membership are deleted. Issued invoices keep their own guest details."
        confirmLabel="Remove guest"
        tone="danger"
      />

      <AddGuestModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        draft={draft}
        onChange={setDraft}
        onSubmit={() => {
          actions.upsertGuest({ patch: { name: draft.name, phone: draft.phone } })
          setAddOpen(false)
        }}
      />

      <QuickNotifyModal
        open={Boolean(notifyTarget)}
        onClose={() => setNotifyTarget(null)}
        target={notifyTarget}
        draft={notifyDraft}
        onChange={setNotifyDraft}
        onSubmit={handleSendQuickNotification}
        sentSuccess={notifySentSuccess}
      />
    </div>
  )
}

function QuickNotifyModal({ open, onClose, target, draft, onChange, onSubmit, sentSuccess }) {
  if (!target) return null
  const valid = Boolean(draft.title.trim())

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send Notification to ${target.name}`}
      subtitle={`Deliver an instant push notification & offer banner to ${target.phone || target.name}.`}
      icon={Send}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={sentSuccess}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!valid || sentSuccess}
            onClick={onSubmit}
          >
            {sentSuccess ? '✓ Notification Delivered!' : 'Send Notification Now'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-700">
          <span className="font-semibold text-zinc-900">{target.name}</span>
          <span className="text-zinc-400">•</span>
          <span className="tnum text-zinc-600">{target.phone}</span>
          <span className="text-zinc-400">•</span>
          <Badge tone={target.source === 'app' ? 'emerald' : 'indigo'} size="sm">
            {target.source === 'app' ? 'App Installed' : 'QR Menu Scanner'}
          </Badge>
        </div>

        <Field label="Notification Title / Heading" required>
          <Input
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            placeholder="e.g. Biryani Fest is on 🎉"
            autoFocus
          />
        </Field>

        <Field label="Message Body" required>
          <Textarea
            rows={3}
            value={draft.body}
            onChange={(event) => onChange({ ...draft, body: event.target.value })}
            placeholder="Enter the push notification text..."
          />
        </Field>

        <Field label="Coupon Code (Optional)" hint="Carried onto their bill automatically if applied.">
          <Input
            value={draft.coupon}
            onChange={(event) => onChange({ ...draft, coupon: event.target.value.toUpperCase() })}
            placeholder="e.g. FEAST20"
          />
        </Field>
      </div>
    </Modal>
  )
}

function AddGuestModal({ open, onClose, draft, onChange, onSubmit }) {
  const valid = draft.name.trim() && String(draft.phone).replace(/\D/g, '').length >= 10
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a guest"
      subtitle="Capture a walk-in so they can be included in future broadcasts."
      icon={UserPlus}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={!valid} onClick={onSubmit}>
            Save guest
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Full name" required>
          <Input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="e.g. Ritu Sen"
            autoFocus
          />
        </Field>
        <Field label="Mobile number" required hint="Used to match future orders and loyalty credit.">
          <Input
            value={draft.phone}
            onChange={(event) => onChange({ ...draft, phone: event.target.value })}
            placeholder="98765 43210"
            inputMode="tel"
          />
        </Field>
      </div>
    </Modal>
  )
}
