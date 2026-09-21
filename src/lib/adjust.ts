/**
 * Paso 1 — brillo, contraste y saturación antes de cuantizar.
 *
 * Existe porque las cuentas tienen colores muy saturados y planos: subir un
 * poco el contraste casi siempre mejora el patrón, y con fotos esto cambia el
 * resultado tanto como el difuminado.
 *
 * **Se aplica después de reducir a la rejilla, no antes.** Es mil veces más
 * barato —unos miles de celdas en vez de dos millones de píxeles— y da el mismo
 * resultado: las tres operaciones son afines por píxel, y una operación afín
 * conmuta con la media. Lo único que no conmuta es el recorte al rango 0–255,
 * así que la diferencia se limita a los valores que ya se salían de la gama.
 * `adjust.test.ts` lo comprueba con números.
 */

import type { CellGrid } from './types'

export interface Adjustments {
  /** −100 a 100. Suma o resta luz. */
  brightness: number
  /** −100 a 100. Separa o junta los valores respecto al gris medio. */
  contrast: number
  /** −100 a 100. A −100 la imagen queda en gris; a 100, los colores gritan. */
  saturation: number
}

export const NEUTRAL: Adjustments = { brightness: 0, contrast: 0, saturation: 0 }

export function isNeutral(a: Adjustments): boolean {
  return a.brightness === 0 && a.contrast === 0 && a.saturation === 0
}

/**
 * Luminancia percibida (Rec. 709). El verde pesa más que el rojo y mucho más
 * que el azul porque así lo ve el ojo: desaturar con la media de los tres
 * canales oscurece los verdes y aclara los azules.
 */
const LUMA = [0.2126, 0.7152, 0.0722] as const

/** El factor de contraste: la curva habitual, suave al principio y dura al final. */
function contrastFactor(contrast: number): number {
  const c = Math.max(-100, Math.min(100, contrast))
  return (100 + c) / 100 === 0 ? 0 : ((100 + c) / 100) ** 2
}

export function adjustGrid(grid: CellGrid, adjustments: Adjustments): CellGrid {
  if (isNeutral(adjustments)) return grid

  const brillo = Math.max(-100, Math.min(100, adjustments.brightness)) * 2.55
  const factor = contrastFactor(adjustments.contrast)
  const sat = 1 + Math.max(-100, Math.min(100, adjustments.saturation)) / 100

  const data = new Float32Array(grid.data.length)

  for (let i = 0; i < grid.cols * grid.rows; i++) {
    const p = i * 4
    let r = grid.data[p]
    let g = grid.data[p + 1]
    let b = grid.data[p + 2]

    // Brillo: desplazamiento.
    r += brillo
    g += brillo
    b += brillo

    // Contraste: separa del gris medio.
    r = (r - 128) * factor + 128
    g = (g - 128) * factor + 128
    b = (b - 128) * factor + 128

    // Saturación: acerca o aleja del gris de la misma luminancia.
    const luma = r * LUMA[0] + g * LUMA[1] + b * LUMA[2]
    r = luma + (r - luma) * sat
    g = luma + (g - luma) * sat
    b = luma + (b - luma) * sat

    data[p] = clamp(r)
    data[p + 1] = clamp(g)
    data[p + 2] = clamp(b)
    // El alfa no se toca: lo transparente sigue sin cuenta.
    data[p + 3] = grid.data[p + 3]
  }

  return { cols: grid.cols, rows: grid.rows, data }
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}
