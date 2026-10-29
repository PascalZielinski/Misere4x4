import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import musicUrl from '../assets/reverie.ogg'
import { useAudioSettings } from '../utils/audioSettings'

const bgMusic = new Audio(musicUrl)
bgMusic.loop = true

const MUSIC_BASE_VOLUME = 0.1

// matcht "/de/admin" und "/de/admin/dashboard", nicht "/de/adminfoo"
function isAdminPath(pathname: string): boolean {
  return /\/admin(\/|$)/.test(pathname)
}

export default function BackgroundMusic() {
  const { music } = useAudioSettings()
  const location = useLocation()
  const isAdmin = isAdminPath(location.pathname)

  // Refs, damit Effekte ohne Re-Runs den aktuellen Wert sehen
  const isAdminRef = useRef(isAdmin)
  const authorizedRef = useRef(false) // wurde der Autoplay schon entsperrt?

  useEffect(() => {
    isAdminRef.current = isAdmin
  }, [isAdmin])

  // Lautstärke
  useEffect(() => {
    bgMusic.volume = (music / 100) * MUSIC_BASE_VOLUME
  }, [music])

  // Autoplay-Unlock beim ersten User-Gesture
  useEffect(() => {
    const events = ['pointerdown', 'pointerup', 'keydown'] as const

    function remove() {
      events.forEach((e) => window.removeEventListener(e, tryPlay))
    }

    function tryPlay() {
      // Auf Admin-Routen nicht entsperren – sonst spielt die Reverie
      // beim Login-Klick im Hintergrund weiter
      if (isAdminRef.current) return
      bgMusic
        .play()
        .then(() => {
          authorizedRef.current = true
          remove()
        })
        .catch(() => {
          // blockiert – warten auf nächsten Gesture
        })
    }

    events.forEach((e) => window.addEventListener(e, tryPlay))
    tryPlay()

    return remove
  }, [])

  // Route-abhängiges Pausieren/Fortsetzen
  useEffect(() => {
    if (isAdmin) {
      bgMusic.pause()
    } else if (authorizedRef.current) {
      bgMusic.play().catch(() => {
        // Falls der Browser beim Resume doch noch blockt – still bleiben.
        // Beim nächsten Klick greift wieder tryPlay (Listener sind noch dran,
        // solange authorizedRef false war).
      })
    }
  }, [isAdmin])

  return null
}