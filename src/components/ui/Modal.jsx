import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { classNames } from '../../lib/format'
import { IconButton } from './Button'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  full: 'max-w-[min(1100px,94vw)]',
}

/**
 * A flat, hairline-bordered panel over a plain scrim.
 * @param {boolean} printArea marks this panel as the print target.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  footer,
  children,
  className,
  bodyClassName,
  closeOnScrim = true,
  printArea = false,
  hideHeader = false,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => panelRef.current?.focus(), 20)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      window.clearTimeout(timer)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 bg-zinc-900/25"
        onClick={closeOnScrim ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        id={printArea ? 'print-area' : undefined}
        className={classNames(
          'relative z-10 my-auto w-full rounded-lg border border-zinc-200 bg-white shadow-sm outline-none',
          SIZES[size] || SIZES.md,
          className,
        )}
      >
        {hideHeader ? null : (
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
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
              </div>
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} className="no-print" />
          </div>
        )}
        <div className={classNames('px-5 py-4', bodyClassName)}>{children}</div>
        {footer ? (
          <div className="no-print flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50/60 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Bottom sheet on mobile, right-hand slide-over on desktop. */
export function Drawer({ open, onClose, title, subtitle, footer, children, className }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/25" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Panel'}
        className={classNames(
          'relative z-10 flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-zinc-900">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="hairline-scroll flex-1 overflow-y-auto">{children}</div>
        {footer ? <div className="border-t border-zinc-200 bg-zinc-50/60 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      bodyClassName="pt-4"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm?.()
              onClose?.()
            }}
            className={classNames(
              'inline-flex h-9 items-center rounded-md px-3.5 text-sm font-medium text-white',
              tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-zinc-900 hover:bg-zinc-800',
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
    </Modal>
  )
}
