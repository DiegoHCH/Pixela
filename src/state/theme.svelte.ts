/**
 * El tema. Por defecto sigue al sistema; el conmutador manual se recuerda.
 *
 * Vive fuera de `lib/` porque toca `localStorage` y el DOM, y `lib/` es puro.
 */

import { ACCENT_INK, FALLBACK_ACCENT } from '../lib/accent'
import type { Theme } from '../lib/types'
import { readString, removeKey, writeString } from './storage'

const KEY = 'pixela:theme'

function systemTheme(): Theme {
  if (typeof window === 'undefined') return 'day'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
}

function stored(): Theme | null {
  const v = readString(KEY)
  return v === 'day' || v === 'night' ? v : null
}

class ThemeState {
  /** `null` = sin elección manual, o sea seguir al sistema. */
  #manual = $state<Theme | null>(stored())
  #system = $state<Theme>(systemTheme())

  get current(): Theme {
    return this.#manual ?? this.#system
  }

  get followsSystem(): boolean {
    return this.#manual === null
  }

  set(theme: Theme): void {
    this.#manual = theme
    writeString(KEY, theme)
    apply(theme)
  }

  toggle(): void {
    this.set(this.current === 'day' ? 'night' : 'day')
  }

  /** Vuelve a seguir al sistema. */
  clear(): void {
    this.#manual = null
    removeKey(KEY)
    apply(this.current)
  }

  /** Se llama una vez al arrancar: engancha el tema y escucha al sistema. */
  start(): void {
    apply(this.current)
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        this.#system = e.matches ? 'night' : 'day'
        if (this.followsSystem) apply(this.current)
      })
  }
}

function apply(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light'
}

export const theme = new ThemeState()

/**
 * El acento del patrón abierto, pisando el de reserva. La app no tiene color
 * de marca: esto es la identidad entera.
 */
export function applyAccent(hex: string | null, current: Theme): void {
  const root = document.documentElement
  const accent = hex ?? FALLBACK_ACCENT[current]
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-ink', ACCENT_INK[current])
}
