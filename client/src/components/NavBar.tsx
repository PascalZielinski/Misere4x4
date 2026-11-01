import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import './NavBar.css'
import sunUrl from '../assets/sun.svg'
import moonUrl from '../assets/moon.svg'
import speaker from '../assets/speaker-2-svgrepo-com.svg'
import speakerCrossed from '../assets/speaker-cross-svgrepo-com.svg'
import music from '../assets/music-note-svgrepo-com.svg'
import musicCrossed from '../assets/music-note-slash-svgrepo-com.svg'
import translateIcon from '../assets/qtranslate-svgrepo-com.svg'
import { useTheme } from '../hooks/useTheme'
import { useAudioSettings, setSoundVolume, setMusicVolume } from '../utils/audioSettings'
import LocalizedLink from './LocalizedLink'
import { SUPPORTED_LANGS } from '../i18n/languages'

type OpenMenu = 'lang' | 'sound' | null

export default function NavBar() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const { sound: soundVolume, music: musicVolume } = useAudioSettings()

  const langRef = useRef<HTMLDivElement>(null)
  const soundRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const inLang = langRef.current?.contains(target)
      const inSound = soundRef.current?.contains(target)
      if (!inLang && !inSound) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggle = (menu: Exclude<OpenMenu, null>) =>
    setOpenMenu((current) => (current === menu ? null : menu))

  const changeLanguage = (next: string) => {
    setOpenMenu(null)
    if (next === lang) return
    const rest = pathname.replace(`/${lang}`, '')
    navigate(`/${next}${rest}${search}`)
  }

  const isMuted = soundVolume === 0 && musicVolume === 0

  return (
    <nav className="landing-nav">
      <LocalizedLink to="/" className="landing-logo">misere4x4</LocalizedLink>

      <div className="nav-actions">

        <div className="sound-menu-container" ref={langRef}>
          <button
            className="sound-toggle"
            onClick={() => toggle('lang')}
            aria-label={t('nav.language')}
            aria-expanded={openMenu === 'lang'}
          >
            <img src={translateIcon} alt="" width={20} height={20} />
          </button>

          {openMenu === 'lang' && (
            <div className="sound-dropdown lang-dropdown">
              {SUPPORTED_LANGS.map((l) => (
                <button
                  key={l}
                  className={`lang-option${l === lang ? ' lang-option--active' : ''}`}
                  onClick={() => changeLanguage(l)}
                  aria-current={l === lang ? 'true' : undefined}
                  lang={l}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sound-menu-container" ref={soundRef}>
          <button
            className="sound-toggle"
            onClick={() => toggle('sound')}
            aria-label={t('nav.audioSettings')}
            aria-expanded={openMenu === 'sound'}
          >
            <img src={isMuted ? speakerCrossed : speaker} alt="" width={20} height={20} />
          </button>

          {openMenu === 'sound' && (
            <div className="sound-dropdown">

              <div className="sound-control">
                <img
                  src={soundVolume === 0 ? speakerCrossed : speaker}
                  alt={t('nav.soundEffects')}
                  width={20}
                  height={20}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  aria-label={t('nav.soundVolume')}
                />
              </div>

              <div className="sound-control">
                <img
                  src={musicVolume === 0 ? musicCrossed : music}
                  alt={t('nav.music')}
                  width={20}
                  height={20}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  aria-label={t('nav.musicVolume')}
                />
              </div>

            </div>
          )}
        </div>

        <button className="theme-toggle" onClick={toggleTheme} aria-label={t('nav.toggleTheme')}>
          <img src={theme === 'dark' ? sunUrl : moonUrl} alt="" width={20} height={20} />
        </button>
      </div>
    </nav>
  )
}