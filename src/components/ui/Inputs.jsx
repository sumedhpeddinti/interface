import { Search } from 'lucide-react'
import { classNames } from '../../lib/format'

const CONTROL =
  'w-full rounded-md border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-50 disabled:text-zinc-500'

export function Field({ label, hint, error, required, htmlFor, children, className }) {
  return (
    <div className={classNames('space-y-1.5', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-xs font-medium text-zinc-700"
        >
          {label}
          {required ? <span className="text-rose-600">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-400">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ className, invalid, ...rest }) {
  return (
    <input
      className={classNames(CONTROL, 'h-9 px-3', invalid && 'border-rose-300', className)}
      {...rest}
    />
  )
}

export function Textarea({ className, rows = 3, invalid, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={classNames(CONTROL, 'resize-y px-3 py-2 leading-relaxed', invalid && 'border-rose-300', className)}
      {...rest}
    />
  )
}

export function Select({ className, children, ...rest }) {
  return (
    <select
      className={classNames(
        CONTROL,
        'h-9 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat px-3 pr-9',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {children}
    </select>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className, ...rest }) {
  return (
    <div className={classNames('relative', className)}>
      <Search
        size={14}
        strokeWidth={2}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={classNames(CONTROL, 'h-9 pl-8 pr-3')}
        {...rest}
      />
    </div>
  )
}

export function Switch({ checked, onChange, label, hint, disabled, className }) {
  return (
    <label
      className={classNames(
        'flex items-start gap-3',
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={classNames(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15',
          checked ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300 bg-zinc-200',
        )}
      >
        <span
          className={classNames(
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-150',
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
          )}
        />
      </button>
      <span className="min-w-0">
        {label ? <span className="block text-sm font-medium text-zinc-900">{label}</span> : null}
        {hint ? <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span> : null}
      </span>
    </label>
  )
}

export function Checkbox({ checked, onChange, label, className, disabled }) {
  return (
    <label className={classNames('flex cursor-pointer items-center gap-2.5', disabled && 'opacity-50', className)}>
      <span
        onClick={() => !disabled && onChange?.(!checked)}
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault()
            if (!disabled) onChange?.(!checked)
          }
        }}
        className={classNames(
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          checked ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white',
        )}
      >
        {checked ? (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M2 6.2 4.6 8.8 10 3.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {label ? <span className="text-sm text-zinc-700">{label}</span> : null}
    </label>
  )
}

export function RadioGroup({ options, value, onChange, className }) {
  return (
    <div className={classNames('space-y-2', className)}>
      {options.map((option, index) => (
        <label
          /* An id-less option would otherwise collide with the next one. */
          key={option.id ?? option.label ?? index}
          className={classNames(
            'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
            value === option.id
              ? 'border-zinc-900 bg-zinc-50'
              : 'border-zinc-200 bg-white hover:border-zinc-300',
          )}
        >
          <input
            type="radio"
            className="mt-0.5 h-3.5 w-3.5 accent-zinc-900"
            checked={value === option.id}
            onChange={() => onChange?.(option.id)}
            name={option.id}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-zinc-900">{option.label}</span>
            {option.description ? (
              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                {option.description}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  )
}
