import { PillTabs } from '../ui'

export function CategoryNav({ categories, value, onChange, counts = {} }) {
  const tabs = [
    { id: 'Top Picks', label: 'Top Picks' },
    ...categories
      .filter((category) => category !== 'Top Picks')
      .map((category) => ({ id: category, label: category })),
  ]

  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-3">
      <PillTabs tabs={tabs} value={value} onChange={onChange} />
      {counts[value] !== undefined ? (
        <p className="mt-2 text-[11px] text-zinc-400">
          <span className="tnum">{counts[value]}</span> dishes in {value}
        </p>
      ) : null}
    </div>
  )
}
