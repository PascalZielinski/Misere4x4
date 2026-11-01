import { useState } from 'react'
import { hasAcceptedCookieConsent } from '../utils/cookieConsent'

export type Theme = 'light' | 'dark'

function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    if (hasAcceptedCookieConsent()) {
      document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`
    }
    setTheme(next)
  }

  return { theme, toggleTheme }
}