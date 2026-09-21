/**
 * Sacar el patrón como PNG.
 *
 * Se dibuja en un canvas fuera de pantalla con el mismo código que la pantalla,
 * así que lo que exportas es exactamente lo que ves — salvo el tema, que en lo
 * que sale impreso o guardado es siempre el de día.
 */

import { EXPORT_CELL_SIZE, exportFileName } from '../lib/export'
import { drawPattern, type RenderMode } from '../lib/render'
import type { Board, Palette, Pattern } from '../lib/types'
import { saveBlob, type SaveResult } from './download'

export interface ExportOptions {
  /** Nombre del archivo de origen, para nombrar la salida. */
  source: string
  /** Las líneas de placa. No se pasan cuando lo exportado *es* una placa. */
  board?: Board
  /** Número de placa, empezando en 1, si es la hoja de una placa suelta. */
  boardNumber?: number
  /** Un solo color, para la hoja de «coloca todo el rojo». */
  only?: number | null
  /** Color o símbolos: sale como lo estás mirando. */
  mode?: RenderMode
  cellSize?: number
}

export class ExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExportError'
  }
}

export async function exportPatternPng(
  pattern: Pattern,
  palette: Palette,
  options: ExportOptions,
): Promise<{ name: string; result: SaveResult }> {
  const cellSize = options.cellSize ?? EXPORT_CELL_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = pattern.cols * cellSize
  canvas.height = pattern.rows * cellSize

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ExportError('Este navegador no deja dibujar en un canvas.')

  drawPattern(ctx, pattern, {
    palette,
    cellSize,
    // La impresión y lo que se guarda usan siempre el tema día.
    theme: 'day',
    board: options.board,
    mode: options.mode ?? 'color',
    only: options.only ?? null,
  })

  const blob = await toBlob(canvas)
  const name = exportFileName({
    source: options.source,
    cols: pattern.cols,
    rows: pattern.rows,
    board: options.boardNumber,
  })
  return { name, result: await saveBlob(blob, name, 'png') }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new ExportError('No se pudo generar el PNG.'))
    }, 'image/png')
  })
}
