export const SUPPORTED_LANGS = ["de", "en"] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]
export const DEFAULT_LANG: Lang = "en"

export function isSupported(lang: string | undefined): lang is Lang {
  return !!lang && (SUPPORTED_LANGS as readonly string[]).includes(lang)
}

export function detectLanguage(): Lang {
  const saved = localStorage.getItem("lang")
  if (isSupported(saved ?? undefined)) return saved as Lang

  const browser = navigator.language.slice(0, 2)
  return isSupported(browser) ? browser : DEFAULT_LANG
}