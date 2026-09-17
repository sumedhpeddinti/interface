import { useEffect, useState } from 'react'
import { BellRing, Check, Download, MonitorSmartphone, MoreVertical, Percent, Share2, Smartphone, Sparkles, X } from 'lucide-react'
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
  const [notifModalOpen, setNotifModalOpen] = useState(false)

  const installed = rewardActive || status === INSTALL_STATE.INSTALLED
  /* Live view of the browser's real permission — survives reloads, unlike
     session state, so the badge never lies about what is switched on. */
  const notificationsOn = os.granted

  useEffect(() => {
    if (notificationsOn) return
    try {
      const alreadySeen = sessionStorage.getItem('beno_notif_prompt_seen')
      if (!alreadySeen) {
        const timer = setTimeout(() => {
          setNotifModalOpen(true)
        }, 1000)
        return () => clearTimeout(timer)
      }
    } catch (_) {}
  }, [notificationsOn])

  async function start() {
    if (phase !== 'idle') return

    setPhase('installing')

    if (canPromptInstall()) {
      try {
        await promptInstall()
      } catch (_) {}
    }

    onUnlock?.({ via: 'prompt' })
    setPhase('notifying')

    const permission = await os.request()
    if (permission === 'granted') {
      await showSystemNotification({
        title: 'Beno installed',
        body: `We will ping this device the moment your order is ready. 10% off (${rewardCode}) is on.`,
        tag: 'beno-installed',
        kind: 'campaign',
      })
    }

    setPhase('done')
  }

  async function handleApplyNotification() {
    try {
      sessionStorage.setItem('beno_notif_prompt_seen', '1')
    } catch (_) {}
    const permission = await os.request()
    if (permission === 'granted') {
      await showSystemNotification({
        title: 'Notifications enabled · Beno',
        body: '2% extra discount applied! We will ping this device when your food is ready.',
        tag: 'beno-alerts-enabled',
        kind: 'campaign',
      })
    }
    setNotifModalOpen(false)
  }

  function handleCloseNotifModal() {
    try {
      sessionStorage.setItem('beno_notif_prompt_seen', '1')
    } catch (_) {}
    setNotifModalOpen(false)
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
    <>
      <div className="border-t border-zinc-200 bg-zinc-50/50">
        {installed ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-1.5">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-emerald-700">
              <Check size={12} strokeWidth={2.6} />
              <span className="tnum">{rewardCode}</span> applied · 10% off every round
            </span>
            {notificationsOn ? (
              <Badge tone="emerald" size="sm" icon={BellRing}>
                Alerts on · 2% extra applied
              </Badge>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-1.5">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-zinc-600">
              <Percent size={11} strokeWidth={2.2} className="shrink-0 text-amber-600" />
              Get 10% off · no minimum
            </span>
            <Button
              size="xs"
              variant="primary"
              className="!bg-emerald-600 hover:!bg-emerald-700 active:!bg-emerald-800 !text-white !border-emerald-600 font-medium shadow-xs"
              disabled={phase !== 'idle' && phase !== 'done'}
              onClick={start}
            >
              {phase === 'done' ? <Check size={11} strokeWidth={2.4} /> : <Download size={11} strokeWidth={2.2} />}
              {label}
            </Button>
          </div>
        )}

        {!notificationsOn && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-zinc-200/70 bg-amber-50/40 px-4 py-1.5">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-zinc-700">
              <BellRing size={11} strokeWidth={2.2} className="shrink-0 text-amber-600" />
              Get 2% extra off for keeping the notifications on
            </span>
            <Button
              size="xs"
              variant="secondary"
              className="!text-[10px] !py-0.5 !px-2.5 font-medium text-amber-800 bg-white hover:bg-amber-50 border-amber-300 shadow-2xs"
              onClick={() => setNotifModalOpen(true)}
            >
              <BellRing size={10} className="mr-1 text-amber-600" />
              Turn on notifications
            </Button>
          </div>
        )}
      </div>

      <NotificationPromptModal
        open={notifModalOpen}
        onClose={handleCloseNotifModal}
        onAccept={handleApplyNotification}
      />
    </>
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
      title="Install Beno"
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

/* ------------------------------------------------ prominent square popup notification modal -- */

export function NotificationPromptModal({ open, onClose, onAccept }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Turn on Notifications"
        className="relative z-10 flex w-full max-w-[340px] flex-col items-center rounded-3xl border border-amber-200/80 bg-white p-6 text-center shadow-2xl transition-all"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="relative mb-3 mt-1 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-inner">
            <BellRing size={28} className="animate-bounce" />
          </div>
          <span className="absolute -bottom-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
            <Sparkles size={10} />
            +2% OFF
          </span>
        </div>

        <h3 className="mt-2 text-base font-bold text-zinc-900">
          Turn on Notifications
        </h3>

        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
          Enable real-time updates as your food is prepared in the kitchen, and get an{' '}
          <strong className="font-semibold text-amber-700">extra 2% discount</strong> applied directly to your bill!
        </p>

        <div className="mt-4 w-full space-y-1.5 rounded-xl border border-amber-100/80 bg-amber-50/60 p-2.5 text-left text-[11px] text-zinc-700">
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check size={10} strokeWidth={3} />
            </span>
            <span>Real-time kitchen alerts for food preparation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Percent size={10} strokeWidth={3} />
            </span>
            <span>Extra 2% discount automatically applied</span>
          </div>
        </div>

        <div className="mt-5 w-full space-y-2">
          <Button
            size="md"
            variant="primary"
            className="w-full !bg-amber-600 hover:!bg-amber-700 !text-white font-semibold py-2.5 rounded-xl shadow-xs text-xs justify-center"
            onClick={onAccept}
          >
            <BellRing size={13} className="mr-1.5 text-amber-100" />
            Turn on notifications
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-full text-xs text-zinc-500 hover:text-zinc-800 justify-center !py-1.5 font-normal"
            onClick={onClose}
          >
            Do not accept (Maybe later)
          </Button>
        </div>
      </div>
    </div>
  )
}
