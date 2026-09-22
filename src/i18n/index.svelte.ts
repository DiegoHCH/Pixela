/**
 * Internacionalización. Español por defecto, inglés al lado desde el principio:
 * añadir un idioma después obliga a recorrer todas las pantallas otra vez.
 */

import { readString, writeString } from '../state/storage'
import en from './en'
import es from './es'

export const LOCALES = ['es', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export type MessageKey = keyof typeof es

const DICTS: Record<Locale, Record<MessageKey, string>> = { es, en }
const KEY = 'pixela:locale'

function initial(): Locale {
  const saved = readString(KEY)
  if (saved === 'es' || saved === 'en') return saved
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
    writeString(KEY, locale)
    document.documentElement.lang = locale
  }

  /**
   * El texto de una clave, con los valores metidos en sus huecos `{así}`.
   * Si falta la traducción devuelve la clave: el hueco se ve, no se esconde.
   */
  t(key: MessageKey, values?: Record<string, string | number>): string {
    const raw = DICTS[this.#locale][key] ?? es[key] ?? key
    if (!values) return raw
    return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    )
  }
}

export const i18n = new I18nState()
