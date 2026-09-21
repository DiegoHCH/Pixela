/**
 * Pasos 3–5 — de rejilla de color a patrón de cuentas.
 *
 * Los índices del patrón son índices de **la paleta que se pasó aquí**. Si
 * filtras los metálicos con `quantizable()`, esa misma paleta filtrada tiene
 * que viajar al resto del pipeline: contar, dibujar y la lista de la compra.
 */

import { labDistanceSq, rgbToLab } from './color'
import type { CellGrid, Palette, Pattern } from './types'
import { SIN_CUENTA } from './types'

export interface QuantizeOptions {
  /** Floyd–Steinberg. Salva los degradados de una foto, destroza el pixel art. */
  dither?: boolean
  /** Tope de colores distintos. Con fotos es el control principal, no un extra. */
  maxColors?: number
  /** Por debajo de este alfa la celda se queda sin cuenta. */
  alphaThreshold?: number
}

export const DEFAULT_ALPHA_THRESHOLD = 110

/** Paso 3 — la cuenta más parecida, comparando en CIELAB y no en RGB. */
export function nearestBead(r: number, g: number, b: number, palette: Palette): number {
  if (palette.length === 0) throw new Error('No hay paleta con la que cuantizar.')
  const lab = rgbToLab(r, g, b)
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < palette.length; i++) {
    const d = labDistanceSq(lab, palette[i].lab)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

export function quantize(
  grid: CellGrid,
  palette: Palette,
  options: QuantizeOptions = {},
): Pattern {
  const { dither = true, maxColors, alphaThreshold = DEFAULT_ALPHA_THRESHOLD } = options
  if (palette.length === 0) throw new Error('No hay paleta con la que cuantizar.')

  const { cols, rows } = grid
  const cells = new Int16Array(cols * rows)
  // Copia de trabajo: el difuminado escribe el error sobre las celdas vecinas.
  const buf = dither ? Float32Array.from(grid.data) : grid.data

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      const p = i * 4

      if (buf[p + 3] < alphaThreshold) {
        cells[i] = SIN_CUENTA
        // El error de una celda sin cuenta no se reparte: no hay nada que
        // compensar, y esparcirlo ensucia el contorno de los sprites.
        continue
      }

      const r = buf[p]
      const g = buf[p + 1]
      const b = buf[p + 2]
      const idx = nearestBead(r, g, b, palette)
      cells[i] = idx

      if (!dither) continue

      const bead = palette[idx].rgb
      spread(buf, cols, rows, x, y, r - bead[0], g - bead[1], b - bead[2])
    }
  }

  const pattern: Pattern = { cols, rows, cells }
  return maxColors && maxColors > 0 ? capColors(pattern, palette, maxColors) : pattern
}

/** Reparto de Floyd–Steinberg: 7/16 derecha, 3/16 abajo-izq, 5/16 abajo, 1/16 abajo-der. */
function spread(
  buf: Float32Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  er: number,
  eg: number,
  eb: number,
): void {
  const add = (xx: number, yy: number, f: number) => {
    if (xx < 0 || xx >= cols || yy >= rows) return
    const q = (yy * cols + xx) * 4
    buf[q] += er * f
    buf[q + 1] += eg * f
    buf[q + 2] += eb * f
  }
  add(x + 1, y, 7 / 16)
  add(x - 1, y + 1, 3 / 16)
  add(x, y + 1, 5 / 16)
  add(x + 1, y + 1, 1 / 16)
}

/**
 * Paso 5 — el tope de colores. Se queda con los más frecuentes y reasigna el
 * resto a la cuenta superviviente más parecida.
 *
 * Es una restricción de bolsillo, no estética: cada color distinto es una bolsa
 * que hay que comprar.
 */
export function capColors(pattern: Pattern, palette: Palette, maxColors: number): Pattern {
  if (maxColors < 1) throw new Error('El tope de colores no puede ser menor que 1.')

  const counts = countBeads(pattern)
  if (counts.length <= maxColors) return pattern

  const kept = counts.slice(0, maxColors).map((c) => c.index)
  const keptSet = new Set(kept)

  // Tabla de reasignación: se calcula una vez por color descartado, no por celda.
  const remap = new Map<number, number>()
  for (const { index } of counts) {
    if (keptSet.has(index)) continue
    let best = kept[0]
    let bestD = Infinity
    for (const k of kept) {
      const d = labDistanceSq(palette[index].lab, palette[k].lab)
      if (d < bestD) {
        bestD = d
        best = k
      }
    }
    remap.set(index, best)
  }

  const cells = new Int16Array(pattern.cells.length)
  for (let i = 0; i < cells.length; i++) {
    const v = pattern.cells[i]
    cells[i] = v === SIN_CUENTA ? SIN_CUENTA : remap.get(v) ?? v
  }
  return { cols: pattern.cols, rows: pattern.rows, cells }
}

export interface BeadCount {
  index: number
  count: number
}

/**
 * Cuántas cuentas de cada color, de más a menos. Empates por índice ascendente,
 * para que el resultado no dependa del orden en que recorrió el Map.
 */
export function countBeads(pattern: Pattern): BeadCount[] {
  const m = new Map<number, number>()
  for (const v of pattern.cells) {
    if (v === SIN_CUENTA) continue
    m.set(v, (m.get(v) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([index, count]) => ({ index, count }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
}

/** Total de cuentas del patrón, sin contar los huecos. */
export function totalBeads(pattern: Pattern): number {
  let n = 0
  for (const v of pattern.cells) if (v !== SIN_CUENTA) n++
  return n
}
