import { useLocation, useNavigate, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { SUPPORTED_LANGS } from "../i18n/languages"

export default function LanguageSwitcher() {
  const { lang } = useParams()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const change = (next: string) => {
    const rest = pathname.replace(`/${lang}`, "")
    navigate(`/${next}${rest}${search}`)
  }

  return (
    <select value={lang} onChange={(e) => change(e.target.value)} aria-label={t("common.language")}>
      {SUPPORTED_LANGS.map((l) => (
        <option key={l} value={l}>{l.toUpperCase()}</option>
      ))}
    </select>
  )
}