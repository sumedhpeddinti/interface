/* One global one-second ticker. Components that show a live timer call useNow();
   only those subscribers re-render each second, not the whole tree. */

import { useSyncExternalStore } from 'react'

let now = Date.now()
const listeners = new Set()
let started = false

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  window.setInterval(() => {
    now = Date.now()
    for (const listener of listeners) listener()
  }, 1000)
}

function subscribe(listener) {
  listeners.add(listener)
  start()
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return now
}

function getServerSnapshot() {
  return now
}

export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
