import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import de from "../locales/de.json"
import en from "../locales/en.json"
import { DEFAULT_LANG } from "./languages"

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false },
})

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng
  localStorage.setItem("lang", lng)
})

export default i18n