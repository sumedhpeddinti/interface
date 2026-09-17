import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../context/StoreContext'
import { StoreSidebar, NAV_GROUPS, lateTicketCount } from './StoreSidebar'
import { StoreHeader } from './StoreHeader'
import { LockScreen, RestrictedPanel } from './PinPadModal'
import { ConfirmModal } from '../ui'
import { useNow } from '../../lib/ticker'
import { canAccess } from '../../lib/orders'

function areaForPath(pathname) {
  const clean = pathname.replace(/\/$/, '') || '/store'
  const match = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.to === clean)
  return match?.area || 'overview'
}

export default function StoreLayout() {
  const { state, actions } = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const now = useNow()
  const [resetOpen, setResetOpen] = useState(false)

  const staff = (state.staff || []).find((member) => member.id === state.session.staffId) || null
  const role = staff?.role || 'Manager'
  const area = areaForPath(pathname)
  const locked = Boolean(state.session.locked)
  const allowed = canAccess(role, area)

  const badges = {
    alerts: (state.alerts || []).filter((alert) => !alert.resolved).length,
    late: lateTicketCount(state.orders, now),
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* `flex` so the rail is exactly one viewport tall and its nav scrolls
          internally — otherwise the footer slides below the fold. */}
      <div className="sticky top-0 hidden h-screen shrink-0 sm:flex">
        <StoreSidebar
          badges={badges}
          staff={staff}
          storeOpen={state.settings.storeOpen}
          onLock={() => actions.lockSession()}
          onReset={() => setResetOpen(true)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <StoreHeader
          storeOpen={state.settings.storeOpen}
          soundEnabled={state.settings.soundEnabled}
          shift={state.shift}
          staff={staff}
          queue={{
            unacknowledged: (state.alerts || []).filter(
              (alert) => alert.kind === 'order' && !alert.resolved,
            ).length,
          }}
          onToggleStore={(value) => actions.setSetting({ patch: { storeOpen: value } })}
          onToggleSound={(value) => actions.setSetting({ patch: { soundEnabled: value } })}
          onLock={() => actions.lockSession()}
        />

        <main className="hairline-scroll min-w-0 flex-1 px-4 py-5 lg:px-6">
          {locked ? (
            <LockScreen
              staff={state.staff}
              onSuccess={(member) => actions.setSession({ staffId: member.id })}
            />
          ) : allowed ? (
            <Outlet />
          ) : (
            <RestrictedPanel
              area={area}
              role={role}
              staff={state.staff}
              onUnlock={(member) => actions.setSession({ staffId: member.id })}
            />
          )}
        </main>
      </div>

      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          actions.resetDemo()
          navigate('/store')
        }}
        title="Reset demo data?"
        description="Every order, invoice, shift, expense, campaign and feedback entry goes back to the factory seed. This cannot be undone."
        confirmLabel="Reset everything"
        tone="danger"
      />
    </div>
  )
}
