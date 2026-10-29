import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import './Onlinepage.css'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'

const QUEUE_NUMBERS = [2029, 2590, 1089, 2029, 2029]

export default function QueuePage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const navigate = useNavigate()
  const [queueCount, setQueueCount] = useState(QUEUE_NUMBERS[0])

  useEffect(() => {
    const id = setInterval(() => {
      const next = QUEUE_NUMBERS[Math.floor(Math.random() * QUEUE_NUMBERS.length)]
      setQueueCount(next)
    }, 1200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <div className="queue-panel">
          <p className="queue-count" role="status" aria-live="polite">
            <span className="queue-number">{queueCount.toLocaleString()}</span>
            <span className="queue-label">
              {' '}{t('online.playersInQueue')}
            </span>
          </p>
          <button
            className="landing-btn landing-btn--ghost"
            onClick={() => navigate(`/${lang}/online`)}
          >
            {t('online.leaveQueue')}
          </button>
        </div>
      </main>

      <footer className="site-footer">
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