import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Settings, Smartphone } from 'lucide-react'
import { classNames } from '../lib/format'

/* Discreet control that hops between the guest app and the POS.

   It sits in the bottom-left corner — out of the way of both layouts' own
   headers — and is hidden entirely on small screens, where the tablet and
   phone running the demo are showing one portal each. Alt+1 and Alt+2 still
   work anywhere, on any screen size. */

export function DemoSwitcher() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onStore = pathname.startsWith('/store')

  useEffect(() => {
    const onKey = (event) => {
      if (!event.altKey) return
      if (event.key === '1') navigate('/')
      if (event.key === '2') navigate('/store')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const options = [
    { id: 'guest', label: 'Guest App', hint: '/', icon: Smartphone, to: '/' },
    { id: 'store', label: 'Manager POS', hint: '/store', icon: Settings, to: '/store' },
  ]

  return (
    <div className="no-print fixed bottom-4 left-4 z-[80] hidden md:block">
      <div className="flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-0.5">
        {options.map((option) => {
          const active = option.id === 'store' ? onStore : !onStore
          return (
            <button
              key={option.id}
              type="button"
              title={`${option.label} (${option.hint}) — Alt+${option.id === 'store' ? '2' : '1'}`}
              onClick={() => navigate(option.to)}
              className={classNames(
                'flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors',
                active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              )}
            >
              <option.icon size={12} strokeWidth={1.9} />
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
