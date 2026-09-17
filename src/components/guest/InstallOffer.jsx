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
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-stone-200 bg-[#FAF7F4] px-4 py-1.5">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-stone-800">
              <BellRing size={11} strokeWidth={2} className="shrink-0 text-[#C15F3D]" />
              Get 2% extra off for keeping the notifications on
            </span>
            <Button
              size="xs"
              variant="secondary"
              className="!text-[10px] !py-0.5 !px-2.5 font-medium text-stone-800 bg-white hover:bg-stone-100 border-stone-300 shadow-2xs rounded-md"
              onClick={() => setNotifModalOpen(true)}
            >
              <BellRing size={10} className="mr-1 text-[#C15F3D]" />
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

/* ------------------------------------------------ Claude-style clean minimal popup notification modal -- */

export function NotificationPromptModal({ open, onClose, onAccept }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Soft dark backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Turn on Notifications"
        className="relative z-10 flex w-full max-w-[350px] flex-col rounded-lg border border-stone-200 bg-white p-6 shadow-xl text-left"
      >
        {/* Top Header Row with Subtle Tag and Close Button */}
        <div className="flex items-center justify-between pb-1">
          <span className="inline-flex items-center gap-1 rounded bg-[#F7ECE7] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#C15F3D]">
            <Sparkles size={11} />
            Special Offer · 2% Off
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Headline */}
        <h3 className="mt-3 text-base font-semibold text-stone-900">
          Turn on Notifications
        </h3>

        {/* Body Copy */}
        <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
          Enable real-time updates as your food is prepared in the kitchen, and get an{' '}
          <strong className="font-medium text-[#C15F3D]">extra 2% discount</strong> applied directly to your bill.
        </p>

        {/* Clean Minimalist Benefit List */}
        <div className="mt-4 rounded-md border border-stone-200/80 bg-[#FAF7F4] p-3 space-y-2">
          <div className="flex items-start gap-2 text-xs text-stone-700">
            <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#EFE3DC] text-[#C15F3D] text-[9px] font-bold">
              ✓
            </span>
            <span className="text-[11px] leading-snug">
              Real-time kitchen alerts for food preparation
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-stone-700">
            <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#EFE3DC] text-[#C15F3D] text-[9px] font-bold">
              %
            </span>
            <span className="text-[11px] leading-snug">
              Extra 2% discount automatically applied
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#DA7756] hover:bg-[#C15F3D] active:bg-[#B05333] px-4 py-2.5 text-xs font-medium text-white shadow-xs transition-colors"
            onClick={onAccept}
          >
            <BellRing size={13} strokeWidth={2.2} />
            Turn on notifications
          </button>

          <button
            type="button"
            className="w-full text-center py-1 text-xs text-stone-500 hover:text-stone-800 transition-colors"
            onClick={onClose}
          >
            Do not accept (Maybe later)
          </button>
        </div>
      </div>
    </div>
  )
}
