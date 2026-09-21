/**
 * El pipeline entero, de imagen a patrón. Todo puro: esta es la superficie que
 * el Web Worker expondrá en la segunda mitad de la v1.
 */

export * from './accent'
export * from './boards'
export * from './color'
export * from './palette'
export * from './quantize'
export * from './sample'
export * from './types'

import { quantizable } from './palette'
import { quantize, type QuantizeOptions } from './quantize'
import { sample, type SampleMode } from './sample'
import type { Palette, Pattern, RgbaImage } from './types'

export interface BuildPatternOptions extends QuantizeOptions {
  mode?: SampleMode
  /** Por defecto se excluyen los metálicos: un RGB no los representa. */
  includeMetallic?: boolean
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
): { pattern: Pattern; palette: Palette } {
  const { mode, includeMetallic = false, ...quantizeOptions } = options
  const used = includeMetallic ? palette : quantizable(palette)
  const grid = sample(img, cols, rows, mode)
  return { pattern: quantize(grid, used, quantizeOptions), palette: used }
}
