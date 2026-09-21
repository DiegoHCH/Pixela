/**
 * Paso 2 — la imagen se reduce a la rejilla: una celda por cuenta.
 *
 * Dos modos, porque no sirve el mismo para todo. Elegir mal aquí es el error
 * más común del proyecto, y por eso el modo queda siempre visible en la
 * interfaz aunque se proponga solo.
 */

import type { CellGrid, RgbaImage } from './types'

export type SampleMode = 'average' | 'point'

/** Por defecto promedio: el uso principal son fotos, no pixel art. */
export const DEFAULT_SAMPLE_MODE: SampleMode = 'average'

function assertSize(img: RgbaImage, cols: number, rows: number): void {
  if (cols < 1 || rows < 1 || !Number.isInteger(cols) || !Number.isInteger(rows)) {
    throw new Error(`Rejilla inválida: ${cols} × ${rows}.`)
  }
  if (img.width < 1 || img.height < 1) throw new Error('Imagen vacía.')
  if (img.data.length < img.width * img.height * 4) {
    throw new Error('Los datos de la imagen no cuadran con su tamaño.')
  }
}

/** Borde izquierdo del bloque `i` de `n` sobre `size` píxeles. */
function edge(i: number, n: number, size: number): number {
  return Math.floor((i * size) / n)
}

/**
 * Promedio por bloque — para fotos y dibujos. Suaviza y conserva el detalle
 * que el muestreo directo tiraría.
 *
 * El promedio va ponderado por alfa: si no, el borde de un sprite recortado
 * arrastra el color de los píxeles transparentes (negro, casi siempre) y el
 * contorno sale sucio.
 */
export function sampleAverage(img: RgbaImage, cols: number, rows: number): CellGrid {
  assertSize(img, cols, rows)
  const out = new Float32Array(cols * rows * 4)
  const { width, height, data } = img

  for (let cy = 0; cy < rows; cy++) {
    const y0 = edge(cy, rows, height)
    const y1 = Math.max(y0 + 1, edge(cy + 1, rows, height))
    for (let cx = 0; cx < cols; cx++) {
      const x0 = edge(cx, cols, width)
      const x1 = Math.max(x0 + 1, edge(cx + 1, cols, width))

      let r = 0
      let g = 0
      let b = 0
      let aSum = 0
      let n = 0

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * width + x) * 4
          const a = data[p + 3]
          r += data[p] * a
          g += data[p + 1] * a
          b += data[p + 2] * a
          aSum += a
          n++
        }
      }

      const o = (cy * cols + cx) * 4
      if (aSum === 0) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0
      } else {
        out[o] = r / aSum
        out[o + 1] = g / aSum
        out[o + 2] = b / aSum
        out[o + 3] = aSum / n
      }
    }
  }

  return { cols, rows, data: out }
}

/**
 * Muestreo directo — para pixel art. Toma el píxel del centro de cada celda y
 * respeta los colores originales sin emborronarlos.
 */
export function samplePoint(img: RgbaImage, cols: number, rows: number): CellGrid {
  assertSize(img, cols, rows)
  const out = new Float32Array(cols * rows * 4)
  const { width, height, data } = img

  for (let cy = 0; cy < rows; cy++) {
    const y = Math.min(height - 1, Math.floor(((cy + 0.5) * height) / rows))
    for (let cx = 0; cx < cols; cx++) {
      const x = Math.min(width - 1, Math.floor(((cx + 0.5) * width) / cols))
      const p = (y * width + x) * 4
      const o = (cy * cols + cx) * 4
      out[o] = data[p]
      out[o + 1] = data[p + 1]
      out[o + 2] = data[p + 2]
      out[o + 3] = data[p + 3]
    }
  }

  return { cols, rows, data: out }
}

export function sample(
  img: RgbaImage,
  cols: number,
  rows: number,
  mode: SampleMode = DEFAULT_SAMPLE_MODE,
): CellGrid {
  return mode === 'point' ? samplePoint(img, cols, rows) : sampleAverage(img, cols, rows)
}
