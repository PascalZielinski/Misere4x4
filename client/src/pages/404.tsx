import { useTranslation } from 'react-i18next'
import LocalizedLink from '../components/LocalizedLink'
import './404.css'

const ROWS = 15 
const ITEMS = 30

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="not-found">
      <div className="not-found-bg" aria-hidden="true">
        {Array.from({ length: ROWS }, (_, i) => {
          if (i % 3 !== 1) return <div key={i} className="not-found-row" />

          const goRight = Math.floor(i / 3) % 2 === 0
          return (
            <div key={i} className="not-found-row">
              <div
                className={
                  'not-found-track ' +
                  (goRight ? 'not-found-track--right' : 'not-found-track--left')
                }
                style={{ animationDelay: `${-(i * 7)}s` }}
              >
                {Array.from({ length: ITEMS * 2 }, (_, k) => (
                  <span key={k} className="not-found-item">404</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="not-found-content">
        <h1>404</h1>
        <p>{t('notFound.text')}</p>
        <LocalizedLink to="/">{t('notFound.back')}</LocalizedLink>
      </div>
    </div>
  )
}