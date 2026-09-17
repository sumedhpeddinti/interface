import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { classNames, money, pct } from '../../lib/format'

export function StatKPI({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  deltaLabel,
  tone = 'zinc',
  className,
  mono = true,
}) {
  const positive = typeof delta === 'number' ? delta >= 0 : null
  const accents = {
    zinc: 'text-zinc-500',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    indigo: 'text-indigo-600',
  }
  return (
    <div className={classNames('rounded-lg border border-zinc-200 bg-white p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        {Icon ? <Icon size={15} strokeWidth={1.75} className={accents[tone] || accents.zinc} /> : null}
      </div>
      <div className={classNames('mt-2 text-xl font-semibold text-zinc-900', mono && 'tnum')}>
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {positive !== null ? (
          <span
            className={classNames(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              positive ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            {positive ? (
              <ArrowUpRight size={12} strokeWidth={2.2} />
            ) : (
              <ArrowDownRight size={12} strokeWidth={2.2} />
            )}
            {Math.abs(delta)}
            {deltaLabel || '%'}
          </span>
        ) : null}
        {hint ? <span className="truncate text-xs text-zinc-400">{hint}</span> : null}
      </div>
    </div>
  )
}

/** Pure-CSS bar chart — no chart library, no gradients, hairline baseline. */
export function BarChart({ data, height = 120, formatValue = (v) => money(v, 0), className }) {
  const max = Math.max(1, ...data.map((entry) => entry.value))
  return (
    <div className={classNames('w-full', className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((entry) => {
          const ratio = entry.value / max
          return (
            <div key={entry.label} className="group flex h-full flex-1 flex-col justify-end">
              <div
                title={`${entry.label} · ${formatValue(entry.value)}`}
                className={classNames(
                  'w-full rounded-t-[3px] transition-colors',
                  entry.value > 0 ? 'bg-zinc-800 group-hover:bg-zinc-600' : 'bg-zinc-100',
                )}
                style={{ height: `${Math.max(entry.value > 0 ? 3 : 1, ratio * 100)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-zinc-200 pt-2">
        {data.map((entry) => (
          <div key={entry.label} className="flex-1 text-center text-[10px] text-zinc-400">
            {entry.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProgressBar({ value, max = 100, tone = 'zinc', className, height = 'h-1.5' }) {
  const percent = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))
  const tones = {
    zinc: 'bg-zinc-800',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-600',
    indigo: 'bg-indigo-600',
  }
  return (
    <div className={classNames('w-full overflow-hidden rounded-full bg-zinc-100', height, className)}>
      <div
        className={classNames('h-full rounded-full transition-all duration-500', tones[tone] || tones.zinc)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export function StackedBar({ segments, className }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  return (
    <div className={classNames('flex h-2 w-full overflow-hidden rounded-full bg-zinc-100', className)}>
      {segments.map((segment) => (
        <div
          key={segment.label}
          title={`${segment.label} · ${pct(segment.value, total, 1)}%`}
          className={segment.className}
          style={{ width: `${(segment.value / total) * 100}%` }}
        />
      ))}
    </div>
  )
}

export function KeyValue({ label, value, mono = true, className, tone }) {
  return (
    <div className={classNames('flex items-baseline justify-between gap-4', className)}>
      <span className="text-xs text-zinc-500">{label}</span>
      <span
        className={classNames(
          'text-sm font-medium',
          mono && 'tnum',
          tone === 'emerald' && 'text-emerald-700',
          tone === 'rose' && 'text-rose-700',
          tone === 'muted' && 'text-zinc-500',
          !tone && 'text-zinc-900',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function Rating({ value, count, size = 12, className }) {
  return (
    <span className={classNames('inline-flex items-center gap-1', className)}>
      <svg viewBox="0 0 24 24" width={size} height={size} className="fill-amber-500" aria-hidden="true">
        <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
      </svg>
      <span className="tnum text-xs font-medium text-zinc-700">{value?.toFixed?.(1) ?? value}</span>
      {count !== undefined ? <span className="text-xs text-zinc-400">({count})</span> : null}
    </span>
  )
}
