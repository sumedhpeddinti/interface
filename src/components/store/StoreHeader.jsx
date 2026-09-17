import { useLocation } from 'react-router-dom'
import { ChevronRight, Lock, Volume2, VolumeX } from 'lucide-react'
import { Badge, Button, IconButton, Switch } from '../ui'
import { NAV_GROUPS } from './StoreSidebar'
import { clock } from '../../lib/format'
import { playChimePreview } from '../../lib/audio'

const CRUMB_OVERRIDES = {
  '/store': 'Overview',
}

export function StoreHeader({
  storeOpen,
  onToggleStore,
  soundEnabled,
  onToggleSound,
  shift,
  onLock,
  staff,
  queue,
}) {
  const { pathname } = useLocation()
  const segment = pathname.replace(/\/$/, '') || '/store'
  const match = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.to === segment)
  const title = CRUMB_OVERRIDES[segment] || match?.label || 'Overview'

  return (
    <header className="no-print sticky top-0 z-20 border-b border-zinc-200 bg-white">
      <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden text-xs text-zinc-400 sm:inline">Ganesh Café</span>
          <ChevronRight size={13} strokeWidth={2} className="hidden text-zinc-300 sm:inline" />
          <h1 className="truncate text-sm font-semibold text-zinc-900">{title}</h1>
          <Badge tone={storeOpen ? 'emerald' : 'rose'} size="sm" dot pulse={storeOpen}>
            {storeOpen ? 'Open' : 'Closed'}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {queue?.unacknowledged > 0 ? (
            <Badge tone="rose" size="md" mono>
              {queue.unacknowledged} new
            </Badge>
          ) : null}

          <span className="hidden items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] text-zinc-600 md:flex">
            <span className="text-zinc-400">Shift</span>
            <span className="tnum font-medium text-zinc-900">{shift?.id || '—'}</span>
            {shift?.isOpen ? (
              <span className="text-zinc-400">· opened {clock(shift.openedAt)}</span>
            ) : (
              <span className="text-amber-600">· closed</span>
            )}
          </span>

          <div className="hidden items-center gap-2 lg:flex">
            <Switch
              checked={storeOpen}
              onChange={onToggleStore}
              label=""
              className="items-center"
            />
            <span className="text-[11px] text-zinc-500">Accepting orders</span>
          </div>

          <IconButton
            icon={soundEnabled ? Volume2 : VolumeX}
            label={soundEnabled ? 'Mute order chimes' : 'Unmute order chimes'}
            variant={soundEnabled ? 'secondary' : 'subtle'}
            onClick={() => {
              /* Always answer with sound: muting silences future chimes, it
                 must not make the button itself feel dead. */
              playChimePreview('order')
              onToggleSound(!soundEnabled)
            }}
          />

          <Button size="sm" variant="secondary" onClick={onLock}>
            <Lock size={13} strokeWidth={1.9} />
            <span className="hidden sm:inline">{staff?.role || 'Manager'} lock</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
