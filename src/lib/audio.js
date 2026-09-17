/* Web Audio bell synth. No asset files — every chime is generated.
   Browsers block audio until a user gesture, so `unlockAudio()` is wired to
   the first pointer/key event on the store portal. */

let ctx = null
let enabled = true

function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const AudioCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioCtor) return null
  try {
    ctx = new AudioCtor()
  } catch {
    ctx = null
  }
  return ctx
}

export function setAudioEnabled(value) {
  enabled = Boolean(value)
}

export function isAudioEnabled() {
  return enabled
}

export function unlockAudio() {
  const audio = ensureCtx()
  if (audio && audio.state === 'suspended') audio.resume().catch(() => {})
}

function tone(audio, { freq, start, duration, gain = 0.14, type = 'sine' }) {
  try {
    const osc = audio.createOscillator()
    const amp = audio.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    amp.gain.setValueAtTime(0.0001, start)
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012)
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(amp)
    amp.connect(audio.destination)
    osc.start(start)
    osc.stop(start + duration + 0.05)
  } catch {
    /* audio is a nicety — never let it break the app */
  }
}

const RECIPES = {
  /** New round placed from a guest table — bright two-note bell. */
  order: [
    { freq: 1046.5, at: 0, duration: 0.5, gain: 0.17, type: 'triangle' },
    { freq: 1568.0, at: 0.16, duration: 0.65, gain: 0.12, type: 'triangle' },
  ],
  /** Call waiter — three urgent pings. */
  waiter: [
    { freq: 987.77, at: 0, duration: 0.22, gain: 0.16, type: 'square' },
    { freq: 987.77, at: 0.26, duration: 0.22, gain: 0.16, type: 'square' },
    { freq: 1318.5, at: 0.52, duration: 0.34, gain: 0.14, type: 'square' },
  ],
  /** Marketing broadcast — soft chime so it never feels like an alarm. */
  broadcast: [
    { freq: 659.25, at: 0, duration: 0.5, gain: 0.09, type: 'sine' },
    { freq: 880.0, at: 0.14, duration: 0.6, gain: 0.08, type: 'sine' },
  ],
  /** Ticket is ready to serve. */
  ready: [
    { freq: 1174.66, at: 0, duration: 0.3, gain: 0.12, type: 'triangle' },
    { freq: 1396.91, at: 0.12, duration: 0.4, gain: 0.1, type: 'triangle' },
  ],
  /** Bill settled with change due. */
  settle: [
    { freq: 523.25, at: 0, duration: 0.28, gain: 0.12, type: 'sine' },
    { freq: 783.99, at: 0.1, duration: 0.28, gain: 0.12, type: 'sine' },
    { freq: 1046.5, at: 0.2, duration: 0.46, gain: 0.1, type: 'sine' },
  ],
}

/**
 * @param {'order'|'waiter'|'broadcast'|'ready'|'settle'} kind
 * @returns {boolean} whether a tone was actually scheduled
 */
export function playChime(kind = 'order') {
  if (!enabled) return false
  const audio = ensureCtx()
  if (!audio) return false
  if (audio.state === 'suspended') audio.resume().catch(() => {})
  const recipe = RECIPES[kind] || RECIPES.order
  const base = audio.currentTime + 0.02
  recipe.forEach((note) => tone(audio, { ...note, start: base + note.at }))
  return true
}

/**
 * Play a short tone regardless of the mute setting, for the header button:
 * muting should silence the shop, not make the button feel broken. The guest
 * hears the chime style being toggled, then silence once muted.
 * @returns {boolean} whether a tone was actually scheduled
 */
export function playChimePreview(kind = 'order') {
  const audio = ensureCtx()
  if (!audio) return false
  if (audio.state === 'suspended') audio.resume().catch(() => {})
  const recipe = RECIPES[kind] || RECIPES.order
  const base = audio.currentTime + 0.02
  recipe.forEach((note) => tone(audio, { ...note, start: base + note.at }))
  return true
}
