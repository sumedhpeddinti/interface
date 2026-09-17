import { classNames } from '../../lib/format'

export function Card({ className, children, padded = false, as: Component = 'div', ...rest }) {
  return (
    <Component
      className={classNames(
        'rounded-lg border border-zinc-200 bg-white',
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function CardHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
  className,
  size = 'md',
  children,
}) {
  return (
    <div
      className={classNames(
        'flex items-start justify-between gap-4 border-b border-zinc-200',
        size === 'sm' ? 'px-4 py-3' : 'px-5 py-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon ? (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500">
            <Icon size={14} strokeWidth={1.75} />
          </span>
        ) : null}
        <div className="min-w-0">
          {title ? (
            <h2 className="truncate text-sm font-semibold text-zinc-900">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{subtitle}</p>
          ) : null}
          {children}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className, children, padded = true, ...rest }) {
  return (
    <div className={classNames(padded && 'p-5', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children }) {
  return (
    <div
      className={classNames(
        'flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/60 px-5 py-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Divider({ className, label }) {
  if (label) {
    return (
      <div className={classNames('flex items-center gap-3', className)}>
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>
    )
  }
  return <div className={classNames('h-px w-full bg-zinc-200', className)} />
}

export function SectionTitle({ children, hint, className, actions }) {
  return (
    <div className={classNames('flex items-end justify-between gap-4', className)}>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {children}
        </h3>
        {hint ? <p className="mt-0.5 text-xs text-zinc-400">{hint}</p> : null}
      </div>
      {actions}
    </div>
  )
}
