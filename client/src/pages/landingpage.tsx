import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import './landingpage.css'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'
import PumpkinCarver from '../components/PumpkinCarver'

const SERVER = import.meta.env.VITE_SERVER as string | undefined
// Debug: Server-Check überspringen, wenn VITE_DEBUG=true gesetzt ist
const DEBUG = import.meta.env.VITE_DEBUG === 'true'

async function pingServer(): Promise<boolean> {
  if (!SERVER) return false
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 3000)
  try {
    await fetch(`${SERVER}/health`, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export default function LandingPage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [checking, setChecking] = useState(false)
  const [serverDown, setServerDown] = useState(false)

  const isDebug = DEBUG || searchParams.get('debug') === '1'

  const goOnline = async () => {
    if (isDebug) {

      navigate(`/${lang}/online`)
      return
    }

    setChecking(true)
    setServerDown(false)
    const ok = await pingServer()
    setChecking(false)
    if (ok) navigate(`/${lang}/online`)
    else setServerDown(true)
  }

  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <div className="landing-buttons">
          <div className="landing-pumpkin-stack">
            <PumpkinCarver />
            <LocalizedLink to="/local" className="landing-btn landing-btn--primary">
              {t('landing.playLocal')}
            </LocalizedLink>
          </div>
          <button className="landing-btn" onClick={goOnline} disabled={checking}>
            {checking
              ? t('landing.checkingServer')
              : isDebug
                ? `${t('landing.playOnline')} (Debug)`
                : t('landing.playOnline')}
          </button>
          <LocalizedLink to="/tutorial" className="landing-btn landing-btn--ghost">
            {t('landing.tutorial')}
          </LocalizedLink>
        </div>
        {serverDown && (
          <p className="landing-error" role="alert">
            {t('landing.serverDown')}
          </p>
        )}
      </main>

      <footer className="site-footer">
        <div className="site-footer__item site-footer__item--rating">
          <LocalizedLink to="/rating" className="footer-link">
            {t('landing.rating')}
          </LocalizedLink>
        </div>
        <div className="site-footer__item site-footer__item--license">
          <LocalizedLink to="/licenses" className="footer-link">
            {t('landing.licensesCredits')}
          </LocalizedLink>
        </div>
        <div className="site-footer__item site-footer__item--admin">
          <LocalizedLink to="/admin" className="footer-link">
            {t('landing.admin')}
          </LocalizedLink>
        </div>
      </footer>
    </div>
  )
}