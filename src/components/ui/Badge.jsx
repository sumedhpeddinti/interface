import { classNames } from '../../lib/format'

/* Flat pill badges are the single status vocabulary of the suite. */

const TONES = {
  zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  solid: 'bg-zinc-900 text-white border-zinc-900',
}

const DOT_TONES = {
  zinc: 'bg-zinc-400',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  indigo: 'bg-indigo-500',
  solid: 'bg-white',
}

const SIZES = {
  sm: 'h-5 px-1.5 text-[10px] gap-1',
  md: 'h-6 px-2 text-[11px] gap-1.5',
  lg: 'h-7 px-2.5 text-xs gap-1.5',
}

export function Badge({
  tone = 'zinc',
  size = 'md',
  dot = false,
  pulse = false,
  mono = false,
  icon: Icon,
  className,
  children,
  ...rest
}) {
  return (
    <span
      className={classNames(
        'inline-flex shrink-0 items-center rounded-full border font-medium uppercase tracking-wide',
        TONES[tone] || TONES.zinc,
        SIZES[size] || SIZES.md,
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon size={11} strokeWidth={2} /> : null}
      {dot ? (
        <span
          className={classNames(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            DOT_TONES[tone] || DOT_TONES.zinc,
            pulse && 'animate-pulse',
          )}
        />
      ) : null}
      {mono ? <span className="tnum">{children}</span> : children}
    </span>
  )
}

export function Dot({ tone = 'zinc', pulse = false, className }) {
  return (
    <span
      className={classNames(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        DOT_TONES[tone] || DOT_TONES.zinc,
        pulse && 'animate-pulse',
        className,
      )}
    />
  )
}

/** Veg / non-veg marker, drawn the way Indian menus print it. */
export function VegMark({ isVeg = true, size = 'md' }) {
  const box = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const inner = size === 'sm' ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5'
  return (
    <span
      role="img"
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      className={classNames(
        'inline-flex shrink-0 items-center justify-center rounded-[3px] border bg-white',
        box,
        isVeg ? 'border-emerald-600' : 'border-rose-600',
      )}
    >
      {isVeg ? (
        <span className={classNames('rounded-full bg-emerald-600', inner)} />
      ) : (
        <span
          className={classNames('bg-rose-600', inner)}
          style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
        />
      )}
    </span>
  )
}
