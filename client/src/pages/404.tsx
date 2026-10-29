import { useTranslation } from 'react-i18next'
import LocalizedLink from '../components/LocalizedLink'
import './404.css'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="not-found">
      <h1>404</h1>
      <p>{t('notFound.text')}</p>
      <LocalizedLink to="/">{t('notFound.back')}</LocalizedLink>
    </div>
  )
}