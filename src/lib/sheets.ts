/**
 * Las hojas de montaje: una por placa, que es como se monta en la mesa.
 *
 * El sistema de diseño lo fija así — «hoja por placa con símbolos, siempre en
 * tema día, sin gastar cartucho en fondos» — y de ahí sale que cada hoja
 * necesite tres cosas: el trozo de patrón, dónde empieza dentro del montaje
 * para numerar su regla, y las cuentas que hace falta tener a mano para ella.
 *
 * La cuenta por hoja no es un adorno: la última placa de cada fila casi nunca
 * va llena, y saber que en esta sólo entran 312 cuentas evita contar 841 de
 * cada color «por si acaso».
 */

import { layoutFor, boardSlice } from './boards'
import { countBeads, totalBeads, type BeadCount } from './quantize'
import type { Board, Pattern } from './types'

export interface Sheet {
  /** Número de placa empezando en 1, en orden de lectura. */
  number: number
  /** Dónde empieza en el montaje, en celdas. Es lo que numera su regla. */
  col: number
  row: number
  /** La placa suelta, con sus huecos rellenos y no recortados. */
  pattern: Pattern
  /** Los colores de esta placa, del que más lleva al que menos. */
  counts: BeadCount[]
  /** Cuántas cuentas entran en esta placa. */
  total: number
}

export function sheetsFor(pattern: Pattern, board: Board): Sheet[] {
  const layout = layoutFor(pattern, board)
  const sheets: Sheet[] = []

  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const slice = boardSlice(pattern, col, row, board)
      sheets.push({
        number: row * layout.cols + col + 1,
        col: col * board.cols,
        row: row * board.rows,
        pattern: slice,
        counts: countBeads(slice),
        total: totalBeads(slice),
      })
    }
  }

  return sheets
}
