import { describe, expect, it } from 'vitest'

import { DEFAULT_PALETTE, quantizable } from './palette'
import { capColors, countBeads, nearestBead, quantize, totalBeads } from './quantize'
import type { CellGrid, Pattern } from './types'
import { SIN_CUENTA } from './types'

const PAL = quantizable(DEFAULT_PALETTE)

/** Rejilla de un solo color plano. */
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

function distinct(pattern: Pattern): Set<number> {
  return new Set([...pattern.cells].filter((v) => v !== SIN_CUENTA))
}

describe('nearestBead', () => {
  it('devuelve la cuenta exacta cuando el color es exacto', () => {
    PAL.forEach((bead, i) => {
      expect(nearestBead(bead.rgb[0], bead.rgb[1], bead.rgb[2], PAL)).toBe(i)
    })
  })

  it('protesta si no hay paleta', () => {
    expect(() => nearestBead(10, 20, 30, [])).toThrow(/paleta/i)
  })
})

describe('quantize', () => {
  it('reproduce la paleta clavada, sin difuminado', () => {
    const cols = PAL.length
    const data = new Float32Array(cols * 4)
    PAL.forEach((bead, i) => {
      data[i * 4] = bead.rgb[0]
      data[i * 4 + 1] = bead.rgb[1]
      data[i * 4 + 2] = bead.rgb[2]
      data[i * 4 + 3] = 255
    })
    const pattern = quantize({ cols, rows: 1, data }, PAL, { dither: false })
    expect([...pattern.cells]).toEqual(PAL.map((_, i) => i))
  })

  it('deja sin cuenta lo que está por debajo del umbral de alfa', () => {
    const pattern = quantize(flat([253, 39, 74], 2, 2, 60), PAL, { dither: false })
    expect([...pattern.cells]).toEqual([SIN_CUENTA, SIN_CUENTA, SIN_CUENTA, SIN_CUENTA])
    expect(totalBeads(pattern)).toBe(0)
  })

  it('respeta el umbral que se le pase', () => {
    const grid = flat([253, 39, 74], 1, 1, 60)
    expect(quantize(grid, PAL, { alphaThreshold: 50 }).cells[0]).not.toBe(SIN_CUENTA)
    expect(quantize(grid, PAL, { alphaThreshold: 200 }).cells[0]).toBe(SIN_CUENTA)
  })

  it('conserva el tamaño de la rejilla', () => {
    const pattern = quantize(flat([253, 39, 74], 7, 3), PAL, { dither: false })
    expect([pattern.cols, pattern.rows]).toEqual([7, 3])
    expect(pattern.cells.length).toBe(21)
  })

  it('no toca la rejilla de entrada', () => {
    const grid = flat([190, 190, 190], 4, 4)
    const copia = Float32Array.from(grid.data)
    quantize(grid, PAL, { dither: true })
    expect([...grid.data]).toEqual([...copia])
  })
})

describe('difuminado', () => {
  it('mezcla cuentas para simular un color que no tienes', () => {
    // Un gris plano que no está en el cajón: sin difuminar sale de un solo
    // color, difuminado se reparte entre varios que de lejos promedian ese gris.
    const grid = flat([190, 190, 190], 8, 8)
    expect(distinct(quantize(grid, PAL, { dither: false })).size).toBe(1)
    expect(distinct(quantize(grid, PAL, { dither: true })).size).toBeGreaterThan(1)
  })

  it('no ensucia un color que sí tienes', () => {
    // El error es cero, así que no hay nada que repartir: el difuminado no
    // puede estropear una zona que ya cae exacta sobre una cuenta.
    const rojo = DEFAULT_PALETTE[1]
    const pattern = quantize(flat(rojo.rgb, 8, 8), PAL, { dither: true })
    expect(distinct(pattern).size).toBe(1)
  })

  it('es determinista', () => {
    const a = quantize(flat([190, 190, 190], 8, 8), PAL, { dither: true })
    const b = quantize(flat([190, 190, 190], 8, 8), PAL, { dither: true })
    expect([...a.cells]).toEqual([...b.cells])
  })
})

describe('tope de colores', () => {
  const dithered = quantize(flat([190, 190, 190], 8, 8), PAL, { dither: true })

  it('el caso de partida usa más colores de los que caben en el bolsillo', () => {
    expect(distinct(dithered).size).toBeGreaterThan(2)
  })

  it('recorta al número pedido', () => {
    const capped = capColors(dithered, PAL, 2)
    expect(distinct(capped).size).toBeLessThanOrEqual(2)
  })

  it('se queda con los más frecuentes', () => {
    const masUsado = countBeads(dithered)[0].index
    expect(distinct(capColors(dithered, PAL, 1))).toEqual(new Set([masUsado]))
  })

  it('no cambia nada si el patrón ya cabe', () => {
    const capped = capColors(dithered, PAL, 99)
    expect(capped).toBe(dithered)
  })

  it('no inventa cuentas donde había huecos', () => {
    const conHuecos: Pattern = {
      cols: 2,
      rows: 2,
      cells: Int16Array.from([0, SIN_CUENTA, 5, 12]),
    }
    const capped = capColors(conHuecos, PAL, 1)
    expect(capped.cells[1]).toBe(SIN_CUENTA)
    expect(totalBeads(capped)).toBe(3)
  })

  it('protesta con un tope imposible', () => {
    expect(() => capColors(dithered, PAL, 0)).toThrow(/tope/i)
  })

  it('se aplica también desde quantize', () => {
    const pattern = quantize(flat([190, 190, 190], 8, 8), PAL, { dither: true, maxColors: 2 })
    expect(distinct(pattern).size).toBeLessThanOrEqual(2)
  })
})

describe('recuento', () => {
  const pattern: Pattern = {
    cols: 3,
    rows: 2,
    cells: Int16Array.from([4, 4, 1, SIN_CUENTA, 1, 4]),
  }

  it('ordena de más a menos y no cuenta los huecos', () => {
    expect(countBeads(pattern)).toEqual([
      { index: 4, count: 3 },
      { index: 1, count: 2 },
    ])
    expect(totalBeads(pattern)).toBe(5)
  })

  it('desempata por índice, para no depender del orden del Map', () => {
    const empate: Pattern = { cols: 4, rows: 1, cells: Int16Array.from([9, 2, 9, 2]) }
    expect(countBeads(empate).map((c) => c.index)).toEqual([2, 9])
  })

  it('un patrón vacío no cuenta nada', () => {
    const vacio: Pattern = { cols: 2, rows: 1, cells: Int16Array.from([SIN_CUENTA, SIN_CUENTA]) }
    expect(countBeads(vacio)).toEqual([])
    expect(totalBeads(vacio)).toBe(0)
  })
})
