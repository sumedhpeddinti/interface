import { useState } from 'react'
import { BellRing, Check, Download, MonitorSmartphone, MoreVertical, Percent, Share2, Smartphone } from 'lucide-react'
import { Badge, Button, InlineNote, Modal } from '../ui'
import {
  INSTALL_STATE,
  canPromptInstall,
  installPlatform,
  installPlatformLabel,
  installSteps,
  promptInstall,
} from '../../lib/install'
import { showSystemNotification } from '../../lib/notifications'
import { useNotificationPermission } from '../SystemNotifications'
import { useInstall } from '../InstallBridge'

/* One tap, everything set up.

   The guest presses "Download" once and this runs the whole chain against
   real browser APIs: the native install dialog (the app lands on the home
   screen with its own icon), then the notification permission bubble (the
   kitchen can ping them when food is ready), then a real confirmation
   notification proving both work.

   Order matters: the install prompt is handed back first, inside the click's
   gesture window, because Chrome requires a user gesture for it. The
   notification request follows while the same tap is still fresh — browsers
   treat a chain started by a click as gesture-driven.

   Nothing here pretends: every step records what the browser actually did,
   and the button label says so as it goes. */

const PLATFORM_ICON = {
  ios: Share2,
  android: MoreVertical,
  desktop: MonitorSmartphone,
}

export function InstallOffer({ rewardActive, rewardCode = 'APP10', onUnlock }) {
  const status = useInstall()
  const os = useNotificationPermission()
  const [phase, setPhase] = useState('idle') // idle → installing → notifying → done
  const [helpOpen, setHelpOpen] = useState(false)

  const installed = rewardActive || status === INSTALL_STATE.INSTALLED
  /* Live view of the browser's real permission — survives reloads, unlike
     session state, so the badge never lies about what is switched on. */
  const notificationsOn = os.granted

  async function start() {
    if (phase !== 'idle') return

    /* No programmatic prompt (iOS Safari, Firefox, in-app browsers): the
       honest fallback is the manual sheet, which still ends in the reward. */
    if (!canPromptInstall()) {
      setHelpOpen(true)
      return
    }

    /* Step 1 — the browser's real install dialog. The address-bar icon and
       the home-screen icon come from the manifest; this tap is what opens it. */
    setPhase('installing')
    const result = await promptInstall()

    if (result.outcome === 'dismissed') {
      /* The guest said no to the browser's own dialog — leave quietly. */
      setPhase('idle')
      return
    }
    if (result.outcome !== 'accepted') {
      /* Spent or refused prompt: fall back to the manual walkthrough. */
      setPhase('idle')
      setHelpOpen(true)
      return
    }
    onUnlock?.({ via: 'prompt' })

    /* Step 2 — notifications, in the same gesture. If the browser shows its
       own permission bubble, this is what triggers it. */
    setPhase('notifying')
    const permission = await os.request()

    /* Step 3 — proof, not a promise: a real notification on the device. */
    if (permission === 'granted') {
      await showSystemNotification({
        title: 'Ganesh Café installed',
        body: `We will ping this device the moment your order is ready. 10% off (${rewardCode}) is on.`,
        tag: 'ganesh-cafe-installed',
        kind: 'campaign',
      })
    }

    setPhase('done')
  }

  /* ---------------------------------------------------------------- render -- */

  const label =
    phase === 'installing'
      ? 'Installing…'
      : phase === 'notifying'
        ? 'Enabling alerts…'
        : phase === 'done'
          ? 'All set'
          : 'Download'

  /* A slim full-width strip for the guest header: the offer on the left, the
     one-tap action on the right. Once installed it reads as a done deal. */
  return (
    <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-4 py-1.5">
      {installed ? (
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-emerald-700">
            <Check size={12} strokeWidth={2.6} />
            <span className="tnum">{rewardCode}</span> applied · 10% off every round
          </span>
          <Badge tone={notificationsOn ? 'emerald' : 'zinc'} size="sm" icon={BellRing}>
            {notificationsOn ? 'Alerts on' : 'Alerts off'}
          </Badge>
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-zinc-600">
            <Percent size={11} strokeWidth={2.2} className="shrink-0 text-amber-600" />
            Get 10% off · no minimum
          </span>
          <Button
            size="xs"
            variant="secondary"
            disabled={phase !== 'idle' && phase !== 'done'}
            onClick={start}
          >
            {phase === 'done' ? <Check size={11} strokeWidth={2.4} /> : <Download size={11} strokeWidth={2.2} />}
            {label}
          </Button>
        </>
      )}
      <InstallHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onClaim={async () => {
          setHelpOpen(false)
          onUnlock?.({ via: 'manual' })
          setPhase('notifying')
          const permission = await os.request()
          if (permission === 'granted') {
            await showSystemNotification({
              title: 'Ganesh Café installed',
              body: `We will ping this device the moment your order is ready. 10% off (${rewardCode}) is on.`,
              tag: 'ganesh-cafe-installed',
              kind: 'campaign',
            })
          }
          setPhase('done')
        }}
      />
    </div>
  )
}

/* ---------------------------------------------------- manual install help -- */

export function InstallHelpModal({ open, onClose, onClaim }) {
  const platform = installPlatform()
  const steps = installSteps(platform)
  const Icon = PLATFORM_ICON[platform] || MonitorSmartphone

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Install Ganesh Café"
      subtitle={`${installPlatformLabel(platform)} · two taps, then you are done`}
      icon={Icon}
      size="sm"
      footer={
        <>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Not now
          </Button>
          <Button size="sm" variant="primary" onClick={onClaim}>
            <Check size={12} strokeWidth={2.4} />
            Done — turn on my 10% and alerts
          </Button>
        </>
      }
    >
      <ol className="space-y-3">
        {steps.map((entry, index) => (
          <li key={entry.step} className="flex gap-3">
            <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-[10px] font-semibold text-zinc-600">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-900">{entry.step}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{entry.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4">
        <InlineNote tone="amber" icon={Smartphone}>
          This browser will not tell us when you have installed it, so tap the button below once
          you have — your flat 10% off is then applied to your bill at the table, with no minimum
          spend.
        </InlineNote>
      </div>
    </Modal>
  )
}
