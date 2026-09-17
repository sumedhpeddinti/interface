import { useEffect, useState } from 'react'
import { Bell, Megaphone, Tag, X } from 'lucide-react'
import { classNames } from '../../lib/format'

/** Simulates a native OS push sliding down over the guest screen. */
export function PushToast({ notification, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!notification) {
      setVisible(false)
      return undefined
    }
    /* The rAF gives the transition a frame to slide in from. A background tab
       gets its frames throttled — sometimes for seconds — so a timer fallback
       makes sure the banner is there the moment the guest looks at the screen,
       which is exactly when a push has to be waiting. Either flip is enough. */
    const frame = window.requestAnimationFrame(() => setVisible(true))
    const timer = window.setTimeout(() => setVisible(true), 60)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [notification])

  if (!notification) return null

  const isCampaign = notification.kind === 'campaign'
  const Icon = isCampaign ? Megaphone : Bell

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-2">
      <div
        role="status"
        aria-live="polite"
        className={classNames(
          'pointer-events-auto w-full max-w-[calc(28rem-1.5rem)] origin-top rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-all duration-300 ease-out',
          visible ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-900 text-white">
            <Icon size={13} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {isCampaign
                  ? notification.channel === 'whatsapp'
                    ? 'WhatsApp · Ganesh Café'
                    : 'Web Push · Ganesh Café'
                  : 'Kitchen · Ganesh Café'}
              </span>
              <span className="text-[10px] text-zinc-300">now</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold leading-snug text-zinc-900">
              {notification.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{notification.body}</p>
            {notification.coupon ? (
              <span className="tnum mt-1.5 inline-flex items-center gap-1 rounded border border-dashed border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <Tag size={10} strokeWidth={2} />
                {notification.coupon}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss?.(notification.id)}
            className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  )
}
