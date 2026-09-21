/**
 * Paso 6 — dibujar.
 *
 * Cada celda se pinta como una cuenta con su agujero, no como un píxel
 * cuadrado: es lo que hace que el patrón se parezca a lo que vas a montar.
 *
 * No es puro —escribe en un contexto de canvas— pero tampoco toca el DOM: se le
 * pasa el contexto y dibuja. Eso lo deja usable igual desde una pantalla, desde
 * la exportación a PNG o desde un canvas fuera de pantalla.
 */

import { rgbToHsl } from './color'
import type { Board, Palette, Pattern, Theme } from './types'
import { SIN_CUENTA } from './types'

/** Sin I ni O: se confunden con 1 y 0 en la hoja impresa. */
export const SYMBOLS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

/**
 * Por debajo de esto una cuenta se pinta como un cuadrado plano: el agujero
 * sería ruido y la letra, ilegible.
 */
export const MIN_CELL_FOR_DETAIL = 7

/**
 * Lo que mide una celda para que su letra se lea.
 *
 * El modo símbolos existe para montar mirando letras en vez de colores, así que
 * una celda demasiado pequeña para dibujarlas no es «modo símbolos en pequeño»:
 * es el modo sin hacer nada. Un patrón de 87 × 116 en la mesa cae a 6 px por
 * celda, y ahí las letras no salían — el conmutador parecía roto.
 */
export const MIN_CELL_FOR_SYMBOL = 16

/** El tamaño de celda mínimo que un modo necesita para decir algo. */
export function minCellFor(mode: RenderMode): number {
  return mode === 'color' ? 1 : MIN_CELL_FOR_SYMBOL
}

export interface RenderTheme {
  /** La placa: plástico translúcido mate. */
  board: string
  peg: string
  seam: string
  frame: string
  coord: string
}

export const RENDER_THEMES: Record<Theme, RenderTheme> = {
  day: {
    board: '#2B3436',
    peg: 'rgba(255,255,255,.07)',
    seam: 'rgba(255,255,255,.42)',
    frame: 'rgba(255,255,255,.45)',
    coord: 'rgba(230,237,235,.55)',
  },
  night: {
    board: '#1C2224',
    peg: 'rgba(255,255,255,.06)',
    seam: 'rgba(255,255,255,.34)',
    frame: 'rgba(255,255,255,.34)',
    coord: 'rgba(228,235,233,.50)',
  },
}

export type RenderMode = 'color' | 'symbol' | 'print'

export interface DrawOptions {
  palette: Palette
  cellSize: number
  theme?: Theme
  x0?: number
  y0?: number
  /** Dibuja las líneas de placa encima. */
  board?: Board
  mode?: RenderMode
  /** Apaga todas las cuentas menos ésta, para aislar un color. */
  only?: number | null
  /**
   * Cuántas filas se han «caído» ya. La única animación de la app: las cuentas
   * entran fila a fila. Sin definir, están todas.
   */
  rowsVisible?: number
}

/** Lo que ocupa un patrón en pantalla a ese tamaño de celda. */
export function patternPixelSize(
  pattern: Pattern,
  cellSize: number,
): { width: number; height: number } {
  return { width: pattern.cols * cellSize, height: pattern.rows * cellSize }
}

/** El tamaño de celda más grande que cabe en el hueco disponible. */
export function fitCellSize(
  pattern: Pattern,
  maxWidth: number,
  maxHeight: number,
  max = 28,
): number {
  return Math.max(1, Math.min(max, maxWidth / pattern.cols, maxHeight / pattern.rows))
}

function drawPegs(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cols: number,
  rows: number,
  cs: number,
  t: RenderTheme,
): void {
  ctx.fillStyle = t.peg
  const r = Math.max(0.8, cs * 0.11)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.beginPath()
      ctx.arc(x0 + col * cs + cs / 2, y0 + row * cs + cs / 2, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function drawPattern(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  options: DrawOptions,
): void {
  const {
    palette,
    cellSize: cs,
    theme = 'day',
    x0 = 0,
    y0 = 0,
    board,
    mode = 'color',
    only = null,
    rowsVisible,
  } = options

  const t = RENDER_THEMES[theme]
  const { cols, rows } = pattern
  const print = mode === 'print'
  const visible = rowsVisible ?? rows

  // La placa vacía por debajo: el patrón se monta sobre algo, no flota.
  ctx.fillStyle = print ? '#FFFFFF' : t.board
  ctx.fillRect(x0, y0, cols * cs, rows * cs)
  if (!print) drawPegs(ctx, x0, y0, cols, rows, cs, t)

  for (let row = 0; row < Math.min(visible, rows); row++) {
    for (let col = 0; col < cols; col++) {
      const v = pattern.cells[row * cols + col]
      if (v === SIN_CUENTA) continue

      const px = x0 + col * cs
      const py = y0 + row * cs
      const bead = palette[v]
      if (!bead) continue

      if (print) {
        ctx.strokeStyle = '#BBBBBB'
        ctx.lineWidth = 0.5
        ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1)
        ctx.fillStyle = '#111111'
        ctx.font = `700 ${Math.round(cs * 0.62)}px ${MONO}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(symbolFor(v), px + cs / 2, py + cs / 2 + 0.5)
        continue
      }

      ctx.globalAlpha = only != null && v !== only ? 0.18 : 1
      ctx.fillStyle = bead.hex

      if (cs >= MIN_CELL_FOR_DETAIL) {
        const rad = Math.min(2, cs * 0.16)
        ctx.beginPath()
        ctx.roundRect(px + 0.5, py + 0.5, cs - 1, cs - 1, rad)
        ctx.fill()

        if (mode === 'symbol') {
          const [, , l] = rgbToHsl(bead.rgb[0], bead.rgb[1], bead.rgb[2])
          ctx.fillStyle = l > 0.55 ? 'rgba(20,24,25,.75)' : 'rgba(255,255,255,.85)'
          ctx.font = `700 ${Math.round(cs * 0.58)}px ${MONO}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(symbolFor(v), px + cs / 2, py + cs / 2 + 0.5)
        } else {
          // El agujero: lo que la hace cuenta y no píxel.
          ctx.fillStyle = 'rgba(0,0,0,.20)'
          ctx.beginPath()
          ctx.arc(px + cs / 2, py + cs / 2, cs * 0.17, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,.16)'
          ctx.beginPath()
          ctx.arc(px + cs * 0.36, py + cs * 0.34, cs * 0.09, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // Tan pequeña que el agujero sería ruido: cuadrado y listo.
        ctx.fillRect(px, py, cs, cs)
      }
      ctx.globalAlpha = 1
    }
  }

  if (board && !print) drawSeams(ctx, pattern, board, cs, x0, y0, t)
}

/** Las líneas de placa: dónde acaba una y empieza la siguiente. */
function drawSeams(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  board: Board,
  cs: number,
  x0: number,
  y0: number,
  t: RenderTheme,
): void {
  ctx.strokeStyle = t.seam
  ctx.lineWidth = 1
  for (let c = board.cols; c < pattern.cols; c += board.cols) {
    ctx.beginPath()
    ctx.moveTo(x0 + c * cs + 0.5, y0)
    ctx.lineTo(x0 + c * cs + 0.5, y0 + pattern.rows * cs)
    ctx.stroke()
  }
  for (let r = board.rows; r < pattern.rows; r += board.rows) {
    ctx.beginPath()
    ctx.moveTo(x0, y0 + r * cs + 0.5)
    ctx.lineTo(x0 + pattern.cols * cs, y0 + r * cs + 0.5)
    ctx.stroke()
  }
}

/** La placa vacía: el estado inicial no es un icono gris, es una placa sin cuentas. */
export function drawEmptyBoard(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  cs: number,
  theme: Theme = 'day',
): void {
  const t = RENDER_THEMES[theme]
  ctx.fillStyle = t.board
  ctx.fillRect(0, 0, cols * cs, rows * cs)
  drawPegs(ctx, 0, 0, cols, rows, cs, t)
}

export function symbolFor(index: number): string {
  return SYMBOLS[index % SYMBOLS.length]
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
