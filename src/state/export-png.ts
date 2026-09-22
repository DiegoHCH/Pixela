/**
 * Sacar el patrón como PNG.
 *
 * Se dibuja en un canvas fuera de pantalla con el mismo código que la pantalla,
 * así que lo que exportas es exactamente lo que ves — salvo el tema, que en lo
 * que sale impreso o guardado es siempre el de día.
 */

import { EXPORT_CELL_SIZE, exportFileName } from '../lib/export'
import {
  MIN_CELL_FOR_COORDS,
  RENDER_THEMES,
  coordGutter,
  drawCoordinates,
  drawPattern,
  type RenderMode,
} from '../lib/render'
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
  /**
   * Dónde empieza esta hoja dentro del montaje, en celdas. Con esto la hoja
   * sale con su regla numerada como en la pieza completa, que es la hoja que
   * acabas teniendo al lado mientras montas.
   */
  coords?: { colOffset: number; rowOffset: number }
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
  const mode = options.mode ?? 'color'
  const print = mode === 'print'
  const gutter = options.coords && cellSize >= MIN_CELL_FOR_COORDS ? coordGutter(cellSize) : 0

  const canvas = document.createElement('canvas')
  canvas.width = pattern.cols * cellSize + gutter
  canvas.height = pattern.rows * cellSize + gutter

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ExportError('Este navegador no deja dibujar en un canvas.')

  // El margen de la regla se pinta del color de la placa: si se quedara
  // transparente, los números claros no se verían sobre el blanco del visor.
  if (gutter) {
    ctx.fillStyle = print ? '#FFFFFF' : RENDER_THEMES.day.board
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  drawPattern(ctx, pattern, {
    palette,
    cellSize,
    // La impresión y lo que se guarda usan siempre el tema día.
    theme: 'day',
    x0: gutter,
    y0: gutter,
    board: options.board,
    mode,
    only: options.only ?? null,
  })

  if (gutter && options.coords) {
    drawCoordinates(ctx, {
      cols: pattern.cols,
      rows: pattern.rows,
      cellSize,
      colOffset: options.coords.colOffset,
      rowOffset: options.coords.rowOffset,
      x0: gutter,
      y0: gutter,
      theme: 'day',
      print,
    })
  }

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
