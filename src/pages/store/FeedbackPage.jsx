import { useState } from 'react'
import { MessageSquare, Star, ThumbsUp, TrendingUp } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ProgressBar,
  Tabs,
} from '../../components/ui'
import { KPIGrid, PageHeader } from '../../components/store/PageParts'
import { useNow } from '../../lib/ticker'
import { feedbackSummary } from '../../lib/selectors'
import { classNames, dateTimeLabel, pct, relativeDay } from '../../lib/format'

function Stars({ value, size = 13 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          strokeWidth={1.4}
          className={star <= value ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'}
        />
      ))}
    </span>
  )
}

export default function FeedbackPage() {
  const { state } = useStore()
  const now = useNow()
  const [filter, setFilter] = useState('all')

  const summary = feedbackSummary(state.feedback)
  const filtered = state.feedback
    .filter((entry) => {
      if (filter === 'all') return true
      if (filter === 'five') return entry.rating === 5
      if (filter === 'critical') return entry.rating <= 3
      if (filter === 'pills') return (entry.pills || []).length > 0
      return true
    })
    .sort((a, b) => b.at - a.at)

  const fiveStarShare = pct(summary.distribution.find((d) => d.star === 5)?.count || 0, summary.count, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Guest feedback"
        description="Reviews arrive the moment a table is settled. Ratings and pills roll up into the satisfaction score."
        badge={
          <Badge tone={summary.average >= 4 ? 'emerald' : 'amber'} size="md">
            {summary.average ? `${summary.average.toFixed(1)} ★ average` : 'No ratings yet'}
          </Badge>
        }
        actions={
          <Tabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { id: 'all', label: 'All', count: state.feedback.length },
              {
                id: 'five',
                label: '5 star',
                count: state.feedback.filter((entry) => entry.rating === 5).length,
              },
              {
                id: 'critical',
                label: 'Needs attention',
                count: state.feedback.filter((entry) => entry.rating <= 3).length,
              },
              {
                id: 'pills',
                label: 'Tagged',
                count: state.feedback.filter((entry) => (entry.pills || []).length > 0).length,
              },
            ]}
          />
        }
      />

      <KPIGrid
        columns={4}
        items={[
          {
            label: 'Average rating',
            value: summary.average ? `${summary.average.toFixed(2)} ★` : '—',
            hint: `${summary.count} review(s)`,
            icon: Star,
            tone: 'amber',
          },
          {
            label: '5 star share',
            value: `${fiveStarShare}%`,
            hint: 'of all reviews',
            icon: TrendingUp,
            tone: 'emerald',
          },
          {
            label: 'Tagged praise',
            value: summary.pills.reduce((sum, pill) => sum + pill.count, 0),
            hint: `${summary.pills.length} distinct themes`,
            icon: ThumbsUp,
            tone: 'indigo',
          },
          {
            label: 'Needs attention',
            value: state.feedback.filter((entry) => entry.rating <= 3).length,
            hint: '3 stars or below',
            icon: MessageSquare,
            tone: 'rose',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader size="sm" title="Rating distribution" icon={Star} />
          <CardBody className="space-y-2.5">
            {summary.distribution.map((entry) => (
              <div key={entry.star}>
                <div className="flex items-center justify-between gap-3">
                  <span className="tnum flex items-center gap-1.5 text-xs text-zinc-600">
                    {entry.star}
                    <Star size={10} strokeWidth={1.4} className="fill-amber-500 text-amber-500" />
                  </span>
                  <span className="tnum text-xs text-zinc-500">
                    {entry.count} · {entry.percent}%
                  </span>
                </div>
                <ProgressBar
                  className="mt-1"
                  value={entry.count}
                  max={summary.count || 1}
                  tone={entry.star >= 4 ? 'emerald' : entry.star === 3 ? 'amber' : 'rose'}
                />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            size="sm"
            title="What guests mention"
            icon={ThumbsUp}
            subtitle="One-tap pills chosen at the table."
          />
          <CardBody className="space-y-3">
            {summary.pills.length === 0 ? (
              <p className="text-xs text-zinc-500">No pills selected yet.</p>
            ) : (
              summary.pills.map((pill) => (
                <div key={pill.label}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-zinc-700">{pill.label}</span>
                    <span className="tnum text-xs text-zinc-500">
                      {pill.count} mention(s) · {pill.percent}%
                    </span>
                  </div>
                  <ProgressBar className="mt-1" value={pill.count} max={summary.count || 1} tone="indigo" />
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={MessageSquare}
          title="Live review feed"
          subtitle="Newest first, straight from the guest screens."
        />
        {filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews in this filter"
            description="Settle a bill from the register and the guest is invited to rate the visit."
          />
        ) : (
          <ul className="divide-y divide-zinc-200">
            {filtered.map((entry) => (
              <li key={entry.id} className="flex gap-4 px-5 py-4">
                <span
                  className={classNames(
                    'tnum flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-sm font-semibold',
                    entry.rating >= 4
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : entry.rating === 3
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700',
                  )}
                >
                  {entry.rating}.0
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900">{entry.guestName}</span>
                    <Stars value={entry.rating} />
                    {entry.tableId ? (
                      <Badge tone="zinc" size="sm" mono>
                        {entry.tableId}
                      </Badge>
                    ) : null}
                    {entry.invoiceId ? (
                      <Badge tone="zinc" size="sm" mono>
                        {entry.invoiceId}
                      </Badge>
                    ) : null}
                  </div>
                  {entry.comment ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-700">{entry.comment}</p>
                  ) : (
                    <p className="mt-1.5 text-xs italic text-zinc-400">No comment left.</p>
                  )}
                  {entry.pills?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {entry.pills.map((pill) => (
                        <Badge key={pill} tone="emerald" size="sm">
                          {pill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-2 text-[10px] text-zinc-400">
                    {dateTimeLabel(entry.at)} · {relativeDay(entry.at, now)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
