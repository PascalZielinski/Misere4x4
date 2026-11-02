//#region Imports
// MARK: - Imports
import { useTranslation } from 'react-i18next'
import LocalizedLink from '../components/LocalizedLink'
import './401.css'
//#endregion

//#region Page constants
// MARK: - Page constants
const ROWS = 15
const ITEMS = 30
//#endregion

//#region Unauthorized page
// MARK: - Unauthorized page
export default function Unauthorized() {
  //#region Translations
  // MARK: Translations
  const { t } = useTranslation()
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <div className="unauthorized">
      <div className="unauthorized-bg" aria-hidden="true">
        {Array.from({ length: ROWS }, (_, i) => {
          if (i % 3 !== 1) return <div key={i} className="unauthorized-row" />

          const goRight = Math.floor(i / 3) % 2 === 0
          return (
            <div key={i} className="unauthorized-row">
              <div
                className={
                  'unauthorized-track ' +
                  (goRight ? 'unauthorized-track--right' : 'unauthorized-track--left')
                }
                style={{ animationDelay: `${-(i * 7)}s` }}
              >
                {Array.from({ length: ITEMS * 2 }, (_, k) => (
                  <span key={k} className="unauthorized-item">401</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="unauthorized-content">
        <p className="unauthorized-code" aria-hidden="true">401</p>
        <h1 className="unauthorized-title">
          {t('unauthorized.title')}
        </h1>
        <LocalizedLink to="/" className="unauthorized-btn">
          {t('unauthorized.home')}
        </LocalizedLink>
      </div>
    </div>
  )
  //#endregion
}
//#endregion