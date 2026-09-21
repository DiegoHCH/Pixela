/**
 * Los tipos del pipeline. Todo lo de `lib/` es puro: no toca el DOM, no lee
 * `localStorage` y no sabe que existe Svelte. Eso es lo que lo hace testeable
 * y lo que permitirá mudarlo entero al Web Worker sin cambiar una línea.
 */

export type RGB = readonly [number, number, number]
export type Lab = readonly [number, number, number]
export type HSL = readonly [number, number, number]

export type Theme = 'day' | 'night'

/** Celda sin cuenta: transparente en el origen, o hueco fuera del patrón. */
export const SIN_CUENTA = -1

export interface Bead {
  /** Generado, no de fábrica: estas cuentas vienen sueltas y sin códigos. */
  code: string
  name: string
  hex: string
  rgb: RGB
  lab: Lab
  /**
   * Metálico. Su color cambia con el ángulo y un único RGB lo representa mal,
   * así que queda fuera de la cuantización automática: si no, el dorado entra
   * como «oliva sucio» y la plata como «gris azulado».
   */
  metallic: boolean
  /**
   * El código del catálogo de fábrica más parecido, para la lista de la compra.
   * No interviene en la cuantización: ahí manda el color medido.
   */
  factoryCode?: string
  /** Cuánto se aleja ese código del color medido, en ΔE. */
  factoryDeltaE?: number
}

export type Palette = readonly Bead[]

/** Imagen RGBA cruda, tal cual la devuelve `ctx.getImageData()`. */
export interface RgbaImage {
  width: number
  height: number
  data: Uint8ClampedArray | Uint8Array
}

/**
 * La imagen ya reducida a la rejilla, un RGBA por celda y todavía sin
 * cuantizar. Se queda en coma flotante porque el difuminado necesita acumular
 * error por debajo del entero.
 */
export interface CellGrid {
  cols: number
  rows: number
  /** 4 valores por celda (r, g, b, a) en 0–255, en orden de lectura. */
  data: Float32Array
}

/** El patrón: un índice de paleta por celda, o `SIN_CUENTA`. */
export interface Pattern {
  cols: number
  rows: number
  cells: Int16Array
}

/** Una placa física, en pines. */
export interface Board {
  cols: number
  rows: number
}

/** Cuántas placas hacen falta y cómo se reparten. */
export interface BoardLayout {
  cols: number
  rows: number
  total: number
}

/**
 * Una tanda: el rectángulo de placas que se monta y se plancha de una vez.
 * Es rectángulo y no lista suelta a propósito — lo planchado junto sale en una
 * sola pieza, con una junta menos que pegar después.
 */
export interface Batch {
  /** Columna y fila de la placa superior izquierda, en coordenadas de placa. */
  col: number
  row: number
  cols: number
  rows: number
}
