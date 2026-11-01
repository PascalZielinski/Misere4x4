import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import './Onlinepage.css'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'
import { getQueueStatus, joinQueue, leaveQueue, type QueueState } from '../api/queue'

export default function QueuePage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const navigate = useNavigate()
  const [queueState, setQueueState] = useState<QueueState | null>(null)
  const [error, setError] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const applyQueueState = useCallback((next: QueueState) => {
    setQueueState(next)
    if (next.status === 'matched' && next.roomUuid) {
      navigate(`/${lang}/online/private/room/${next.roomUuid}`, { replace: true })
    }
  }, [lang, navigate])

  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const next = await getQueueStatus()
        if (active) {
          setError(false)
          applyQueueState(next)
        }
      } catch {
        if (active) setError(true)
      }
    }

    void joinQueue()
      .then((next) => {
        if (active) {
          setError(false)
          applyQueueState(next)
        }
      })
      .catch(() => {
        if (active) setError(true)
      })

    const interval = window.setInterval(() => void poll(), 1500)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [applyQueueState])

  const onLeaveQueue = async () => {
    setLeaving(true)
    try {
      await leaveQueue()
      navigate(`/${lang}/online`)
    } catch {
      setError(true)
      setLeaving(false)
    }
  }

  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <div className="queue-panel">
          {error ? (
            <p className="online-token-error" role="alert">{t('online.queueError')}</p>
          ) : (
            <p className="queue-count" role="status" aria-live="polite">
              <span className="queue-number">
                {(queueState?.queueCount ?? 0).toLocaleString()}
              </span>
              <span className="queue-label">{' '}{t('online.playersInQueue')}</span>
            </p>
          )}
          <button
            className="landing-btn landing-btn--ghost"
            onClick={() => void onLeaveQueue()}
            disabled={leaving}
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
