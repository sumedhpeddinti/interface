import {
  BadgeCheck,
  CalendarClock,
  Eye,
  Megaphone,
  Send,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ProgressBar,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../ui'
import { KPIGrid } from './PageParts'
import { campaignRates, campaignTotals } from '../../lib/selectors'
import { classNames, money, relativeDay } from '../../lib/format'
import { useNow } from '../../lib/ticker'

const CHANNEL_META = {
  whatsapp: { label: 'WhatsApp', tone: 'emerald' },
  push: { label: 'Web Push', tone: 'indigo' },
}

export function ChannelBadge({ channel, size = 'sm' }) {
  const meta = CHANNEL_META[channel] || CHANNEL_META.push
  return (
    <Badge tone={meta.tone} size={size}>
      {meta.label}
    </Badge>
  )
}

export function CampaignStats({ campaigns }) {
  const now = useNow()
  const totals = campaignTotals(campaigns)

  return (
    <div className="space-y-4">
      <KPIGrid
        columns={4}
        items={[
          {
            label: 'Messages sent',
            value: totals.sent.toLocaleString('en-IN'),
            hint: `${campaigns.length} campaign(s)`,
            icon: Send,
            tone: 'zinc',
          },
          {
            label: 'Opened',
            value: `${totals.opened.toLocaleString('en-IN')} · ${totals.openRate}%`,
            hint: 'read on the phone',
            icon: Eye,
            tone: 'indigo',
          },
          {
            label: 'Walk-ins',
            value: `${totals.walkIns.toLocaleString('en-IN')} · ${totals.walkInRate}%`,
            hint: 'guests who redeemed',
            icon: UserPlus,
            tone: 'amber',
          },
          {
            label: 'Attributed revenue',
            value: money(totals.revenue),
            hint: `${money(totals.sent ? totals.revenue / totals.sent : 0)} per message`,
            icon: TrendingUp,
            tone: 'emerald',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader size="sm" title="Open rate" icon={Eye} />
          <CardBody className="space-y-2">
            <p className="tnum text-2xl font-semibold text-zinc-900">{totals.openRate}%</p>
            <ProgressBar value={totals.openRate} tone="indigo" />
            <p className="text-[11px] text-zinc-500">
              {totals.opened.toLocaleString('en-IN')} of {totals.sent.toLocaleString('en-IN')}{' '}
              messages opened
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader size="sm" title="Redemption rate" icon={UserPlus} />
          <CardBody className="space-y-2">
            <p className="tnum text-2xl font-semibold text-zinc-900">{totals.walkInRate}%</p>
            <ProgressBar value={totals.walkInRate} tone="amber" />
            <p className="text-[11px] text-zinc-500">
              {totals.walkIns.toLocaleString('en-IN')} guests came in with a campaign code
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader size="sm" title="Revenue per message" icon={TrendingUp} />
          <CardBody className="space-y-2">
            <p className="tnum text-2xl font-semibold text-zinc-900">
              {money(totals.sent ? totals.revenue / totals.sent : 0)}
            </p>
            <ProgressBar
              value={Math.min(100, totals.sent ? (totals.revenue / totals.sent) * 2 : 0)}
              tone="emerald"
            />
            <p className="text-[11px] text-zinc-500">
              Average ticket on a redeemed voucher sits at {money(156.25)}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={Megaphone}
          title="Campaign performance"
          subtitle="Delivery, engagement and attributed revenue per broadcast."
        />
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Compose a broadcast above and the results appear here as they land."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Campaign</TH>
                  <TH>Channel</TH>
                  <TH>Audience</TH>
                  <TH align="right">Sent</TH>
                  <TH align="right">Opened</TH>
                  <TH align="right">Walk-ins</TH>
                  <TH align="right">Revenue</TH>
                  <TH>Status</TH>
                  <TH>Last run</TH>
                </TR>
              </THead>
              <TBody>
                {campaigns.map((campaign) => {
                  const rates = campaignRates(campaign)
                  return (
                    <TR key={campaign.id}>
                      <TD>
                        <span className="block text-xs font-medium text-zinc-900">
                          {campaign.name}
                        </span>
                        <span className="block text-[11px] text-zinc-500">
                          {campaign.heading}
                        </span>
                      </TD>
                      <TD>
                        <ChannelBadge channel={campaign.channel} />
                      </TD>
                      <TD>
                        <span className="block text-xs text-zinc-700">
                          {campaign.audienceLabel}
                        </span>
                        {campaign.coupon ? (
                          <span className="tnum block text-[10px] text-emerald-700">
                            {campaign.coupon}
                          </span>
                        ) : null}
                      </TD>
                      <TD align="right" mono>
                        {campaign.sent.toLocaleString('en-IN')}
                      </TD>
                      <TD align="right" mono>
                        {campaign.opened.toLocaleString('en-IN')}
                        <span className="ml-1 text-[10px] text-zinc-400">
                          {rates.openRate}%
                        </span>
                      </TD>
                      <TD align="right" mono>
                        {campaign.walkIns.toLocaleString('en-IN')}
                        <span className="ml-1 text-[10px] text-zinc-400">
                          {rates.walkInRate}%
                        </span>
                      </TD>
                      <TD align="right" mono className="font-semibold">
                        {money(campaign.revenue, 0)}
                      </TD>
                      <TD>
                        <Badge
                          tone={
                            campaign.status === 'completed'
                              ? 'emerald'
                              : campaign.status === 'sending'
                                ? 'amber'
                                : 'indigo'
                          }
                          size="sm"
                          dot
                          pulse={campaign.status === 'sending'}
                          icon={
                            campaign.status === 'scheduled' ? CalendarClock : BadgeCheck
                          }
                        >
                          {campaign.status === 'completed'
                            ? 'Completed'
                            : campaign.status === 'sending'
                              ? 'Delivering'
                              : 'Scheduled'}
                        </Badge>
                      </TD>
                      <TD>
                        <span className={classNames('text-[11px] text-zinc-600')}>
                          {campaign.sentAt
                            ? relativeDay(campaign.sentAt, now)
                            : campaign.scheduleAt
                              ? relativeDay(campaign.scheduleAt, now)
                              : '—'}
                        </span>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </div>
  )
}
