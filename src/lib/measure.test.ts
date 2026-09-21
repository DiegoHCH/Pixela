import { describe, expect, it } from 'vitest'

import { MIDI_PITCH_MM, formatCm, formatSize, physicalSize, pinSpanMm } from './measure'

describe('physicalSize', () => {
  it('una placa de 29 cuentas mide 14,5 cm de plástico', () => {
    expect(physicalSize(29, 29)).toEqual({ widthMm: 145, heightMm: 145 })
  })

  it('el montaje de tres por cuatro placas', () => {
    // 87 × 116 cuentas: el patrón del retrato.
    expect(formatSize(physicalSize(87, 116))).toBe('43,5 × 58,0 cm')
  })

  it('cuatro por cuatro es un cuadrado de 58', () => {
    expect(formatSize(physicalSize(116, 116))).toBe('58,0 × 58,0 cm')
  })

  it('con otro paso, todo encoge', () => {
    // Si la placa midiera 14 cm de borde a borde, el paso sería 4,83 mm.
    expect(formatSize(physicalSize(116, 116, 140 / 29))).toBe('56,0 × 56,0 cm')
  })

  it('protesta con entradas imposibles', () => {
    expect(() => physicalSize(0, 10)).toThrow(/rejilla/i)
    expect(() => physicalSize(10, 10, 0)).toThrow(/paso/i)
  })
})

describe('pinSpanMm', () => {
  it('son los huecos y no los pines: 29 pines dan 14 cm', () => {
    // La confusión habitual al medir una placa con una regla.
    expect(pinSpanMm(29)).toBe(140)
    expect(pinSpanMm(29)).toBeLessThan(physicalSize(29, 29).widthMm)
  })

  it('un solo pin no abarca nada', () => {
    expect(pinSpanMm(1)).toBe(0)
  })
})

describe('formatCm', () => {
  it('en centímetros, con coma y una decimal', () => {
    expect(formatCm(145)).toBe('14,5')
    expect(formatCm(580)).toBe('58,0')
  })

  it('el paso por defecto es el midi', () => {
    expect(MIDI_PITCH_MM).toBe(5)
  })
})
