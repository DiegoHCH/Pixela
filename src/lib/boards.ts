/**
 * Las placas, y la tanda.
 *
 * La placa es la entrada, no el resultado: eliges la forma del montaje y la
 * imagen se ajusta a ella. Y la unidad de trabajo no es la placa sino la
 * tanda — lo que cabe a la vez en las placas que tienes —, porque con dos
 * placas no montas una y luego la otra: montas las dos encajadas y planchas de
 * una vez, que da una pieza con una junta menos.
 */

import type { Batch, Board, BoardLayout, Pattern } from './types'
import { SIN_CUENTA } from './types'

/** La estándar, contada sobre las placas reales: 29 × 29 = 841 pines. */
export const MIDI_SQUARE: Board = { cols: 29, rows: 29 }
/** Grande midi: menos juntas visibles en piezas grandes. */
export const MIDI_LARGE: Board = { cols: 57, rows: 57 }

export function customBoard(cols: number, rows: number = cols): Board {
  if (cols < 1 || rows < 1 || !Number.isInteger(cols) || !Number.isInteger(rows)) {
    throw new Error(`Placa inválida: ${cols} × ${rows}.`)
  }
  return { cols, rows }
}

/** El tamaño en cuentas de un montaje de tantas placas de lado. */
export function patternSize(
  board: Board,
  boardsX: number,
  boardsY: number,
): { cols: number; rows: number } {
  if (boardsX < 1 || boardsY < 1) throw new Error('Hacen falta al menos 1 × 1 placas.')
  return { cols: board.cols * boardsX, rows: board.rows * boardsY }
}

/** Cuántas placas hace falta para un patrón ya hecho. La última casi nunca sale completa. */
export function layoutFor(pattern: Pattern, board: Board): BoardLayout {
  const cols = Math.ceil(pattern.cols / board.cols)
  const rows = Math.ceil(pattern.rows / board.rows)
  return { cols, rows, total: cols * rows }
}

/**
 * Recorta una región del patrón en coordenadas de celda, rellenando con
 * `SIN_CUENTA` lo que quede fuera.
 *
 * Rellena y no recorta a propósito: al montar, la última placa de cada fila
 * tiene huecos, y hay que verlos. Una vista recortada miente sobre dónde
 * empieza la pieza.
 */
export function sliceCells(
  pattern: Pattern,
  x0: number,
  y0: number,
  cols: number,
  rows: number,
): Pattern {
  const cells = new Int16Array(cols * rows).fill(SIN_CUENTA)
  for (let y = 0; y < rows; y++) {
    const sy = y0 + y
    if (sy < 0 || sy >= pattern.rows) continue
    for (let x = 0; x < cols; x++) {
      const sx = x0 + x
      if (sx < 0 || sx >= pattern.cols) continue
      cells[y * cols + x] = pattern.cells[sy * pattern.cols + sx]
    }
  }
  return { cols, rows, cells }
}

/** Una placa suelta, en coordenadas de placa. */
export function boardSlice(pattern: Pattern, col: number, row: number, board: Board): Pattern {
  return sliceCells(pattern, col * board.cols, row * board.rows, board.cols, board.rows)
}

/** Una tanda entera, con las coordenadas corridas de lado a lado. */
export function batchSlice(pattern: Pattern, batch: Batch, board: Board): Pattern {
  return sliceCells(
    pattern,
    batch.col * board.cols,
    batch.row * board.rows,
    batch.cols * board.cols,
    batch.rows * board.rows,
  )
}

/**
 * La forma de la tanda: qué rectángulo de placas se monta de una vez con las
 * que tienes.
 *
 * Se queda con el rectángulo de más área que quepa en el inventario, y ante
 * empate elige el que más se parece a la forma del montaje — con dos placas y
 * un patrón apaisado, 2 × 1 y no 1 × 2.
 */
export function batchShape(layout: BoardLayout, owned: number): { cols: number; rows: number } {
  if (owned < 1) throw new Error('Hace falta al menos una placa.')
  const target = layout.cols / layout.rows

  let best = { cols: 1, rows: 1 }
  let bestArea = 0
  let bestGap = Infinity

  for (let c = 1; c <= Math.min(owned, layout.cols); c++) {
    const r = Math.min(Math.floor(owned / c), layout.rows)
    if (r < 1) continue
    const area = c * r
    const gap = Math.abs(c / r - target)
    if (area > bestArea || (area === bestArea && gap < bestGap)) {
      best = { cols: c, rows: r }
      bestArea = area
      bestGap = gap
    }
  }
  return best
}

/**
 * Las tandas que hacen falta para montar el patrón entero.
 *
 * Se agrupan por adyacencia y no en orden de lectura: lo que se plancha junto
 * tiene que salir contiguo.
 */
export function planBatches(layout: BoardLayout, owned: number): Batch[] {
  const shape = batchShape(layout, owned)
  const batches: Batch[] = []
  for (let row = 0; row < layout.rows; row += shape.rows) {
    for (let col = 0; col < layout.cols; col += shape.cols) {
      batches.push({
        col,
        row,
        cols: Math.min(shape.cols, layout.cols - col),
        rows: Math.min(shape.rows, layout.rows - row),
      })
    }
  }
  return batches
}
