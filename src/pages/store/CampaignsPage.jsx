import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellRing,
  CalendarClock,
  Check,
  Megaphone,
  Phone,
  Send,
  ShieldCheck,
  Tag,
  Users,
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  InlineNote,
  Input,
  Select,
  Switch,
  Tabs,
  Textarea,
} from '../../components/ui'
import { PageHeader, StatusStrip } from '../../components/store/PageParts'
import { CampaignStats } from '../../components/store/CampaignStats'
import { useNotificationPermission } from '../../components/SystemNotifications'
import { showSystemNotification } from '../../lib/notifications'
import { SEGMENTS } from '../../lib/orders'
import { COUPONS } from '../../lib/pricing'
import {
  audienceGuests,
  audienceSize,
  campaignTotals,
  guestStats,
  optedOutCount,
} from '../../lib/selectors'
import { classNames, compactMoney, money } from '../../lib/format'

const TEMPLATES = [
  {
    heading: 'We miss you! Flat 20% Off',
    body: 'Enjoy flat 20% off your favourite Paneer Butter Masala this weekend. Show this message at the table.',
    coupon: 'WELCOME20',
    audience: 'inactive',
  },
  {
    heading: 'Biryani Fest is on 🎉',
    body: 'Dum-cooked Hyderabadi biryani, ₹100 off on every bill above ₹700. Today only.',
    coupon: 'FEAST100',
    audience: 'all',
  },
  {
    heading: 'A thank you from Beno',
    body: 'You are one of our top tables — here is 15% off your next visit, on the house.',
    coupon: 'PANEER15',
    audience: 'vip',
  },
]

/* The rules the console holds itself to. A blocked sender reaches nobody. */
const COMPLIANCE = [
  {
    title: 'Opt-out is one tap and permanent',
    body: 'A guest who opts out is dropped from every audience immediately and is never written to again until they opt back in themselves.',
  },
  {
    title: 'Rate limited to one message a day',
    body: 'Nobody receives three broadcasts in an afternoon. Sends are throttled per guest, per channel, so a busy weekend cannot burn the list.',
  },
  {
    title: 'WhatsApp templates go through approval',
    body: 'Broadcast templates are submitted and approved before they can be sent, which is what keeps the sending number from being suspended.',
  },
]

export default function CampaignsPage() {
  const { state, actions } = useStore()
  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)
  const os = useNotificationPermission()
  const [testOutcome, setTestOutcome] = useState(null)

  const [channel, setChannel] = useState('push')
  const [audience, setAudience] = useState('inactive')
  const [heading, setHeading] = useState(TEMPLATES[0].heading)
  const [body, setBody] = useState(TEMPLATES[0].body)
  const [coupon, setCoupon] = useState(TEMPLATES[0].coupon)
  const [scheduleMode, setScheduleMode] = useState('now')
  const [scheduleAt, setScheduleAt] = useState('')

  const stats = guestStats(state)
  /* Reach, not membership: opted-out guests are excluded from every audience. */
  const audienceReach = audienceSize(state.guests, audience)
  const optedOut = optedOutCount(state.guests)
  const audienceLabel = SEGMENTS.find((segment) => segment.id === audience)?.label || 'All guests'
  const audienceSample = useMemo(
    () => audienceGuests(state.guests, audience).slice(0, 4),
    [state.guests, audience],
  )

  const totals = campaignTotals(state.campaigns)
  const valid = heading.trim() && body.trim()

  function applyTemplate(template) {
    setHeading(template.heading)
    setBody(template.body)
    setCoupon(template.coupon)
    setAudience(template.audience)
  }

  /* Proves the channel end to end across ALL devices: sends notification locally
     and broadcasts to every connected device via the backend WebSocket channel */
  async function sendTest() {
    const testPayload = {
      channel: 'push',
      name: 'Test broadcast · Beno',
      heading: 'Test broadcast · Beno',
      body: 'This is a real system notification. If you can see it, the channel is live.',
      coupon: 'TEST10',
      audience: 'all',
      audienceLabel: 'All devices',
      audienceSize: audienceReach || 1,
      createdBy: staff?.name || 'Manager',
    }

    const result = await showSystemNotification({
      title: testPayload.heading,
      body: testPayload.body,
      tag: 'beno-test',
      kind: 'campaign',
    })
    setTestOutcome(result)

    try {
      await actions.sendCampaign(testPayload)
    } catch (err) {
      console.warn('Broadcast send error:', err)
    }
  }

  function dispatch() {
    if (!valid) return
    actions.sendCampaign({
      channel,
      name: heading.trim(),
      heading: heading.trim(),
      body: body.trim(),
      coupon: coupon || null,
      audience,
      audienceLabel,
      audienceSize: audienceReach,
      scheduleAt: scheduleMode === 'later' && scheduleAt ? new Date(scheduleAt).getTime() : null,
      createdBy: staff?.name || 'Manager',
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Campaigns & loyalty"
        description="Segment the guest book, broadcast on WhatsApp or Web Push, and measure the walk-ins and revenue it actually drove."
        badge={
          <Badge tone="zinc" size="md" mono>
            {state.campaigns.length} campaign(s)
          </Badge>
        }
      />

      <StatusStrip
        items={[
          { label: 'Guests in CRM', value: stats.total, hint: `${stats.active} active recently` },
          { label: 'Inactive 30+ days', value: stats.inactive, hint: 'best win-back target' },
          { label: 'Lifetime value', value: compactMoney(stats.ltv), hint: 'across all guests' },
          {
            label: 'Attributed revenue',
            value: compactMoney(totals.revenue),
            hint: `${totals.walkInRate}% redemption`,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            icon={Megaphone}
            title="Campaign composer"
            subtitle="One message, one audience, one measurable outcome."
            actions={
              <Button size="sm" variant="primary" disabled={!valid} onClick={dispatch}>
                <Send size={13} strokeWidth={2} />
                {scheduleMode === 'later' ? 'Schedule campaign' : 'Send now'}
              </Button>
            }
          />
          <CardBody className="space-y-4">
            <Tabs
              value={channel}
              onChange={setChannel}
              full
              tabs={[
                { id: 'push', label: 'Web Push notification' },
                { id: 'whatsapp', label: 'WhatsApp broadcast' },
              ]}
            />

            <div className="rounded-md border border-zinc-200 bg-zinc-50/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600">
                    <BellRing size={12} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold text-zinc-900">Delivery channel</p>
                      <Badge tone={os.tone} size="sm" dot pulse={os.granted}>
                        {os.granted ? 'System notifications on' : 'In-app banner only'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                      {os.label}
                    </p>
                    {testOutcome ? (
                      <p
                        className={classNames(
                          'mt-1.5 text-[11px] font-medium',
                          testOutcome.shown ? 'text-emerald-700' : 'text-amber-700',
                        )}
                      >
                        {testOutcome.shown
                          ? `Delivered to the system notification centre (${testOutcome.via}).`
                          : `Not delivered — ${testOutcome.via === 'permission' ? 'the browser has not granted permission yet' : testOutcome.via}.`}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {os.granted ? (
                    <Button size="sm" variant="secondary" onClick={sendTest}>
                      <Send size={12} strokeWidth={2} />
                      Send test notification
                    </Button>
                  ) : os.denied ? (
                    <span className="text-[11px] text-zinc-500">
                      Re-enable it in the browser's site settings
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => os.request()}>
                      <BellRing size={12} strokeWidth={2} />
                      Enable system notifications
                    </Button>
                  )}
                </div>
              </div>

              {os.granted ? (
                <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 border-t border-zinc-200 pt-2.5">
                  <span className="text-[11px] text-zinc-600">
                    Deliver broadcasts to the operating system, not just the café screen
                  </span>
                  <Switch
                    checked={state.settings?.osNotifications !== false}
                    onChange={(value) =>
                      actions.setSetting({ patch: { osNotifications: value } })
                    }
                    label=""
                  />
                </label>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-500">Quick templates:</span>
              {TEMPLATES.map((template) => (
                <button
                  key={template.heading}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
                >
                  {template.heading.slice(0, 26)}…
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Audience"
                hint={`${audienceReach} guest(s) reachable · ${optedOut} opted out and excluded`}
              >
                <Select value={audience} onChange={(event) => setAudience(event.target.value)}>
                  {SEGMENTS.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.label} — {audienceSize(state.guests, segment.id)} guests
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Coupon attached" hint="Shown in the message and redeemable at the table.">
                <Select value={coupon} onChange={(event) => setCoupon(event.target.value)}>
                  <option value="">No coupon</option>
                  {Object.values(COUPONS).map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.code} — {entry.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Campaign heading" required>
              <Input
                value={heading}
                onChange={(event) => setHeading(event.target.value)}
                placeholder="We miss you! Flat 20% Off"
              />
            </Field>

            <Field label="Message body" required hint="Keep it under about 140 characters for a clean push preview.">
              <Textarea
                rows={3}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Enjoy flat 20% off your favourite Paneer Butter Masala this weekend!"
              />
            </Field>

            <Tabs
              value={scheduleMode}
              onChange={setScheduleMode}
              size="sm"
              tabs={[
                { id: 'now', label: 'Send now' },
                { id: 'later', label: 'Schedule for later' },
              ]}
            />

            {scheduleMode === 'later' ? (
              <Field label="Send at" hint="Picked up by the scheduler when the time arrives.">
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(event) => setScheduleAt(event.target.value)}
                />
              </Field>
            ) : (
              <InlineNote tone="emerald" icon={Send}>
                {os.granted
                  ? 'Sending now raises a real system notification on every connected device, slides the banner down on every open guest screen, and starts the delivery simulation on the ROI dashboard.'
                  : 'Sending now slides the banner down on every open guest screen and starts the delivery simulation. Enable system notifications above to also reach the device.'}
              </InlineNote>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader size="sm" title="Guest preview" icon={Phone} />
            <CardBody>
              <div className="mx-auto max-w-[260px] rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
                <div className="rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[9px] font-semibold text-white">
                      B
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                      {channel === 'whatsapp' ? 'WhatsApp · Beno' : 'Web Push · Beno'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold leading-snug text-zinc-900">
                    {heading || 'Your heading appears here'}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                    {body || 'Your message body appears here.'}
                  </p>
                  {coupon ? (
                    <span className="tnum mt-1.5 inline-flex items-center gap-1 rounded border border-dashed border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                      <Tag size={8} strokeWidth={2.2} />
                      {coupon}
                    </span>
                  ) : null}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              size="sm"
              icon={Users}
              title="Audience sample"
              subtitle={`${audienceReach} guest(s) reachable in "${audienceLabel}"`}
            />
            <ul className="divide-y divide-zinc-200">
              {audienceSample.length === 0 ? (
                <li className="px-4 py-3 text-[11px] text-zinc-500">
                  No guests in this segment yet.
                </li>
              ) : (
                audienceSample.map((guest) => (
                  <li key={guest.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-900">{guest.name}</p>
                      <p className="tnum truncate text-[10px] text-zinc-500">{guest.phone}</p>
                    </div>
                    <span className="tnum shrink-0 text-[11px] text-zinc-500">
                      {money(guest.totalSpend, 0)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader size="sm" icon={CalendarClock} title="Scheduled" />
            <ul className="divide-y divide-zinc-200">
              {state.campaigns.filter((campaign) => campaign.status === 'scheduled').length === 0 ? (
                <li className="px-4 py-3 text-[11px] text-zinc-500">
                  Nothing queued. Schedule a broadcast to appear here.
                </li>
              ) : (
                state.campaigns
                  .filter((campaign) => campaign.status === 'scheduled')
                  .map((campaign) => (
                    <li key={campaign.id} className="px-4 py-2.5">
                      <p className="text-xs font-medium text-zinc-900">{campaign.heading}</p>
                      <p className="tnum text-[10px] text-zinc-500">
                        {campaign.scheduleAt
                          ? new Date(campaign.scheduleAt).toLocaleString('en-IN')
                          : '—'}
                      </p>
                    </li>
                  ))
              )}
            </ul>
          </Card>
        </div>
      </div>

      <CampaignStats campaigns={state.campaigns} />

      <Card>
        <CardHeader
          icon={ShieldCheck}
          title="Kept clean, on purpose"
          subtitle="An account that gets blocked is worth less than any campaign it sent."
        />
        <ul className="divide-y divide-zinc-200">
          {COMPLIANCE.map((rule) => (
            <li key={rule.title} className="flex items-start gap-3 px-5 py-3.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Check size={11} strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-900">{rule.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{rule.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200">
          <p className="max-w-xl text-[11px] leading-relaxed text-zinc-500">
            <span className="tnum font-semibold text-zinc-900">{optedOut}</span> of{' '}
            <span className="tnum font-semibold text-zinc-900">{state.guests.length}</span> guest
            records have opted out and are excluded from every audience above.
          </p>
          <Button as={Link} to="/store/guests" variant="secondary" size="sm">
            Review the guest book
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
