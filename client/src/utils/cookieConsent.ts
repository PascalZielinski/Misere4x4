export const COOKIE_CONSENT_KEY = 'misere4x4:cookie-consent'

export function hasAcceptedCookieConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted'
  } catch {
    return false
  }
}
