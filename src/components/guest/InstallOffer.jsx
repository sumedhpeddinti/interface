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
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-orange-200 bg-orange-50/60 px-4 py-1.5">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-orange-950">
              <BellRing size={11} strokeWidth={2.2} className="shrink-0 text-orange-600" />
              Get 2% extra off for keeping the notifications on
            </span>
            <Button
              size="xs"
              variant="secondary"
              className="!text-[10px] !py-0.5 !px-2.5 font-semibold text-orange-800 bg-white hover:bg-orange-50 border-orange-300 shadow-2xs rounded-none"
              onClick={() => setNotifModalOpen(true)}
            >
              <BellRing size={10} className="mr-1 text-orange-600" />
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

/* ------------------------------------------------ prominent square solid popup notification modal -- */

export function NotificationPromptModal({ open, onClose, onAccept }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Turn on Notifications"
        className="relative z-10 flex w-full max-w-[360px] flex-col overflow-hidden border-2 border-orange-500 bg-white shadow-2xl"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-orange-500 bg-orange-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <BellRing size={18} strokeWidth={2.2} />
            <span className="text-xs font-bold uppercase tracking-wider">Live Updates</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center border border-white/30 bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col items-center p-6 text-center">
          {/* Boxed Icon & Offer Tag */}
          <div className="mb-4 flex items-center justify-center">
            <div className="relative flex h-16 w-16 items-center justify-center border-2 border-orange-500 bg-orange-50 text-orange-600 shadow-xs">
              <BellRing size={28} strokeWidth={2.2} />
              <span className="absolute -bottom-2.5 bg-orange-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white border border-white shadow-xs">
                +2% OFF
              </span>
            </div>
          </div>

          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
            Turn on Notifications
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            Enable real-time updates as your food is prepared in the kitchen, and get an{' '}
            <strong className="font-bold text-orange-600">extra 2% discount</strong> applied directly to your bill!
          </p>

          {/* Solid Boxed Features */}
          <div className="mt-4 w-full border border-orange-200 bg-orange-50/60 p-3 text-left text-xs text-zinc-800 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center bg-orange-500 text-white text-[10px] font-bold">
                ✓
              </span>
              <span className="font-medium text-[11px] leading-tight text-zinc-800">
                Real-time kitchen alerts for food preparation
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center bg-orange-500 text-white text-[10px] font-bold">
                %
              </span>
              <span className="font-medium text-[11px] leading-tight text-zinc-800">
                Extra 2% discount automatically applied
              </span>
            </div>
          </div>

          {/* Solid Boxed Action Buttons */}
          <div className="mt-5 w-full space-y-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 border border-orange-600 bg-orange-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-orange-700 active:bg-orange-800 transition-colors"
              onClick={onAccept}
            >
              <BellRing size={14} />
              Turn on notifications
            </button>

            <button
              type="button"
              className="w-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              onClick={onClose}
            >
              Do not accept (Maybe later)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
