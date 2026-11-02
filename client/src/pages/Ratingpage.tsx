//#region Imports
// MARK: - Imports
import { Fragment, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import './Ratingpage.css'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'
//#endregion

//#region Rating configuration
// MARK: - Rating configuration
const WEBHOOK = import.meta.env.VITE_WEBHOOK as string | undefined
const MAX_COMMENT = 255
const MIN_RATING = 3
const PULSE_MS = 600

type Status = 'idle' | 'sending' | 'success' | 'error'
//#endregion

//#region Rating page
// MARK: - Rating page
export default function RatingPage() {
  //#region Form state
  // MARK: Form state
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [pulse, setPulse] = useState(false)
  const pulseTimer = useRef<number | undefined>(undefined)
  //#endregion

  //#region Form actions
  // MARK: Form actions
  const triggerPulse = () => {
    window.clearTimeout(pulseTimer.current)
    setPulse(false)
    requestAnimationFrame(() => {
      setPulse(true)
      pulseTimer.current = window.setTimeout(() => setPulse(false), PULSE_MS)
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating === 0 || rating < MIN_RATING) {
      triggerPulse();
      return;
    }
    if (!WEBHOOK) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      const content = `New Rating: ${rating}/5\nComment: ${comment.trim() || 'No comment provided'}`;
      const res = await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('success');
      setRating(0);
      setComment('');
    } catch {
      setStatus('error');
    }
  };
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <div className="landing">
      <NavBar />

      <main className="landing-main">
        <form className="rating-panel" onSubmit={submit} noValidate>
          <h1 className="rating-title">{t('rating.title')}</h1>
          <p className="rating-subtitle">{t('rating.subtitle')}</p>

          <div
            className={`rating${pulse ? ' is-pulsing' : ''}`}
            role="radiogroup"
            aria-label={t('rating.title')}
          >
            {[5, 4, 3, 2, 1].map((v) => (
              <Fragment key={v}>
                <input
                  type="radio"
                  name="rating"
                  id={`star${v}`}
                  value={v}
                  checked={rating === v}
                  onChange={() => {
                    setRating(v)
                    if (status !== 'idle') setStatus('idle')
                  }}
                />
                <label
                  htmlFor={`star${v}`}
                  aria-label={`${v} ${v === 1 ? t('rating.star') : t('rating.stars')}`}
                />
              </Fragment>
            ))}
          </div>

          <label className="rating-field">
            <span className="rating-label">{t('rating.comment')}</span>
            <textarea
              className="rating-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
              placeholder={t('rating.placeholder')}
              maxLength={MAX_COMMENT}
              rows={4}
              spellCheck={false}
            />
            <span
              className={`rating-counter${comment.length >= MAX_COMMENT ? ' is-full' : ''}`}
            >
              {comment.length} / {MAX_COMMENT}
            </span>
          </label>

          {status === 'error' && (
            <p className="landing-error" role="alert">
              {t('rating.error')}
            </p>
          )}
          {status === 'success' && (
            <p className="rating-success" role="status">
              {t('rating.success')}
            </p>
          )}

          <button
            type="submit"
            className="landing-btn landing-btn--primary"
            disabled={status === 'sending'}
          >
            {status === 'sending' ? t('rating.sending') : t('rating.submit')}
          </button>
        </form>
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
  //#endregion
}
//#endregion