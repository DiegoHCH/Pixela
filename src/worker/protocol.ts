/**
 * Lo que viaja entre la app y el worker.
 *
 * Vive aparte de los dos porque lo comparten: si el mensaje cambia en un lado
 * y no en el otro, el error tiene que salir al compilar y no al arrastrar un
 * deslizante.
 */

import type { Adjustments } from '../lib/adjust'
import type { Fidelity } from '../lib/fidelity'
import type { SampleMode } from '../lib/sample'
import type { Palette, RgbaImage } from '../lib/types'

export interface PipelineRequest {
  /**
   * Sube con cada pedido. Es lo que permite tirar resultados viejos: mientras
   * arrastras el recorte se piden veinte patrones y sólo el último importa.
   */
  id: number
  /** El recorte ya hecho, no la imagen entera: el worker no reencuadra. */
  image: RgbaImage
  cols: number
  rows: number
  /**
   * La paleta contra la que cuantizar, ya filtrada de metálicos. Se manda sólo
   * cuando cambia; el worker guarda la última. Son 176 colores y clonarlos en
   * cada fotograma de un arrastre es trabajo que no hace nada.
   */
  palette?: Palette
  mode: SampleMode
  dither: boolean
  maxColors?: number
  adjustments: Adjustments
}

export interface PipelineResponse {
  id: number
  cols: number
  rows: number
  /** Los índices del patrón. Vuelven transferidos, sin copiar. */
  cells: Int16Array
  /**
   * El parecido con la imagen. Se mide aquí porque hace falta la rejilla
   * muestreada, y devolverla sólo para eso sería mandar el paso más caro de
   * vuelta por el cable.
   */
  fidelity: Fidelity
}

/** Cuando el worker no puede: se dice, no se traga. */
export interface PipelineFailure {
  id: number
  error: string
}

export type PipelineMessage = PipelineResponse | PipelineFailure

export function isFailure(message: PipelineMessage): message is PipelineFailure {
  return 'error' in message
}
