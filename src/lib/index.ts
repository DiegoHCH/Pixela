/**
 * El pipeline entero, de imagen a patrón. Todo puro: esta es la superficie que
 * el Web Worker expondrá en la segunda mitad de la v1.
 */

export * from './accent'
export * from './adjust'
export * from './boards'
export * from './color'
export * from './fidelity'
export * from './palette'
export * from './quantize'
export * from './sample'
export * from './types'

import { adjustGrid, NEUTRAL, type Adjustments } from './adjust'
import { quantizable } from './palette'
import { quantize, type QuantizeOptions } from './quantize'
import { sample, type SampleMode } from './sample'
import type { CellGrid, Palette, Pattern, RgbaImage } from './types'

export interface BuildPatternOptions extends QuantizeOptions {
  mode?: SampleMode
  /** Por defecto se excluyen los metálicos: un RGB no los representa. */
  includeMetallic?: boolean
  /** Brillo, contraste y saturación antes de buscar las cuentas. */
  adjustments?: Adjustments
}

/**
 * Los pasos 2–5 de un tirón. Devuelve el patrón y la paleta contra la que se
 * hizo — hay que quedarse con ella, porque los índices del patrón son suyos.
 */
export function buildPattern(
  img: RgbaImage,
  cols: number,
  rows: number,
  palette: Palette,
  options: BuildPatternOptions = {},
): { pattern: Pattern; palette: Palette; grid: CellGrid } {
  const { mode, includeMetallic = false, adjustments = NEUTRAL, ...quantizeOptions } = options
  const used = includeMetallic ? palette : quantizable(palette)
  // Muestrear y después ajustar: mismo resultado y mil veces más barato que
  // ajustar la imagen entera. El porqué está en `adjust.ts`.
  const grid = adjustGrid(sample(img, cols, rows, mode), adjustments)
  // La rejilla sale con el resultado porque medir el parecido la necesita, y
  // recalcularla sólo para eso sería repetir el paso más caro.
  return { pattern: quantize(grid, used, quantizeOptions), palette: used, grid }
}
