import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import './Onlinepage.css'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'

// Absichtlich unrealistische Zahlen, zwischen denen hin- und hergewechselt wird
const QUEUE_NUMBERS = [2029, 42, 99999, 7, 12345, 2029, 3, 65432, 0, 2029]

export default function OnlinePage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const navigate = useNavigate()
  const [inQueue, setInQueue] = useState(false)
  const [queueCount, setQueueCount] = useState(QUEUE_NUMBERS[0])

  useEffect(() => {
    if (!inQueue) return
    const id = setInterval(() => {
      const next = QUEUE_NUMBERS[Math.floor(Math.random() * QUEUE_NUMBERS.length)]
      setQueueCount(next)
    }, 1200)
    return () => clearInterval(id)
  }, [inQueue])

  const startQueue = () => {
    setQueueCount(QUEUE_NUMBERS[0])
    setInQueue(true)
  }

  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <div className="landing-buttons">
          <button
            className="landing-btn landing-btn--primary"
            onClick={startQueue}
            disabled={inQueue}
          >
            {t('online.queue')}
          </button>
          <button
            className="landing-btn"
            onClick={() => navigate(`/${lang}/online/private`)}
            disabled={inQueue}
          >
            {t('online.privateGame')}
          </button>
        </div>

        {inQueue && (
          <div className="queue-panel">
            <p className="queue-count" role="status" aria-live="polite">
              <span className="queue-number">{queueCount.toLocaleString()}</span>
              <span className="queue-label">
                {' '}{t('online.playersInQueue')}
              </span>
            </p>
            <button
              className="landing-btn landing-btn--ghost"
              onClick={() => setInQueue(false)}
            >
              {t('online.leaveQueue')}
            </button>
          </div>
        )}
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