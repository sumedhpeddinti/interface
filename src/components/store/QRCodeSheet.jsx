import { Badge, Button } from '../ui'
import { ChevronDown, Download, Printer } from 'lucide-react'
import { classNames } from '../../lib/format'

/* Six QR cards fit on a sheet of A4 (2 columns x 3 rows). Print, cut along the
   dashed lines and stick one on each table. */

export function QrCard({ card, className, compact = false, tagline }) {
  return (
    <div
      className={classNames(
        'flex flex-col items-center rounded-md border border-zinc-200 bg-white p-4',
        className,
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-zinc-900">
            Beno
          </p>
          <p className="truncate text-[9px] text-zinc-500">{card.subtitle}</p>
        </div>
        <Badge tone={card.statusTone || 'emerald'} size="sm" dot>
          {card.status || 'Active'}
        </Badge>
      </div>

      <div
        className={classNames(
          'mt-3 flex items-center justify-center rounded border border-zinc-200 bg-white p-1.5',
          compact ? 'h-24 w-24' : 'h-32 w-32',
        )}
      >
        {card.svg ? (
          <span
            className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: card.svg }}
          />
        ) : (
          <span className="text-[10px] text-zinc-400">generating…</span>
        )}
      </div>

      <p className="tnum mt-3 text-lg font-semibold leading-none text-zinc-900">{card.label}</p>
      <p className="mt-1 text-[10px] font-medium text-zinc-600">{card.action}</p>
      {tagline ? (
        <p className="mt-2 border-t border-dashed border-zinc-200 pt-2 text-center text-[9px] tracking-wide text-zinc-400">
          {tagline}
        </p>
      ) : null}
      <p className="tnum mt-2 text-[9px] tracking-wide text-zinc-300">{card.hash}</p>
    </div>
  )
}

export function QRCodeSheet({
  cards,
  sheetNumber,
  sheetCount,
  onSheetChange,
  onDownloadAll,
  onPrint,
  onDownloadCard,
  title = 'Table menu QR cards',
  tagline,
  className,
}) {
  return (
    <div className={className}>
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-[11px] text-zinc-500">
            Six cards fit on a sheet of A4. Print, cut, and stick one on each table.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sheetCount > 1 ? (
            <div className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white p-0.5">
              {Array.from({ length: sheetCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSheetChange?.(index)}
                  className={classNames(
                    'h-7 rounded-[5px] px-2.5 text-xs font-medium transition-colors',
                    index === sheetNumber
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100',
                  )}
                >
                  Sheet {index + 1}
                </button>
              ))}
            </div>
          ) : null}
          <Button size="sm" variant="secondary" onClick={onDownloadAll}>
            <Download size={13} strokeWidth={1.9} />
            Download all SVGs
          </Button>
          <Button size="sm" variant="primary" onClick={onPrint}>
            <Printer size={13} strokeWidth={1.9} />
            Print all cards (A4 grid)
          </Button>
        </div>
      </div>

      <div
        id="print-area"
        className="grid grid-cols-2 gap-4 bg-white p-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-2 lg:gap-6 lg:p-6"
      >
        {cards.map((card) => (
          <div key={card.id} className="print-break-avoid">
            <QrCard card={card} tagline={tagline} />
            <button
              type="button"
              onClick={() => onDownloadCard?.(card)}
              className="no-print mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white py-1 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              <Download size={10} strokeWidth={2} />
              Download {card.label} SVG
            </button>
          </div>
        ))}
      </div>

      <p className="no-print flex items-center gap-1.5 border-t border-zinc-200 px-4 py-2.5 text-[11px] text-zinc-400">
        <ChevronDown size={12} strokeWidth={2} />
        Cards are registered as {cards.length} of {sheetCount * 6} total positions across{' '}
        {sheetCount} sheet(s) of A4.
      </p>
    </div>
  )
}
