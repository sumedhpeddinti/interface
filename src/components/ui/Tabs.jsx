import { classNames } from '../../lib/format'

/** Segmented control — the default filter switch in the POS suite. */
export function Tabs({ tabs, value, onChange, size = 'md', className, full = false }) {
  return (
    <div
      role="tablist"
      className={classNames(
        'inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5',
        full && 'w-full',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        const height = size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-xs'
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={classNames(
              'inline-flex items-center justify-center gap-1.5 rounded-[5px] font-medium transition-colors duration-150',
              height,
              full && 'flex-1',
              active
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
            )}
          >
            {tab.icon ? <tab.icon size={13} strokeWidth={1.9} /> : null}
            {tab.label}
            {tab.count !== undefined && tab.count !== null ? (
              <span
                className={classNames(
                  'tnum rounded-full px-1.5 py-px text-[10px] font-semibold',
                  active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Horizontally scrollable pills — the guest category bar. */
export function PillTabs({ tabs, value, onChange, className }) {
  return (
    <div className={classNames('no-scrollbar flex gap-2 overflow-x-auto', className)}>
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange?.(tab.id)}
            className={classNames(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors duration-150',
              active
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
            )}
          >
            {tab.icon ? <tab.icon size={13} strokeWidth={1.9} /> : null}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/** Underline tabs — used for dense panel switching inside a card. */
export function UnderlineTabs({ tabs, value, onChange, className }) {
  return (
    <div className={classNames('flex items-center gap-5 border-b border-zinc-200', className)}>
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            aria-selected={active}
            role="tab"
            onClick={() => onChange?.(tab.id)}
            className={classNames(
              '-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-xs font-medium transition-colors',
              active
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700',
            )}
          >
            {tab.icon ? <tab.icon size={14} strokeWidth={1.8} /> : null}
            {tab.label}
            {tab.count !== undefined ? (
              <span className="tnum rounded-full bg-zinc-100 px-1.5 py-px text-[10px] font-semibold text-zinc-600">
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
