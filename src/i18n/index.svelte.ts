/**
 * Internacionalización. Español por defecto, inglés al lado desde el principio:
 * añadir un idioma después obliga a recorrer todas las pantallas otra vez.
 */

import en from './en'
import es from './es'

export const LOCALES = ['es', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export type MessageKey = keyof typeof es

const DICTS: Record<Locale, Record<MessageKey, string>> = { es, en }
const KEY = 'pixela:locale'

function initial(): Locale {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(KEY)
    if (saved === 'es' || saved === 'en') return saved
  }
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('en')) return 'en'
  return 'es'
}

class I18nState {
  #locale = $state<Locale>(initial())

  get locale(): Locale {
    return this.#locale
  }

  set(locale: Locale): void {
    this.#locale = locale
    localStorage?.setItem(KEY, locale)
    document.documentElement.lang = locale
  }

  /** Devuelve la clave si falta la traducción: se ve el hueco, no se esconde. */
  t(key: MessageKey): string {
    return DICTS[this.#locale][key] ?? es[key] ?? key
  }
}

export const i18n = new I18nState()
