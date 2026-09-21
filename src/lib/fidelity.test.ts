import { describe, expect, it } from 'vitest'

import { FAR_ENOUGH_TO_SAY, fidelity, isFar } from './fidelity'
import { DEFAULT_PALETTE, quantizable } from './palette'
import { quantize } from './quantize'
import type { CellGrid } from './types'

const PAL = quantizable(DEFAULT_PALETTE)

function flat(rgb: readonly number[], cols: number, rows: number, alpha = 255): CellGrid {
  const data = new Float32Array(cols * rows * 4)
  for (let i = 0; i < cols * rows; i++) {
    data[i * 4] = rgb[0]
    data[i * 4 + 1] = rgb[1]
    data[i * 4 + 2] = rgb[2]
    data[i * 4 + 3] = alpha
  }
  return { cols, rows, data }
}

describe('fidelity', () => {
  it('es cero cuando la imagen ya son colores de la paleta', () => {
    const rojo = PAL[1]
    const grid = flat(rojo.rgb, 8, 8)
    const f = fidelity(grid, quantize(grid, PAL, { dither: false }), PAL)
    expect(f.mean).toBeCloseTo(0, 6)
    expect(f.worst).toBeCloseTo(0, 6)
    expect(f.cells).toBe(64)
  })

  it('crece cuando la paleta no tiene ese color', () => {
    // Un verde azulado medio que el cajón no tiene.
    const grid = flat([70, 140, 120], 8, 8)
    const f = fidelity(grid, quantize(grid, PAL, { dither: false }), PAL)
    expect(f.mean).toBeGreaterThan(10)
  })

  it('no cuenta las celdas sin cuenta', () => {
    const grid = flat([253, 39, 74], 4, 4, 10)
    const f = fidelity(grid, quantize(grid, PAL, { dither: false }), PAL)
    expect(f.cells).toBe(0)
    expect(f.mean).toBe(0)
  })

  it('una paleta más rica se acerca más', () => {
    // Es la medida que importa: con qué paleta se parece más el patrón. Un
    // turquesa que la paleta corta —piel, rojo, gris— no puede dar.
    const grid = flat([60, 200, 190], 8, 8)
    const corta = PAL.slice(0, 3)
    const larga = PAL

    const conCorta = fidelity(grid, quantize(grid, corta, { dither: false }), corta)
    const conLarga = fidelity(grid, quantize(grid, larga, { dither: false }), larga)
    expect(conLarga.mean).toBeLessThan(conCorta.mean)
  })
})

describe('isFar', () => {
  it('avisa por encima del umbral y calla por debajo', () => {
    expect(isFar({ mean: FAR_ENOUGH_TO_SAY + 1, worst: 40, cells: 100 })).toBe(true)
    expect(isFar({ mean: FAR_ENOUGH_TO_SAY - 1, worst: 40, cells: 100 })).toBe(false)
    expect(isFar(null)).toBe(false)
  })
})
