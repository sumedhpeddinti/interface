import { useEffect, useRef, useState } from 'react'
import { ChevronDown, QrCode } from 'lucide-react'
import { classNames } from '../../lib/format'

/** Table selector that lives in the guest header, right next to the café name.

 *  Scanning a physical QR code is what a real guest does; this is the same
 *  jump made by hand, so a demo can walk the whole floor without a phone.
 *  It reads as a quiet chip, and opens a grid of the twelve tables. */

export function TableSwitcher({ tables = [], tableId, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Table ${tableId} — switch table`}
        className={classNames(
          'flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition-colors',
          open
            ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
        )}
      >
        <QrCode size={11} strokeWidth={2} className="text-zinc-400" />
        <span className="tnum font-semibold text-zinc-900">{tableId}</span>
        <ChevronDown
          size={11}
          strokeWidth={2.4}
          className={classNames('text-zinc-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Switch table"
          className="absolute left-0 top-8 z-50 w-64 rounded-lg border border-zinc-200 bg-white p-2"
        >
          <p className="px-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Scan target
          </p>
          <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
            {tables.map((table) => {
              const active = table.id === tableId
              return (
                <button
                  key={table.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange?.(table.id)
                    setOpen(false)
                  }}
                  className={classNames(
                    'flex flex-col items-start rounded-md border px-2 py-1.5 text-left transition-colors',
                    active
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-transparent hover:bg-zinc-100',
                  )}
                >
                  <span className="tnum text-xs font-semibold leading-tight">{table.id}</span>
                  <span
                    className={classNames(
                      'truncate text-[9px] leading-tight',
                      active ? 'text-zinc-300' : 'text-zinc-400',
                    )}
                  >
                    {table.section} · {table.seats}p
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 border-t border-zinc-200 px-1.5 pt-1.5 text-[10px] leading-relaxed text-zinc-400">
            Scanning the table's QR code opens the same table.
          </p>
        </div>
      ) : null}
    </div>
  )
}
