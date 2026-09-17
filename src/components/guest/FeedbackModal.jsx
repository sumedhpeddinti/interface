import { useEffect, useState } from 'react'
import { BadgeCheck, Star } from 'lucide-react'
import { Badge, Button, Modal, Textarea } from '../ui'
import { classNames, money } from '../../lib/format'

const PILLS = ['Delicious Food', 'Fast Service', 'Friendly Staff', 'Clean Environment']

export function FeedbackModal({
  open,
  onClose,
  tableId,
  guestName,
  invoiceId,
  total,
  onSubmit,
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [pills, setPills] = useState([])
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) {
      setRating(0)
      setHover(0)
      setPills([])
      setComment('')
      setSubmitted(false)
    }
  }, [open])

  function togglePill(pill) {
    setPills((current) =>
      current.includes(pill) ? current.filter((entry) => entry !== pill) : [...current, pill],
    )
  }

  if (submitted) {
    return (
      <Modal open={open} onClose={onClose} hideHeader size="sm">
        <div className="py-4 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
            <BadgeCheck size={20} strokeWidth={1.9} />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-zinc-900">Thank you, {guestName}!</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Your feedback is on the manager&apos;s board. We hope to see you at Beno again
            soon.
          </p>
          <div className="mt-4">
            <Button variant="primary" block onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="This bill has been settled. Thank you!"
      subtitle={`${tableId} · ${invoiceId || 'Paid at the counter'}`}
      icon={BadgeCheck}
      size="sm"
    >
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-emerald-800">Amount settled</span>
          <span className="tnum text-sm font-semibold text-emerald-800">{money(total || 0)}</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
          Your GST invoice has been issued and the table is now free. We hope you enjoyed the meal.
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-zinc-900">How was your experience?</p>
        <div className="mt-2 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= (hover || rating)
            return (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
                className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15"
              >
                <Star
                  size={26}
                  strokeWidth={1.5}
                  className={filled ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'}
                />
              </button>
            )
          })}
          <span className="tnum ml-1 text-xs text-zinc-500">
            {rating ? `${rating}.0` : 'Tap to rate'}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-zinc-900">What stood out?</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PILLS.map((pill) => {
            const active = pills.includes(pill)
            return (
              <button
                key={pill}
                type="button"
                aria-pressed={active}
                onClick={() => togglePill(pill)}
                className={classNames(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
                )}
              >
                {pill}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <Textarea
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Tell us more (optional) — what did you love, what can we fix?"
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Badge tone="zinc" size="sm">
          {guestName}
        </Badge>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Skip
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!rating}
            onClick={() => {
              onSubmit?.({ rating, pills, comment })
              setSubmitted(true)
            }}
          >
            Submit review
          </Button>
        </div>
      </div>
    </Modal>
  )
}
