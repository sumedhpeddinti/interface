import { Clock, Users } from 'lucide-react'
import { Badge } from '../ui'
import { SECTION_BOUNDS } from '../../data/mockTables'
import { TABLE_STATE, TABLE_STATE_TONE } from '../../lib/orders'
import { classNames, duration, money } from '../../lib/format'

const NODE_STYLE = {
  [TABLE_STATE.FREE]: 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400',
  [TABLE_STATE.OCCUPIED]: 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500',
  [TABLE_STATE.BILLED]: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-500',
  [TABLE_STATE.RESERVED]: 'border-indigo-300 bg-indigo-50 text-indigo-900 hover:border-indigo-500',
}

const SIZE_BY_SEATS = { 2: 62, 4: 72, 6: 82 }

export function FloorPlanView({ entries, selectedId, onSelect, now }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="relative w-full overflow-hidden rounded-md border border-zinc-100 bg-zinc-50/50">
        <div className="relative w-full" style={{ paddingBottom: '62%' }}>
          {SECTION_BOUNDS.map((section) => (
            <div
              key={section.name}
              className="absolute rounded-md border border-dashed border-zinc-300/80"
              style={{
                left: `${section.left}%`,
                top: `${section.top}%`,
                width: `${section.width}%`,
                height: `${section.height}%`,
              }}
            >
              <span className="absolute -top-2.5 left-2 rounded bg-white px-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {section.name}
              </span>
            </div>
          ))}

          {entries.map((entry) => {
            const size = SIZE_BY_SEATS[entry.table.seats] || 70
            const occupiedAt = entry.seatedAt
            return (
              <button
                key={entry.table.id}
                type="button"
                onClick={() => onSelect?.(entry.table.id)}
                title={`${entry.table.id} · ${entry.status}`}
                style={{
                  left: `${entry.table.x}%`,
                  top: `${entry.table.y}%`,
                  width: size,
                  height: size,
                }}
                className={classNames(
                  'absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 border transition-colors',
                  entry.table.shape === 'round' ? 'rounded-full' : 'rounded-md',
                  NODE_STYLE[entry.status] || NODE_STYLE[TABLE_STATE.FREE],
                  selectedId === entry.table.id && 'ring-2 ring-zinc-900 ring-offset-1',
                )}
              >
                <span className="tnum text-sm font-semibold leading-none">{entry.table.id}</span>
                <span className="flex items-center gap-0.5 text-[9px] leading-none opacity-70">
                  <Users size={8} strokeWidth={2} />
                  {entry.table.seats}
                </span>
                {entry.roundCount > 0 ? (
                  <>
                    <span className="tnum text-[9px] font-semibold leading-none">
                      {money(entry.total, 0)}
                    </span>
                    {occupiedAt ? (
                      <span className="tnum flex items-center gap-0.5 text-[8px] leading-none opacity-70">
                        <Clock size={7} strokeWidth={2.2} />
                        {duration(now - occupiedAt)}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Legend
        </span>
        {[TABLE_STATE.FREE, TABLE_STATE.OCCUPIED, TABLE_STATE.BILLED, TABLE_STATE.RESERVED].map(
          (status) => (
            <Badge key={status} tone={TABLE_STATE_TONE[status]} size="sm" dot>
              {status}
            </Badge>
          ),
        )}
      </div>
    </div>
  )
}
