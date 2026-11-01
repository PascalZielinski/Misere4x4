import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { COOKIE_CONSENT_KEY } from '../utils/cookieConsent'
import './CookieConsent.css'

type ConsentChoice = 'accepted' | 'denied'

function readConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY)
    return value === 'accepted' || value === 'denied' ? value : null
  } catch (error) {
    console.error('Could not read cookie consent from localStorage.', error)
    return null
  }
}

export default function CookieConsent() {
  const { t } = useTranslation()
  const [choice, setChoice] = useState<ConsentChoice | null>(readConsent)
  const [storageError, setStorageError] = useState(false)

  if (choice) return null

  const choose = (nextChoice: ConsentChoice) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, nextChoice)
      if (nextChoice === 'denied') {
        document.cookie = 'theme=; path=/; max-age=0; SameSite=Lax'
      }
      setChoice(nextChoice)
    } catch (error) {
      console.error('Could not save cookie consent to localStorage.', error)
      setStorageError(true)
    }
  }

  return (
    <div className="cookie-consent-positioner">
      <section
        className="cookie-consent-dialog"
        aria-label={t('cookieConsent.title')}
      >
        <p className="cookie-consent-message">
          <Trans
            i18nKey="cookieConsent.message"
            components={{
              policyLink: <a className="cookie-consent-link" href="/cookieTos" />,
            }}
          />
        </p>
        {storageError && (
          <p className="cookie-consent-error" role="alert">
            {t('cookieConsent.storageError')}
          </p>
        )}
        <div className="cookie-consent-actions">
          <button type="button" onClick={() => choose('denied')}>
            {t('cookieConsent.deny')}
          </button>
          <button type="button" onClick={() => choose('accepted')}>
            {t('cookieConsent.accept')}
          </button>
        </div>
      </section>
    </div>
  )
}
