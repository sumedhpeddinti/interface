import { useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Banknote, LockKeyhole, Printer, Unlock } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Textarea } from '../ui'
import { DataRow } from './PageParts'
import { classNames, money } from '../../lib/format'

export function OpenShiftModal({ open, onClose, onOpen, suggestedFloat = 5000 }) {
  const [amount, setAmount] = useState(String(suggestedFloat))
  useEffect(() => {
    if (open) setAmount(String(suggestedFloat))
  }, [open, suggestedFloat])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start a new shift"
      subtitle="Count the float in the drawer before the first guest is served."
      icon={Unlock}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onOpen?.(Number(amount) || 0)
              onClose?.()
            }}
          >
            Open shift
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Opening cash float (₹)" hint="Physical cash placed in the drawer, including coins.">
          <Input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus
          />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {[2000, 3000, 5000, 8000, 10000].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(String(value))}
              className="tnum h-7 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:bg-zinc-50"
            >
              {money(value, 0)}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function CashMovementModal({ open, onClose, onSubmit, txnType }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const inbound = txnType === 'in'

  useEffect(() => {
    if (open) {
      setAmount('')
      setReason('')
    }
  }, [open])

  const presets = inbound
    ? ['Tips pool deposit', 'Float top-up', 'Change from owner']
    : ['Milk and curd', 'Ice and lemons', 'Gas cylinder', 'Staff lunch', 'Cab fare']

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={inbound ? 'Cash in' : 'Cash out'}
      subtitle={
        inbound
          ? 'Money entering the drawer outside of a bill settlement.'
          : 'Petty cash leaving the drawer — logged against the shift.'
      }
      icon={inbound ? ArrowDownCircle : ArrowUpCircle}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!Number(amount)}
            onClick={() => {
              onSubmit?.({
                txnType: inbound ? 'in' : 'out',
                amount: Number(amount),
                reason: reason.trim() || (inbound ? 'Cash in' : 'Cash out'),
              })
              onClose?.()
            }}
          >
            Record {inbound ? 'cash in' : 'cash out'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Amount (₹)">
          <Input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </Field>
        <Field label="Reason" hint="Appears in the shift ledger and the closing report.">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={inbound ? 'Tips pool deposit' : 'Milk and curd'}
          />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function CloseShiftModal({ open, onClose, summary, onConfirm }) {
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setCounted(summary ? String(summary.expectedCash) : '')
      setNotes('')
    }
  }, [open, summary?.expectedCash])

  const variance = Math.round(((Number(counted) || 0) - (summary?.expectedCash || 0)) * 100) / 100
  const balanced = Math.abs(variance) < 0.01

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close shift & reconcile"
      subtitle="Count the drawer, record the variance and export the closing summary."
      icon={LockKeyhole}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm?.({ countedCash: Number(counted) || 0, notes })}
          >
            <Printer size={13} strokeWidth={1.9} />
            Close shift & export
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Shift {summary?.shift?.id}
          </p>
          <div className="mt-2 space-y-2">
            <DataRow label="Opening float" value={money(summary?.openingFloat)} />
            <DataRow label="Cash sales" value={money(summary?.cashSales)} />
            <DataRow label="Cash in" value={money(summary?.cashIn)} />
            <DataRow label="Cash out" value={`−${money(summary?.cashOut)}`} tone="rose" />
            <div className="border-t border-zinc-200 pt-2">
              <DataRow label="Expected in drawer" value={money(summary?.expectedCash)} />
            </div>
          </div>
        </div>

        <Field label="Actual cash counted (₹)" hint="Notes and coins counted at the end of service.">
          <Input
            type="number"
            value={counted}
            onChange={(event) => setCounted(event.target.value)}
            autoFocus
          />
        </Field>

        <div
          className={classNames(
            'flex items-center justify-between gap-3 rounded-md border px-3 py-3',
            balanced
              ? 'border-emerald-200 bg-emerald-50'
              : variance > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-rose-200 bg-rose-50',
          )}
        >
          <span className="text-xs font-medium text-zinc-700">
            {balanced ? 'Drawer balances exactly' : variance > 0 ? 'Over by' : 'Short by'}
          </span>
          <span className="flex items-center gap-2">
            <span className="tnum text-base font-semibold text-zinc-900">
              {money(Math.abs(variance))}
            </span>
            <Badge tone={balanced ? 'emerald' : variance > 0 ? 'amber' : 'rose'} size="sm">
              {balanced ? 'Balanced' : variance > 0 ? 'Overage' : 'Shortage'}
            </Badge>
          </span>
        </div>

        <Field label="Closing notes" hint="Explain any variance for the owner's report.">
          <Textarea
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. ₹50 over — rounded up change returns across two bills."
          />
        </Field>

        <p className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500">
          <Banknote size={13} strokeWidth={1.9} className="mt-px shrink-0" />
          Closing archives the shift, locks the drawer and prints a reconciliation summary you can
          file with the day&apos;s invoices.
        </p>
      </div>
    </Modal>
  )
}
