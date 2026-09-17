import { Printer, ReceiptText } from 'lucide-react'
import { Button, Modal } from '../ui'
import { classNames, dateTimeLabel, money } from '../../lib/format'
import { printPage } from '../../lib/qr'

/* 80mm thermal receipt. The panel is marked as the print area, so the print
   stylesheet isolates it and hides the rest of the application. */

function Row({ label, value, bold, mono = true, className }) {
  return (
    <div className={classNames('flex items-baseline justify-between gap-2', className)}>
      <span className={classNames('text-[11px]', bold ? 'font-semibold' : 'text-zinc-600')}>
        {label}
      </span>
      <span
        className={classNames(
          'text-[11px]',
          mono && 'tnum',
          bold ? 'font-semibold text-zinc-900' : 'text-zinc-900',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function ThermalInvoice({ open, onClose, invoice, restaurant }) {
  if (!invoice) return null
  const totals = invoice.totals || {}
  const grouped = (invoice.lines || []).reduce((groups, line) => {
    const key = line.round || 1
    groups[key] = groups[key] || []
    groups[key].push(line)
    return groups
  }, {})

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invoice ${invoice.id}`}
      subtitle="80mm thermal format · ready for the receipt printer."
      icon={ReceiptText}
      size="md"
      printArea
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
          <Button variant="primary" size="sm" onClick={printPage}>
            <Printer size={13} strokeWidth={1.9} />
            Print receipt
          </Button>
        </>
      }
    >
      <div className="mx-auto w-[302px] rounded-sm border border-zinc-200 bg-white px-3 py-4 font-mono">
        <div className="text-center">
          <p className="text-[13px] font-bold uppercase tracking-wider text-zinc-900">
            {restaurant?.name || 'Ganesh Café'}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-600">
            {restaurant?.address}
          </p>
          <p className="text-[10px] text-zinc-600">
            GSTIN {restaurant?.gstin} · FSSAI {restaurant?.fssai}
          </p>
          <p className="text-[10px] text-zinc-600">
            {restaurant?.phone} · {restaurant?.upi}
          </p>
        </div>

        <div className="my-2.5 border-t border-dashed border-zinc-400" />

        <div className="space-y-0.5">
          <Row label="Invoice" value={invoice.id} bold />
          <Row label="Table" value={invoice.tableId} />
          <Row label="Date" value={dateTimeLabel(invoice.settledAt || invoice.createdAt)} />
          <Row label="Cashier" value={invoice.cashierName || '—'} />
          <Row label="Guest" value={invoice.guestName || 'Walk-in'} />
        </div>

        <div className="my-2.5 border-t border-dashed border-zinc-400" />

        {Object.entries(grouped).map(([round, lines]) => (
          <div key={round} className="mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Round {round}
            </p>
            {lines.map((line, index) => (
              <div key={`${line.id}-${index}`} className="mt-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-zinc-900">{line.name}</span>
                  <span className="tnum text-[11px] font-medium text-zinc-900">
                    {money(line.price * line.qty)}
                  </span>
                </div>
                <div className="tnum text-[10px] text-zinc-500">
                  {line.qty} × {money(line.price)}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="my-2.5 border-t border-dashed border-zinc-400" />

        <div className="space-y-0.5">
          <Row label="Subtotal" value={money(totals.subtotal)} />
          {totals.discountAmount > 0 ? (
            <Row
              label={`Discount ${totals.discount?.code || ''}`.trim()}
              value={`−${money(totals.discountAmount)}`}
            />
          ) : null}
          <Row label="Taxable value" value={money(totals.taxable)} />
          <Row label="CGST @ 2.5%" value={money(totals.cgst)} />
          <Row label="SGST @ 2.5%" value={money(totals.sgst)} />
        </div>

        <div className="my-2.5 border-t border-dashed border-zinc-400" />

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-bold text-zinc-900">TOTAL</span>
          <span className="tnum text-[13px] font-bold text-zinc-900">{money(totals.total)}</span>
        </div>

        <div className="mt-2 space-y-0.5">
          <Row label="Paid by" value={invoice.method} />
          <Row label="Tendered" value={money(invoice.tendered)} />
          <Row label="Change" value={money(invoice.change)} />
        </div>

        {invoice.portions?.length ? (
          <>
            <div className="my-2.5 border-t border-dashed border-zinc-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Split payment
            </p>
            {invoice.portions.map((portion) => (
              <Row
                key={portion.id || portion.label}
                label={`${portion.label || 'Portion'} · ${portion.method || 'Cash'}`}
                value={money(portion.amount)}
              />
            ))}
          </>
        ) : null}

        <div className="my-2.5 border-t border-dashed border-zinc-400" />

        <div className="text-center">
          <p className="text-[10px] leading-relaxed text-zinc-600">
            Prices are inclusive of applicable discounts. Taxes levied as per Indian GST law.
          </p>
          <p className="mt-1.5 text-[11px] font-semibold text-zinc-900">Thank you, visit again!</p>
          <p className="mt-1 text-[9px] text-zinc-500">
            Scan the table QR to order in a tap · {restaurant?.name}
          </p>
        </div>
      </div>
    </Modal>
  )
}
