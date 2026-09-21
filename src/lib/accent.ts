/**
 * El acento: la app no tiene color de marca.
 *
 * Sale del color característico del patrón abierto — montas una seta roja y la
 * interfaz se pone roja. El tono es siempre el tuyo; luminosidad y saturación
 * se fuerzan a una banda que garantiza contraste sobre el panel de cada tema.
 */

import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from './color'
import { countBeads } from './quantize'
import type { Palette, Pattern, Theme } from './types'

/**
 * De día la banda empuja hacia abajo para aguantar sobre el plástico lechoso;
 * de noche hacia arriba, para aguantar sobre el ahumado.
 */
export const BAND: Record<Theme, { sMin: number; sMax: number; lMin: number; lMax: number }> = {
  day: { sMin: 0.42, sMax: 0.82, lMin: 0.34, lMax: 0.5 },
  night: { sMin: 0.46, sMax: 0.84, lMin: 0.56, lMax: 0.7 },
}

/** El color de tinta que se lee encima del acento de cada tema. */
export const ACCENT_INK: Record<Theme, string> = {
  day: '#FFFFFF',
  night: '#10191A',
}

export function deriveAccent(hex: string, theme: Theme): string {
  const b = BAND[theme]
  const [h, s, l] = rgbToHsl(...hexToRgb(hex))
  const rgb = hslToRgb(
    h,
    Math.max(b.sMin, Math.min(s, b.sMax)),
    Math.max(b.lMin, Math.min(l, b.lMax)),
  )
  return rgbToHex(rgb[0], rgb[1], rgb[2])
}

/** Un color con carácter: ni un gris, ni un casi-negro, ni un casi-blanco. */
export function hasCharacter(hex: string): boolean {
  const [, s, l] = rgbToHsl(...hexToRgb(hex))
  return s > 0.3 && l > 0.2 && l < 0.74
}

/**
 * El color característico, que no es el más frecuente: el más frecuente casi
 * siempre es el fondo o el relleno, o sea el que menos identifica la pieza.
 *
 * Devuelve el índice en la paleta, o `-1` si el patrón está vacío.
 */
export function characteristicBead(pattern: Pattern, palette: Palette): number {
  const counts = countBeads(pattern)
  if (counts.length === 0) return -1
  const withCharacter = counts.find((c) => hasCharacter(palette[c.index].hex))
  return (withCharacter ?? counts[0]).index
}

/**
 * El acento del patrón para un tema.
 *
 * Si el patrón no tiene ningún color con carácter —una silueta en blanco y
 * negro, por ejemplo— se usa el acento de reserva y no se deriva nada. Forzar
 * la banda de saturación sobre un gris le inventa un tono que no está en el
 * patrón: un blanco puro sale rojo, que es exactamente lo que la apuesta de
 * «el acento sale de tu patrón» no debería hacer.
 */
export function accentOf(pattern: Pattern, palette: Palette, theme: Theme): string {
  const i = characteristicBead(pattern, palette)
  if (i < 0 || !hasCharacter(palette[i].hex)) return FALLBACK_ACCENT[theme]
  return deriveAccent(palette[i].hex, theme)
}

/** Sólo para cuando no hay patrón abierto: en cuanto hay uno, manda el patrón. */
export const FALLBACK_ACCENT: Record<Theme, string> = {
  day: '#D93B28',
  night: '#E8705F',
}
