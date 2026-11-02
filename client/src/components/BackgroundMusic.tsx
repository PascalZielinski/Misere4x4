import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import musicUrl from '../assets/reverie.ogg'
import { useAudioSettings } from '../utils/audioSettings'

const bgMusic = new Audio(musicUrl)
bgMusic.loop = true

const MUSIC_BASE_VOLUME = 0.1

function isAdminPath(pathname: string): boolean {
  return /\/admin(\/|$)/.test(pathname)
}

export default function BackgroundMusic() {
  const { music } = useAudioSettings()
  const location = useLocation()
  const isAdmin = isAdminPath(location.pathname)

  const isAdminRef = useRef(isAdmin)
  const authorizedRef = useRef(false)

  useEffect(() => {
    isAdminRef.current = isAdmin
  }, [isAdmin])

  useEffect(() => {
    bgMusic.volume = (music / 100) * MUSIC_BASE_VOLUME
  }, [music])

  useEffect(() => {
    const events = ['pointerdown', 'pointerup', 'keydown'] as const

    function remove() {
      events.forEach((e) => window.removeEventListener(e, tryPlay))
    }

    function tryPlay() {

      if (isAdminRef.current) return
      bgMusic
        .play()
        .then(() => {
          authorizedRef.current = true
          remove()
        })
        .catch(() => {
          
        })
    }

    events.forEach((e) => window.addEventListener(e, tryPlay))
    tryPlay()

    return remove
  }, [])

 
  useEffect(() => {
    if (isAdmin) {
      bgMusic.pause()
    } else if (authorizedRef.current) {
      bgMusic.play().catch(() => {

      })
    }
  }, [isAdmin])

  return null
}