import { StatKPI } from '../ui'
import { classNames } from '../../lib/format'

export function PageHeader({ title, description, actions, className, badge }) {
  return (
    <div className={classNames('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function KPIGrid({ items, columns = 4, className }) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
  }[columns]
  return (
    <div className={classNames('grid grid-cols-1 gap-3', cols, className)}>
      {items.map((item) => (
        <StatKPI key={item.label} {...item} />
      ))}
    </div>
  )
}

export function Toolbar({ children, className }) {
  return (
    <div
      className={classNames(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function DataRow({ label, value, mono = true, tone, className }) {
  return (
    <div className={classNames('flex items-baseline justify-between gap-4 text-xs', className)}>
      <span className="text-zinc-500">{label}</span>
      <span
        className={classNames(
          'font-medium',
          mono && 'tnum',
          tone === 'emerald' && 'text-emerald-700',
          tone === 'rose' && 'text-rose-700',
          tone === 'amber' && 'text-amber-700',
          !tone && 'text-zinc-900',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function StatusStrip({ items, className }) {
  return (
    <div
      className={classNames(
        'grid grid-cols-2 divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            {item.label}
          </p>
          <p className="tnum mt-1 text-base font-semibold text-zinc-900">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-[11px] text-zinc-400">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
