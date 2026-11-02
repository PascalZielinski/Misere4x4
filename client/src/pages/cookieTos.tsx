import { useTranslation } from 'react-i18next'
import LocalizedLink from '../components/LocalizedLink'
import NavBar from '../components/NavBar'
import './landingpage.css'
import './cookieTos.css'

export default function CookieTosPage() {
  const { t } = useTranslation()

  return (
    <div className="landing cookie-tos-layout">
      <NavBar />
      <main className="cookie-tos-page">
        <p>{t('cookiePolicy.themePreference')}</p>
      </main>
      <footer className="site-footer">
        <LocalizedLink to="/" className="footer-link">
          {t('licenses.backHome')}
        </LocalizedLink>
      </footer>
    </div>
  )
}
