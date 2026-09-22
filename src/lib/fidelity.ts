/**
 * Cuánto se aleja el patrón de la imagen.
 *
 * Existe porque la app puede saberlo y callarlo era el peor de los dos. Con una
 * paleta corta, una foto de una cara sale con la piel gris o rosa y el
 * algoritmo no tiene la culpa: no hay con qué. Medirlo permite decirlo antes de
 * gastar diez mil cuentas.
 *
 * La medida es el ΔE medio por celda entre el color que pedía la imagen y la
 * cuenta que se colocó. Medido sobre un retrato real: 9,7 con el catálogo
 * entero, 20,5 con una paleta de 21 colores sin tonos de piel.
 */

import { deltaE76, rgbToLab } from './color'
import { DEFAULT_ALPHA_THRESHOLD } from './quantize'
import type { CellGrid, Palette, Pattern } from './types'
import { SIN_CUENTA } from './types'

export interface Fidelity {
  /** ΔE medio por celda. */
  mean: number
  /** La celda peor servida. */
  worst: number
  /** Celdas contadas. */
  cells: number
}

/**
 * A partir de aquí el patrón se aleja lo bastante como para decirlo.
 *
 * Por debajo de 12 el parecido es bueno; entre 12 y 18 se nota pero se
 * reconoce; por encima, la paleta no da la talla para esa imagen.
 */
export const FAR_ENOUGH_TO_SAY = 15

export function fidelity(
  grid: CellGrid,
  pattern: Pattern,
  palette: Palette,
  alphaThreshold: number = DEFAULT_ALPHA_THRESHOLD,
): Fidelity {
  let sum = 0
  let worst = 0
  let cells = 0

  for (let i = 0; i < pattern.cells.length; i++) {
    const bead = pattern.cells[i]
    if (bead === SIN_CUENTA) continue
    const p = i * 4
    if (grid.data[p + 3] < alphaThreshold) continue

    const wanted = rgbToLab(grid.data[p], grid.data[p + 1], grid.data[p + 2])
    const d = deltaE76(wanted, palette[bead].lab)
    sum += d
    if (d > worst) worst = d
    cells++
  }

  return { mean: cells ? sum / cells : 0, worst, cells }
}

/** Si conviene avisar de que el patrón se parece poco. */
export function isFar(f: Fidelity | null): boolean {
  return !!f && f.mean > FAR_ENOUGH_TO_SAY
}
