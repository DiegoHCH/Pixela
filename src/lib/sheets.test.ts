import { describe, expect, it } from 'vitest'

import { customBoard } from './boards'
import { sheetsFor } from './sheets'
import type { Pattern } from './types'
import { SIN_CUENTA } from './types'

/** Un montaje de 2 × 2 placas de 2 × 2, con un color distinto por placa. */
function cuatroPlacas(): Pattern {
  const cells = Int16Array.from([
    0, 0, 1, 1,
    0, 0, 1, 1,
    2, 2, 3, 3,
    2, 2, 3, 3,
  ])
  return { cols: 4, rows: 4, cells }
}

describe('sheetsFor', () => {
  const board = customBoard(2, 2)

  it('saca una hoja por placa, en orden de lectura', () => {
    const sheets = sheetsFor(cuatroPlacas(), board)
    expect(sheets.map((s) => s.number)).toEqual([1, 2, 3, 4])
    // La 2 es la de arriba a la derecha y la 3 empieza la segunda fila.
    expect(sheets.map((s) => [s.col, s.row])).toEqual([
      [0, 0],
      [2, 0],
      [0, 2],
      [2, 2],
    ])
  })

  it('cada hoja lleva sólo sus cuentas', () => {
    const sheets = sheetsFor(cuatroPlacas(), board)
    expect(sheets[0].counts).toEqual([{ index: 0, count: 4 }])
    expect(sheets[3].counts).toEqual([{ index: 3, count: 4 }])
    expect(sheets.map((s) => s.total)).toEqual([4, 4, 4, 4])
  })

  it('la última placa va a medias y lo dice', () => {
    // Tres columnas en placas de dos: la segunda placa sólo tiene una columna
    // de cuentas. Contar 4 «por si acaso» es justo lo que esto evita.
    const pattern: Pattern = { cols: 3, rows: 2, cells: Int16Array.from([0, 0, 1, 0, 0, 1]) }
    const sheets = sheetsFor(pattern, board)
    expect(sheets).toHaveLength(2)
    expect(sheets[1].total).toBe(2)
    // Y los huecos siguen ahí, sin recortar: al montar hay que verlos.
    expect(sheets[1].pattern.cols).toBe(2)
    expect([...sheets[1].pattern.cells]).toEqual([1, SIN_CUENTA, 1, SIN_CUENTA])
  })

  it('un patrón que cabe en una placa da una sola hoja', () => {
    const sheets = sheetsFor({ cols: 2, rows: 2, cells: new Int16Array(4) }, board)
    expect(sheets).toHaveLength(1)
    expect(sheets[0]).toMatchObject({ number: 1, col: 0, row: 0, total: 4 })
  })
})
