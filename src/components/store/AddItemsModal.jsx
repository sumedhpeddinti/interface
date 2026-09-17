import { useMemo, useState } from 'react'
import { Minus, Plus, Search, UtensilsCrossed } from 'lucide-react'
import { Badge, Button, EmptyState, Modal, PillTabs, SearchInput, VegMark } from '../ui'
import { CATEGORIES } from '../../lib/orders'
import { classNames, money } from '../../lib/format'

/** Counter-entered round: search the catalogue, build a basket, push it to the
 *  KDS as an already-acknowledged round. */
export function AddItemsModal({ open, onClose, menu, tableId, onAdd }) {
  const [qty, setQty] = useState({})
  const [category, setCategory] = useState('Top Picks')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const available = (menu || []).filter((item) => item.available !== false)
    const q = query.trim().toLowerCase()
    if (q) {
      return available.filter(
        (item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
      )
    }
    if (category === 'Top Picks') return available.filter((item) => item.isBestseller)
    return available.filter((item) => item.category === category)
  }, [menu, category, query])

  const lines = Object.entries(qty)
    .map(([id, count]) => {
      const item = menu.find((entry) => entry.id === id)
      return item ? { ...item, count } : null
    })
    .filter(Boolean)

  const total = lines.reduce((sum, line) => sum + line.price * line.count, 0)
  const count = lines.reduce((sum, line) => sum + line.count, 0)

  function change(item, delta) {
    setQty((current) => {
      const next = (current[item.id] || 0) + delta
      const copy = { ...current }
      if (next <= 0) delete copy[item.id]
      else copy[item.id] = next
      return copy
    })
  }

  function submit() {
    onAdd?.(
      lines.map((line) => ({
        id: line.id,
        name: line.name,
        price: line.price,
        qty: line.count,
        station: line.station,
        isVeg: line.isVeg,
        note: '',
      })),
    )
    setQty({})
    setQuery('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add items to ${tableId}`}
      subtitle="Items enter the kitchen as an accepted round and appear on the guest's tracker."
      icon={UtensilsCrossed}
      size="lg"
      footer={
        <>
          <div className="mr-auto">
            <p className="tnum text-xs text-zinc-500">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
            <p className="tnum text-sm font-semibold text-zinc-900">{money(total)}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={!count} onClick={submit}>
            Add to bill
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the menu"
        />
        {query ? null : (
          <PillTabs
            value={category}
            onChange={setCategory}
            tabs={CATEGORIES.map((name) => ({ id: name, label: name }))}
          />
        )}

        <div className="hairline-scroll max-h-[46vh] overflow-y-auto rounded-md border border-zinc-200">
          {visible.length === 0 ? (
            <EmptyState icon={Search} title="No dishes matched" compact />
          ) : (
            <ul className="divide-y divide-zinc-200">
              {visible.map((item) => {
                const current = qty[item.id] || 0
                return (
                  <li
                    key={item.id}
                    className={classNames(
                      'flex items-center gap-3 px-3 py-2.5',
                      current > 0 && 'bg-zinc-50',
                    )}
                  >
                    <VegMark isVeg={item.isVeg} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-zinc-900">{item.name}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span className="tnum">{money(item.price)}</span>
                        <span className="text-zinc-300">·</span>
                        {item.station}
                        {item.isBestseller ? (
                          <Badge tone="amber" size="sm">
                            Top
                          </Badge>
                        ) : null}
                      </p>
                    </div>
                    {current > 0 ? (
                      <div className="inline-flex h-8 items-center overflow-hidden rounded-md border border-zinc-900 bg-zinc-900">
                        <button
                          type="button"
                          aria-label={`One less ${item.name}`}
                          onClick={() => change(item, -1)}
                          className="flex h-full w-8 items-center justify-center text-white hover:bg-zinc-700"
                        >
                          <Minus size={13} strokeWidth={2.4} />
                        </button>
                        <span className="tnum flex h-full min-w-7 items-center justify-center border-x border-white/20 px-1 text-xs font-semibold text-white">
                          {current}
                        </span>
                        <button
                          type="button"
                          aria-label={`One more ${item.name}`}
                          onClick={() => change(item, 1)}
                          className="flex h-full w-8 items-center justify-center text-white hover:bg-zinc-700"
                        >
                          <Plus size={13} strokeWidth={2.4} />
                        </button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => change(item, 1)}>
                        <Plus size={12} strokeWidth={2.4} />
                        Add
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
