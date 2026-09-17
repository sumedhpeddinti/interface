/* localStorage persistence. The whole demo survives a refresh, and the
   `storage` event doubles as the cross-tab realtime channel. */

import { STORAGE_KEY, STATE_VERSION } from '../data/seedState'

/** Transient slice: the audio sequence must never round-trip or a reload
 *  would replay the last chime. Everything else (including the selected
 *  guest table) survives a refresh. */
const TRANSIENT = ['chime']

function strip(state) {
  const copy = { ...state }
  for (const key of TRANSIENT) delete copy[key]
  return copy
}

export function loadState() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== STATE_VERSION || !parsed.data) return null
    return parsed.data
  } catch {
    return null
  }
}

export function saveState(state) {
  if (typeof window === 'undefined') return
  try {
    const payload = { version: STATE_VERSION, savedAt: Date.now(), data: strip(state) }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota or private mode — the app still works, it just won't persist */
  }
}

export function clearState() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Fired by the browser in every other tab when we write to localStorage. */
export function onExternalStateChange(handler) {
  if (typeof window === 'undefined') return () => {}
  const listener = (event) => {
    if (event.key !== STORAGE_KEY) return
    if (!event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue)
      if (parsed && parsed.data) handler(parsed.data)
    } catch {
      /* ignore malformed payloads */
    }
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}
