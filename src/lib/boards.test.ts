import { describe, expect, it } from 'vitest'

import {
  MIDI_LARGE,
  MIDI_SQUARE,
  batchShape,
  batchSlice,
  boardSlice,
  customBoard,
  layoutFor,
  patternSize,
  planBatches,
  sliceCells,
} from './boards'
import type { BoardLayout, Pattern } from './types'
import { SIN_CUENTA } from './types'

/** Patrón de prueba: cada celda guarda su posición, para saber de dónde salió. */
function ramp(cols: number, rows: number): Pattern {
  const cells = new Int16Array(cols * rows)
  for (let i = 0; i < cells.length; i++) cells[i] = i % 32000
  return { cols, rows, cells }
}

describe('las placas reales', () => {
  it('la midi cuadrada son 29 × 29 = 841 pines', () => {
    expect(MIDI_SQUARE).toEqual({ cols: 29, rows: 29 })
    expect(MIDI_SQUARE.cols * MIDI_SQUARE.rows).toBe(841)
    expect(MIDI_LARGE).toEqual({ cols: 57, rows: 57 })
  })

  it('acepta placas de otras marcas', () => {
    expect(customBoard(31)).toEqual({ cols: 31, rows: 31 })
    expect(customBoard(20, 30)).toEqual({ cols: 20, rows: 30 })
    expect(() => customBoard(0)).toThrow(/placa/i)
    expect(() => customBoard(10.5)).toThrow(/placa/i)
  })
})

describe('la placa es la entrada', () => {
  it('dos placas en horizontal son 58 × 29 cuentas', () => {
    expect(patternSize(MIDI_SQUARE, 2, 1)).toEqual({ cols: 58, rows: 29 })
  })

  it('tres por dos son seis placas', () => {
    expect(patternSize(MIDI_SQUARE, 3, 2)).toEqual({ cols: 87, rows: 58 })
  })

  it('no hay montajes de cero placas', () => {
    expect(() => patternSize(MIDI_SQUARE, 0, 1)).toThrow(/placas/i)
  })
})

describe('layoutFor', () => {
  it('cuenta las placas de un patrón ya hecho', () => {
    expect(layoutFor(ramp(58, 29), MIDI_SQUARE)).toEqual({ cols: 2, rows: 1, total: 2 })
  })

  it('redondea hacia arriba: una placa a medias sigue siendo una placa', () => {
    expect(layoutFor(ramp(100, 100), MIDI_SQUARE)).toEqual({ cols: 4, rows: 4, total: 16 })
  })

  it('el caso de un retrato: 120 de ancho son cinco placas y quince en total', () => {
    const layout = layoutFor(ramp(120, 87), MIDI_SQUARE)
    expect(layout).toEqual({ cols: 5, rows: 3, total: 15 })
  })
})

describe('recortes', () => {
  it('la placa completa sale entera', () => {
    const pattern = ramp(58, 29)
    const placa = boardSlice(pattern, 1, 0, MIDI_SQUARE)
    expect([placa.cols, placa.rows]).toEqual([29, 29])
    expect(placa.cells[0]).toBe(pattern.cells[29])
  })

  it('la última placa rellena los huecos en vez de recortar', () => {
    // Al montar hay que ver dónde se acaba la pieza; una vista recortada
    // mentiría sobre dónde empieza la siguiente.
    const pattern = ramp(30, 29)
    const ultima = boardSlice(pattern, 1, 0, MIDI_SQUARE)
    expect([ultima.cols, ultima.rows]).toEqual([29, 29])
    expect(ultima.cells[0]).toBe(pattern.cells[29])
    expect(ultima.cells[1]).toBe(SIN_CUENTA)
    expect([...ultima.cells].filter((v) => v !== SIN_CUENTA)).toHaveLength(29)
  })

  it('una región fuera del patrón sale vacía, no rota', () => {
    const fuera = sliceCells(ramp(10, 10), 50, 50, 4, 4)
    expect([...fuera.cells].every((v) => v === SIN_CUENTA)).toBe(true)
  })

  it('la tanda sale con las coordenadas corridas de lado a lado', () => {
    const pattern = ramp(58, 29)
    const tanda = batchSlice(pattern, { col: 0, row: 0, cols: 2, rows: 1 }, MIDI_SQUARE)
    expect([tanda.cols, tanda.rows]).toEqual([58, 29])
    expect([...tanda.cells]).toEqual([...pattern.cells])
  })
})

describe('la forma de la tanda', () => {
  const layout = (cols: number, rows: number): BoardLayout => ({ cols, rows, total: cols * rows })

  it('con una placa, una placa', () => {
    expect(batchShape(layout(5, 3), 1)).toEqual({ cols: 1, rows: 1 })
  })

  it('con dos placas y un montaje apaisado, las pone en horizontal', () => {
    expect(batchShape(layout(5, 3), 2)).toEqual({ cols: 2, rows: 1 })
  })

  it('con dos placas y un montaje vertical, las pone en vertical', () => {
    expect(batchShape(layout(3, 5), 2)).toEqual({ cols: 1, rows: 2 })
  })

  it('aprovecha todo el inventario cuando cabe', () => {
    expect(batchShape(layout(2, 3), 6)).toEqual({ cols: 2, rows: 3 })
  })

  it('no propone más placas de las que tiene el montaje', () => {
    expect(batchShape(layout(2, 1), 8)).toEqual({ cols: 2, rows: 1 })
  })

  it('hace falta al menos una placa', () => {
    expect(() => batchShape(layout(5, 3), 0)).toThrow(/placa/i)
  })
})

describe('planBatches', () => {
  it('con dos placas y un patrón de dos, es una sola tanda', () => {
    // Si eliges dos placas y tienes dos, no hay cola que hacer.
    expect(planBatches(layoutFor(ramp(58, 29), MIDI_SQUARE), 2)).toEqual([
      { col: 0, row: 0, cols: 2, rows: 1 },
    ])
  })

  it('el retrato de 15 placas con dos en la mano son nueve tandas', () => {
    // Nueve y no ocho: la columna impar deja una tanda de una sola placa. Es el
    // precio de que cada tanda sea contigua, y se paga a gusto — la alternativa
    // es planchar dos trozos que no se tocan y pegarlos después.
    const batches = planBatches(layoutFor(ramp(120, 87), MIDI_SQUARE), 2)
    expect(batches).toHaveLength(9)
    expect(batches.filter((b) => b.cols * b.rows === 1)).toHaveLength(3)
  })

  it('cubre todas las placas una sola vez', () => {
    const layout = layoutFor(ramp(120, 87), MIDI_SQUARE)
    const vistas = new Set<string>()
    for (const b of planBatches(layout, 2)) {
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          const key = `${b.col + c},${b.row + r}`
          expect(vistas.has(key)).toBe(false)
          vistas.add(key)
        }
      }
    }
    expect(vistas.size).toBe(layout.total)
  })

  it('nunca pide más placas de las que tienes', () => {
    const layout = layoutFor(ramp(120, 87), MIDI_SQUARE)
    for (const b of planBatches(layout, 2)) {
      expect(b.cols * b.rows).toBeLessThanOrEqual(2)
    }
  })

  it('cada tanda es un rectángulo contiguo, no placas sueltas', () => {
    // Lo que se plancha junto sale en una pieza; agrupar en orden de lectura
    // daría trozos que luego hay que pegar de más.
    for (const b of planBatches(layoutFor(ramp(120, 87), MIDI_SQUARE), 4)) {
      expect(b.cols).toBeGreaterThanOrEqual(1)
      expect(b.rows).toBeGreaterThanOrEqual(1)
    }
  })
})
