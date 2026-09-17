import { useCallback, useEffect, useState } from 'react'
import { Delete, Lock, ShieldAlert } from 'lucide-react'
import { Badge, Button, Modal } from '../ui'
import { classNames } from '../../lib/format'

/* 4-digit staff authentication. The Manager PIN unlocks everything; other
   roles only reach the areas they are cleared for. */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function PinPad({ value, onChange, onComplete, length = 4, className, disabled }) {
  const push = useCallback(
    (digit) => {
      const next = (value + digit).slice(0, length)
      onChange(next)
      if (next.length === length) onComplete?.(next)
    },
    [value, onChange, onComplete, length],
  )

  useEffect(() => {
    const onKey = (event) => {
      if (disabled) return
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        push(event.key)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        onChange(value.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [push, onChange, value, disabled])

  return (
    <div className={classNames('select-none', className)}>
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length }).map((_, index) => (
          <span
            key={index}
            className={classNames(
              'flex h-11 w-11 items-center justify-center rounded-md border text-lg font-semibold',
              index < value.length
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-zinc-50 text-zinc-300',
            )}
          >
            {index < value.length ? '•' : ''}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-5 grid max-w-[260px] grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => push(key)}
            className="tnum flex h-12 items-center justify-center rounded-md border border-zinc-200 bg-white text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-40"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('')}
          className="flex h-12 items-center justify-center rounded-md border border-zinc-200 bg-white text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => push('0')}
          className="tnum flex h-12 items-center justify-center rounded-md border border-zinc-200 bg-white text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-40"
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(value.slice(0, -1))}
          aria-label="Backspace"
          className="flex h-12 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
        >
          <Delete size={17} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}

export function PinPadModal({
  open,
  onClose,
  onSuccess,
  staff,
  title = 'Manager authorisation',
  subtitle = 'Enter your 4-digit staff PIN to continue.',
  requiredRole = null,
  icon: Icon = Lock,
  allowCancel = true,
  children,
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setValue('')
      setError('')
    }
  }, [open])

  function verify(pin) {
    const match = (staff || []).find((member) => member.pin === pin && member.active !== false)
    if (!match) {
      setError('That PIN is not recognised.')
      window.setTimeout(() => setValue(''), 350)
      return
    }
    if (requiredRole && match.role !== requiredRole && match.role !== 'Manager') {
      setError(`${match.name} is a ${match.role}. This area needs ${requiredRole} access.`)
      window.setTimeout(() => setValue(''), 350)
      return
    }
    setError('')
    setValue('')
    onSuccess?.(match)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={Icon}
      size="sm"
      footer={
        allowCancel ? (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        ) : null
      }
    >
      {children}
      <PinPad value={value} onChange={setValue} onComplete={verify} />
      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <ShieldAlert size={14} strokeWidth={1.9} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
      <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Demo PINs
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(staff || []).map((member) => (
            <Badge key={member.id} tone="zinc" size="sm" mono>
              {member.role} {member.pin}
            </Badge>
          ))}
        </div>
      </div>
    </Modal>
  )
}

/** Full-viewport lock screen used when the whole suite is locked. */
export function LockScreen({ staff, onSuccess }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function verify(pin) {
    const match = (staff || []).find((member) => member.pin === pin && member.active !== false)
    if (!match) {
      setError('Incorrect PIN.')
      window.setTimeout(() => setValue(''), 350)
      return
    }
    setError('')
    onSuccess?.(match)
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-900 text-white">
            <Lock size={17} strokeWidth={1.9} />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-zinc-900">Register locked</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Enter a staff PIN to resume. Cashiers cannot open financial reports or settings without a
            manager PIN.
          </p>
        </div>
        <div className="mt-5">
          <PinPad value={value} onChange={setValue} onComplete={verify} />
        </div>
        {error ? (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {(staff || []).map((member) => (
            <Badge key={member.id} tone="zinc" size="sm" mono>
              {member.role} {member.pin}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Inline "you need a manager" panel for a route the current role cannot open. */
export function RestrictedPanel({ area, role, onUnlock, staff }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
          <ShieldAlert size={18} strokeWidth={1.9} />
        </span>
        <h2 className="mt-3 text-sm font-semibold text-zinc-900">Restricted area</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          The <span className="font-medium text-zinc-700">{role}</span> role does not have access to{' '}
          <span className="font-medium text-zinc-700">{area}</span>. A manager PIN is required to
          continue.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            <Lock size={13} strokeWidth={1.9} />
            Enter manager PIN
          </Button>
        </div>
        <PinPadModal
          open={open}
          onClose={() => setOpen(false)}
          staff={staff}
          requiredRole="Manager"
          title="Manager authorisation"
          subtitle={`Unlock ${area} for this session.`}
          onSuccess={(member) => {
            setOpen(false)
            onUnlock?.(member)
          }}
        />
      </div>
    </div>
  )
}
