import { Minus, Plus, Star } from 'lucide-react'
import { Badge, DishThumb, VegMark } from '../ui'
import { classNames, money } from '../../lib/format'

/** The + Add button morphs in place into [- qty +] once the dish is in the basket. */
export function DishCard({ item, qty = 0, onAdd, onIncrement, onDecrement, className }) {
  const inCart = qty > 0

  return (
    <div
      className={classNames(
        'flex gap-3 border-b border-zinc-200 px-4 py-4 last:border-b-0',
        className,
      )}
    >
      <DishThumb item={item} size={76} rounded="rounded-md" />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <VegMark isVeg={item.isVeg} />
          <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-zinc-900">
            {item.name}
          </h3>
          {item.isBestseller ? (
            <Badge tone="amber" size="sm">
              Bestseller
            </Badge>
          ) : null}
        </div>

        <p className="mt-1 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1.5 py-px">
            <Star size={10} strokeWidth={0} className="fill-amber-500" />
            <span className="tnum text-[11px] font-medium text-zinc-700">
              {item.rating?.toFixed?.(1) ?? '4.5'}
            </span>
          </span>
          <span className="text-[11px] text-zinc-400">{item.station}</span>
        </p>

        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {item.description}
        </p>

        <div className="mt-2.5 flex items-end justify-between gap-3">
          <span className="tnum text-sm font-semibold text-zinc-900">{money(item.price)}</span>

          {inCart ? (
            <div className="inline-flex h-8 items-center overflow-hidden rounded-md border border-zinc-900 bg-zinc-900">
              <button
                type="button"
                aria-label={`Remove one ${item.name}`}
                onClick={() => onDecrement?.(item)}
                className="flex h-full w-8 items-center justify-center text-white transition-colors hover:bg-zinc-700"
              >
                <Minus size={14} strokeWidth={2.4} />
              </button>
              <span className="tnum flex h-full min-w-7 items-center justify-center border-x border-white/20 px-1.5 text-xs font-semibold text-white">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Add one more ${item.name}`}
                onClick={() => onIncrement?.(item)}
                className="flex h-full w-8 items-center justify-center text-white transition-colors hover:bg-zinc-700"
              >
                <Plus size={14} strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAdd?.(item)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 transition-colors hover:border-zinc-900 hover:bg-zinc-50"
            >
              <Plus size={13} strokeWidth={2.4} />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
