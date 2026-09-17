// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearState, loadState, onExternalStateChange, saveState } from './storage'
import { STATE_VERSION, STORAGE_KEY } from '../data/seedState'

/* The persistence layer is this platform's database: a versioned snapshot in
   localStorage, plus a `storage` event that doubles as the cross-tab channel.
   These tests pin down what happens when the data is absent, stale, or corrupt
   — the three cases that decide whether a reload loses the restaurant. */

const sample = {
  guests: [{ id: 'g01', name: 'Vinit Sharma' }],
  orders: [],
  settings: { storeOpen: true },
  chime: { kind: 'order', seq: 7 },
}

function writeRaw(value) {
  window.localStorage.setItem(STORAGE_KEY, value)
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('round trip', () => {
  it('saves and reloads a snapshot', () => {
    saveState(sample)
    const loaded = loadState()
    expect(loaded.guests).toEqual(sample.guests)
    expect(loaded.settings).toEqual(sample.settings)
    expect(loaded.orders).toEqual([])
  })

  it('stamps the current schema version on every write', () => {
    saveState(sample)
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    expect(parsed.version).toBe(STATE_VERSION)
    expect(typeof parsed.savedAt).toBe('number')
  })

  it('never persists the transient audio sequence', () => {
    saveState(sample)
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    expect('chime' in parsed.data).toBe(false)
    expect('chime' in loadState()).toBe(false)
  })
})

describe('stale, missing and corrupt data', () => {
  it('returns nothing when there is no snapshot at all', () => {
    expect(loadState()).toBeNull()
  })

  it('refuses a snapshot from an older schema', () => {
    writeRaw(JSON.stringify({ version: STATE_VERSION - 1, data: sample }))
    expect(loadState()).toBeNull()
  })

  it('refuses a snapshot from a newer schema', () => {
    writeRaw(JSON.stringify({ version: STATE_VERSION + 1, data: sample }))
    expect(loadState()).toBeNull()
  })

  it('refuses a snapshot with no payload', () => {
    writeRaw(JSON.stringify({ version: STATE_VERSION }))
    expect(loadState()).toBeNull()
  })

  it('survives malformed JSON instead of crashing the app', () => {
    writeRaw('{ this is not json')
    expect(loadState()).toBeNull()
  })

  it('clearState wipes the snapshot', () => {
    saveState(sample)
    clearState()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(loadState()).toBeNull()
  })
})

describe('cross-tab channel', () => {
  it('hands a snapshot from another tab to the handler', () => {
    const handler = vi.fn()
    const unsubscribe = onExternalStateChange(handler)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify({ version: STATE_VERSION, data: sample }),
      }),
    )
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].guests).toEqual(sample.guests)
    unsubscribe()
  })

  it('ignores writes to other keys', () => {
    const handler = vi.fn()
    const unsubscribe = onExternalStateChange(handler)
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else', newValue: '{}' }))
    expect(handler).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('ignores a cleared key and malformed payloads', () => {
    const handler = vi.fn()
    const unsubscribe = onExternalStateChange(handler)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }))
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'not-json' }))
    window.dispatchEvent(
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify({ v: 1 }) }),
    )
    expect(handler).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('stops listening once unsubscribed', () => {
    const handler = vi.fn()
    onExternalStateChange(handler)()
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify({ version: STATE_VERSION, data: sample }),
      }),
    )
    expect(handler).not.toHaveBeenCalled()
  })
})
