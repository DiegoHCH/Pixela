import { describe, expect, it } from 'vitest'

import { exportFileName, slugify } from './export'

describe('slugify', () => {
  it('quita tildes, espacios y mayúsculas', () => {
    expect(slugify('Mi Cañón Favorito')).toBe('mi-canon-favorito')
    expect(slugify('  foto   del   verano ')).toBe('foto-del-verano')
  })

  it('no deja caracteres que rompan un nombre de archivo', () => {
    expect(slugify('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j')
  })

  it('devuelve vacío cuando no queda nada utilizable', () => {
    expect(slugify('')).toBe('')
    expect(slugify('???')).toBe('')
  })
})

describe('exportFileName', () => {
  it('el patrón completo lleva su tamaño en cuentas', () => {
    expect(exportFileName({ source: 'atardecer.jpg', cols: 58, rows: 29 })).toBe(
      'atardecer-patron-58x29.png',
    )
  })

  it('una placa suelta lleva su número', () => {
    expect(exportFileName({ source: 'atardecer.jpg', cols: 58, rows: 29, board: 3 })).toBe(
      'atardecer-placa-3.png',
    )
  })

  it('quita la extensión de origen, sea cual sea', () => {
    for (const source of ['seta.png', 'seta.JPEG', 'seta.webp', 'seta']) {
      expect(exportFileName({ source, cols: 44, rows: 38 })).toBe('seta-patron-44x38.png')
    }
  })

  it('no confunde un punto del nombre con una extensión', () => {
    expect(exportFileName({ source: 'vacaciones 2026.07.jpg', cols: 29, rows: 29 })).toBe(
      'vacaciones-2026-07-patron-29x29.png',
    )
  })

  it('aguanta un nombre imposible', () => {
    expect(exportFileName({ source: '.png', cols: 29, rows: 29 })).toBe('pixela-patron-29x29.png')
    expect(exportFileName({ source: '', cols: 29, rows: 29, board: 1 })).toBe('pixela-placa-1.png')
  })
})
