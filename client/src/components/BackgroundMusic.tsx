import { useEffect } from 'react'
import musicUrl from '../assets/reverie.mp3'
import { useAudioSettings } from '../utils/audioSettings'

const bgMusic = new Audio(musicUrl)
bgMusic.loop = true

const MUSIC_BASE_VOLUME = 0.1

export default function BackgroundMusic() {
  const { music } = useAudioSettings()

  useEffect(() => {
    bgMusic.volume = (music / 100) * MUSIC_BASE_VOLUME
  }, [music])

  useEffect(() => {
    const events = ['pointerdown', 'pointerup', 'keydown'] as const

    function remove() {
      events.forEach((e) => window.removeEventListener(e, tryPlay))
    }

    function tryPlay() {
      bgMusic.play().then(remove).catch(() => {

      })
    }

    events.forEach((e) => window.addEventListener(e, tryPlay))
    tryPlay()

    return remove
  }, [])

  return null
}