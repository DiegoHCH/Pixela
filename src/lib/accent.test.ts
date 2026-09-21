import { describe, expect, it } from 'vitest'

import { ACCENT_INK, BAND, FALLBACK_ACCENT, accentOf, characteristicBead, deriveAccent } from './accent'
import { hexToRgb, rgbToHsl } from './color'
import { DEFAULT_PALETTE } from './palette'
import type { Pattern, Theme } from './types'
import { SIN_CUENTA } from './types'

const ROJO = 1 // C02
const GRIS = 2 // C03
const BLANCO = 6 // C07
const NEGRO = 14 // C15
const CELESTE = 15 // C16

function pattern(cells: number[]): Pattern {
  return { cols: cells.length, rows: 1, cells: Int16Array.from(cells) }
}

describe('la paleta que usan estas pruebas', () => {
  it('sigue estando donde cree que está', () => {
    expect(DEFAULT_PALETTE[ROJO].name).toBe('Rojo')
    expect(DEFAULT_PALETTE[GRIS].name).toBe('Gris')
    expect(DEFAULT_PALETTE[BLANCO].name).toBe('Blanco')
    expect(DEFAULT_PALETTE[NEGRO].name).toBe('Negro')
    expect(DEFAULT_PALETTE[CELESTE].name).toBe('Celeste')
  })
})

describe('deriveAccent', () => {
  it('conserva tu tono', () => {
    // La apuesta entera: el acento es el color de tu patrón, no un color nuevo.
    for (const theme of ['day', 'night'] as Theme[]) {
      const origen = rgbToHsl(...hexToRgb('#FD274A'))[0]
      const derivado = rgbToHsl(...hexToRgb(deriveAccent('#FD274A', theme)))[0]
      // Medio grado de margen: lo que se pierde al volver a 8 bits por canal.
      expect(Math.abs(derivado - origen)).toBeLessThan(0.5)
    }
  })

  it('mete la luminosidad en la banda de cada tema', () => {
    for (const theme of ['day', 'night'] as Theme[]) {
      const band = BAND[theme]
      for (const hex of DEFAULT_PALETTE.map((b) => b.hex)) {
        const [, s, l] = rgbToHsl(...hexToRgb(deriveAccent(hex, theme)))
        expect(l).toBeGreaterThanOrEqual(band.lMin - 0.01)
        expect(l).toBeLessThanOrEqual(band.lMax + 0.01)
        expect(s).toBeGreaterThanOrEqual(band.sMin - 0.01)
        expect(s).toBeLessThanOrEqual(band.sMax + 0.01)
      }
    }
  })

  it('de día empuja hacia abajo y de noche hacia arriba', () => {
    const dia = rgbToHsl(...hexToRgb(deriveAccent('#FD274A', 'day')))[2]
    const noche = rgbToHsl(...hexToRgb(deriveAccent('#FD274A', 'night')))[2]
    expect(dia).toBeLessThan(noche)
  })

  it('devuelve hex normalizado', () => {
    expect(deriveAccent('#fd274a', 'day')).toBe('#E81739')
    expect(deriveAccent('#FD274A', 'night')).toBe('#EE3654')
  })
})

describe('characteristicBead', () => {
  it('elige el color que identifica la pieza, no el que más hay', () => {
    // Fondo gris de sobra y cuatro cuentas rojas: la pieza es roja.
    const p = pattern([GRIS, GRIS, GRIS, GRIS, GRIS, GRIS, ROJO, ROJO, ROJO, ROJO])
    expect(characteristicBead(p, DEFAULT_PALETTE)).toBe(ROJO)
  })

  it('con varios colores con carácter se queda con el más frecuente', () => {
    const p = pattern([CELESTE, CELESTE, CELESTE, ROJO, ROJO])
    expect(characteristicBead(p, DEFAULT_PALETTE)).toBe(CELESTE)
  })

  it('sin patrón no hay color característico', () => {
    expect(characteristicBead(pattern([SIN_CUENTA, SIN_CUENTA]), DEFAULT_PALETTE)).toBe(-1)
  })
})

describe('accentOf', () => {
  it('se pone del color del patrón', () => {
    const p = pattern([GRIS, GRIS, GRIS, ROJO, ROJO])
    expect(accentOf(p, DEFAULT_PALETTE, 'day')).toBe(deriveAccent(DEFAULT_PALETTE[ROJO].hex, 'day'))
  })

  it('cambia de color al cambiar de patrón', () => {
    const seta = pattern([ROJO, ROJO, BLANCO])
    const pez = pattern([CELESTE, CELESTE, BLANCO])
    expect(accentOf(seta, DEFAULT_PALETTE, 'day')).not.toBe(accentOf(pez, DEFAULT_PALETTE, 'day'))
  })

  it('no le inventa un tono a un patrón sin color', () => {
    // Una silueta en blanco y negro no tiene tono que heredar. Forzar la banda
    // de saturación sobre un gris produce un rojo que no está en el patrón, así
    // que aquí se usa el acento de reserva y se deja de derivar.
    const bn = pattern([NEGRO, NEGRO, NEGRO, BLANCO, BLANCO])
    expect(accentOf(bn, DEFAULT_PALETTE, 'day')).toBe(FALLBACK_ACCENT.day)
    expect(accentOf(bn, DEFAULT_PALETTE, 'night')).toBe(FALLBACK_ACCENT.night)
  })

  it('sin patrón abierto, el acento de reserva', () => {
    const vacio = pattern([SIN_CUENTA])
    expect(accentOf(vacio, DEFAULT_PALETTE, 'day')).toBe(FALLBACK_ACCENT.day)
  })
})

describe('las constantes del sistema de diseño', () => {
  it('no se han movido', () => {
    expect(FALLBACK_ACCENT).toEqual({ day: '#D93B28', night: '#E8705F' })
    expect(ACCENT_INK).toEqual({ day: '#FFFFFF', night: '#10191A' })
  })
})
