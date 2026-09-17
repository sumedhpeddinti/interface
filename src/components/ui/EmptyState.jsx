import { classNames } from '../../lib/format'

export function EmptyState({ icon: Icon, title, description, action, className, compact = false }) {
  return (
    <div
      className={classNames(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-8' : 'py-14',
        className,
      )}
    >
      {Icon ? (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400">
          <Icon size={18} strokeWidth={1.6} />
        </span>
      ) : null}
      <h3 className="mt-3 text-sm font-semibold text-zinc-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function InlineNote({ icon: Icon, tone = 'zinc', children, className }) {
  const tones = {
    zinc: 'border-zinc-200 bg-zinc-50 text-zinc-600',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  }
  return (
    <div
      className={classNames(
        'flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-xs leading-relaxed',
        tones[tone] || tones.zinc,
        className,
      )}
    >
      {Icon ? <Icon size={14} strokeWidth={1.9} className="mt-px shrink-0" /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
