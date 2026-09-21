/**
 * Conversiones de color. Puras y deterministas.
 *
 * Un error aquí no rompe nada: devuelve colores un poco equivocados para
 * siempre, y no se ve. Por eso este archivo es el que más test tiene.
 */

import type { HSL, Lab, RGB } from './types'

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

export function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

export function hexToRgb(hex: string): RGB {
  const m = HEX.exec(hex.trim())
  if (!m) throw new Error(`Color hexadecimal inválido: ${hex}`)
  let h = m[1]
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => clamp8(v).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase()
}

/** Deshace la curva de sRGB: el canal pasa de «como se guarda» a «cuánta luz es». */
export function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

/** sRGB (0–255) → CIELAB, con blanco de referencia D65. */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)

  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(X)
  const fy = f(Y)
  const fz = f(Z)

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/**
 * Distancia perceptual al cuadrado (ΔE76 sin la raíz).
 *
 * Sin raíz porque sólo se usa para comparar cuál es menor, y esta función se
 * llama millones de veces por patrón. La raíz es monótona: no cambia el orden.
 */
export function labDistanceSq(a: Lab, b: Lab): number {
  const dl = a[0] - b[0]
  const da = a[1] - b[1]
  const db = a[2] - b[2]
  return dl * dl + da * da + db * db
}

/** ΔE76 de verdad, para cuando el número se le enseña a alguien. */
export function deltaE76(a: Lab, b: Lab): number {
  return Math.sqrt(labDistanceSq(a, b))
}

/** RGB (0–255) → HSL, con H en grados 0–360 y S/L en 0–1. */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const mx = Math.max(rr, gg, bb)
  const mn = Math.min(rr, gg, bb)
  const l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]

  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let h: number
  if (mx === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0)
  else if (mx === gg) h = (bb - rr) / d + 2
  else h = (rr - gg) / d + 4
  return [h * 60, s, l]
}

/** HSL → RGB (0–255), sin redondear: quien lo necesite entero que use `clamp8`. */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const hn = (((h % 360) + 360) % 360) / 360
  if (s === 0) {
    const v = l * 255
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t: number) => {
    const tt = (t + 1) % 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return [hue(hn + 1 / 3) * 255, hue(hn) * 255, hue(hn - 1 / 3) * 255]
}
