import { useSyncExternalStore } from 'react'

const KEY = 'audioSettings'

type Settings = { sound: number; music: number } // 0-100

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        sound: Number.isFinite(p.sound) ? p.sound : 100,
        music: Number.isFinite(p.music) ? p.music : 100,
      }
    }
  } catch {
    // ignorieren
  }
  return { sound: 100, music: 100 }
}

let settings: Settings = load()
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return settings
}

function update(patch: Partial<Settings>) {
  settings = { ...settings, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // ignorieren
  }
  listeners.forEach((l) => l())
}

export function setSoundVolume(v: number) {
  update({ sound: v })
}

export function setMusicVolume(v: number) {
  update({ music: v })
}

// Für Nicht-React-Code (z. B. beim Abspielen): Wert 0-1
export function getSoundGain(): number {
  return settings.sound / 100
}

export function useAudioSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot)
}