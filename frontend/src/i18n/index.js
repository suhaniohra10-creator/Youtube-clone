import { useEffect, useState } from 'react'
import { loadPrefs } from '../utils/account'
import { STRINGS } from './strings'

export function t(key, lang) {
  const locale = lang || loadPrefs().language || 'en'
  return STRINGS[locale]?.[key] || STRINGS.en[key] || key
}

export function applyLanguage(id) {
  document.documentElement.lang = id || 'en'
}

export function useI18n() {
  const [lang, setLang] = useState(() => loadPrefs().language || 'en')

  useEffect(() => {
    function refresh(event) {
      const next = event.detail?.language || loadPrefs().language || 'en'
      setLang(next)
      applyLanguage(next)
    }
    applyLanguage(lang)
    window.addEventListener('yt-prefs-change', refresh)
    return () => window.removeEventListener('yt-prefs-change', refresh)
  }, [lang])

  return {
    lang,
    t: (key) => t(key, lang),
  }
}

applyLanguage(loadPrefs().language)
