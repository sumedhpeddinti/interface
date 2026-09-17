import { useEffect, useSyncExternalStore } from 'react'
import { useStore } from '../context/StoreContext'
import { INSTALL_STATE, installState, subscribeInstall, watchInstallPrompt } from '../lib/install'
import { INSTALL_REWARD } from '../lib/pricing'

/* Keeps the app-install state honest across the whole platform.

   Two jobs. First, it never misses the browser's one-shot install prompt:
   Chrome fires `beforeinstallprompt` early, so we start listening on mount and
   again from main.jsx before React renders. Second, it records the reward for
   good — an install that already happened (the guest opened the app from their
   home screen) unlocks the 10% without them having to ask for it. Renders
   nothing. */

export function InstallBridge() {
  const { state, actions } = useStore()

  useEffect(() => watchInstallPrompt(), [])

  const unlocked = Boolean(state.ui?.appInstalled)
  const promo = state.ui?.promoCode || null

  useEffect(() => {
    if (installState() !== INSTALL_STATE.INSTALLED) return
    if (unlocked) return
    actions.setUi({
      patch: {
        appInstalled: true,
        installUnlockedAt: Date.now(),
        /* Never trample a voucher the guest already scanned in from a QR. */
        ...(promo ? {} : { promoCode: INSTALL_REWARD.code }),
      },
    })
  }, [unlocked, promo, actions])

  return null
}

/* ------------------------------------------------------------------ hook -- */

/** Live install state: 'installed' | 'ready' | 'manual' | 'unsupported'. */
export function useInstall() {
  return useSyncExternalStore(subscribeInstall, installState, () => INSTALL_STATE.UNSUPPORTED)
}
