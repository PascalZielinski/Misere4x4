import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import { useAudioSettings } from '../utils/audioSettings'
import musicSrc from '../assets/samuelfjohanns-obey-your-mechanic-majesty-03-108930.mp3'
import './Adminpage.css'

const PASSWORD = 'LOUVRE'

export default function AdminPage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [failed, setFailed] = useState(false)

  // Musik
  const musicRef = useRef<HTMLAudioElement>(null)
  const { music } = useAudioSettings()

  // Volume an Setting koppeln
  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = music / 100
  }, [music])

  // Play beim Mount + Pause beim Unmount
  // (Autoplay wird ggf. vom Browser blockiert → Fallback unten)
  useEffect(() => {
    const a = musicRef.current
    if (!a) return
    a.loop = true

    function tryPlay() {
      a!.play().catch(() => {})
    }

    // Direkt versuchen
    tryPlay()

    // Falls Autoplay blockiert: beim ersten Klick/Tastendruck starten
    const events = ['pointerdown', 'pointerup', 'keydown'] as const
    function remove() {
      events.forEach((e) => window.removeEventListener(e, tryPlay))
    }
    events.forEach((e) => window.addEventListener(e, tryPlay))
    // Nach erfolgreichem Play entfernen
    const onPlaying = () => remove()
    a.addEventListener('playing', onPlaying)

    return () => {
      remove()
      a.removeEventListener('playing', onPlaying)
      a.pause()
      a.currentTime = 0
    }
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (password === PASSWORD) {
      sessionStorage.setItem('adminUser', user.trim() || 'Administrator')
      navigate(`/${lang}/admin/dashboard`, { replace: true })
    } else {
      setFailed(true)
      setPassword('')
    }
  }

  return (
    <div className="admin">
      <audio ref={musicRef} src={musicSrc} preload="auto" loop hidden />
      <NavBar />
      <main className="admin-main">
        <form
          className={`admin-panel${failed ? ' admin-panel--failed' : ''}`}
          onSubmit={submit}
          autoComplete="off"
        >
          <p className="admin-title">{t('admin.title')}</p>

          <label className="admin-field">
            <span className="admin-label">{t('admin.user')}</span>
            <input
              className="admin-input"
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Administrator"
              spellCheck={false}
              autoCapitalize="off"
              autoFocus
            />
          </label>

          <label className="admin-field">
            <span className="admin-label">{t('admin.password')}</span>
            <input
              className="admin-input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setFailed(false)
              }}
              placeholder="••••••"
              spellCheck={false}
            />
          </label>

          {failed && (
            <p className="admin-error" role="alert">
              {t('admin.denied')}
            </p>
          )}

          <button className="admin-btn" type="submit">
            {t('admin.login')}
          </button>
        </form>
      </main>
    </div>
  )
}