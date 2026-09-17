import { forwardRef } from 'react'
import { classNames } from '../../lib/format'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40'

const VARIANTS = {
  /** Matte charcoal — the primary action across the whole suite. */
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950',
  secondary:
    'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100',
  ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  subtle: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
  danger: 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50',
  dangerSolid: 'bg-rose-600 text-white hover:bg-rose-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  successSoft: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100',
  /** Medusa signature muted indigo. */
  accent: 'bg-indigo-700 text-white hover:bg-indigo-800',
  link: 'bg-transparent text-zinc-900 underline underline-offset-2 hover:text-zinc-600 px-0',
}

const SIZES = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
  xl: 'h-12 px-6 text-base',
}

export const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'secondary',
    size = 'md',
    block = false,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  const isNative = Component === 'button'
  return (
    <Component
      ref={ref}
      {...(isNative ? { type: type || 'button' } : {})}
      className={classNames(
        BASE,
        VARIANTS[variant] || VARIANTS.secondary,
        SIZES[size] || SIZES.md,
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  )
})

export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', className, iconSize, ...rest },
  ref,
) {
  const box = { xs: 'h-6 w-6', sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-9 w-9' }[size] || 'h-8 w-8'
  const glyph = iconSize || { xs: 13, sm: 14, md: 15, lg: 17 }[size] || 15
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={classNames(
        'inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15 disabled:opacity-40',
        VARIANTS[variant] || VARIANTS.ghost,
        box,
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon size={glyph} strokeWidth={1.75} /> : null}
    </button>
  )
})

/** A row of buttons that visually weld together. */
export function ButtonGroup({ children, className }) {
  return (
    <div
      className={classNames(
        'inline-flex items-center divide-x divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white',
        className,
      )}
    >
      {children}
    </div>
  )
}
