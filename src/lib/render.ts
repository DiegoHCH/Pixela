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

/**
 * Por debajo de esto los números de la regla se tocan entre sí y estorban más
 * de lo que ayudan. Una placa suelta en la mesa va muy por encima.
 */
export const MIN_CELL_FOR_COORDS = 9

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

/**
 * Lo más que ocupa la regla. Quien tiene que dimensionar el lienzo antes de
 * saber el tamaño de celda reserva esto y se ahorra el círculo de «la celda
 * depende del margen, que depende de la celda».
 */
export const MAX_COORD_GUTTER = 30

/** Lo que ocupa la regla de coordenadas, a cada lado, a ese tamaño de celda. */
export function coordGutter(cs: number): number {
  return Math.round(Math.max(16, Math.min(MAX_COORD_GUTTER, cs * 1.3)))
}

/**
 * Cada cuántas cuentas se escribe un número.
 *
 * Cinco es lo que usa cualquier hoja de punto de cruz, y es lo que la mano
 * cuenta sin perderse. Con celdas pequeñas los números se pisarían, así que se
 * pasa a diez.
 */
export function coordStep(cs: number): number {
  return cs * 5 >= 60 ? 5 : 10
}

export interface CoordOptions {
  cols: number
  rows: number
  cellSize: number
  /**
   * Dónde empieza lo dibujado dentro del patrón completo, en celdas.
   *
   * Es la razón de ser de todo esto: la placa 3 empieza en la columna 59 del
   * montaje, y su regla tiene que decir 59 y no 1. Si cada placa se numerase
   * desde uno, al juntarlas sobre la mesa no sabrías cuál va dónde.
   */
  colOffset?: number
  rowOffset?: number
  /** La esquina de la rejilla. La regla se dibuja en el margen, fuera de ella. */
  x0?: number
  y0?: number
  theme?: Theme
  print?: boolean
}

/**
 * Los números de fila y columna, arriba y a la izquierda de la rejilla.
 *
 * Hay que dejarle sitio: se dibuja en `x0 - gutter` y `y0 - gutter`, así que
 * quien llama monta el canvas con `coordGutter()` de margen.
 */
export function drawCoordinates(ctx: CanvasRenderingContext2D, o: CoordOptions): void {
  const {
    cols,
    rows,
    cellSize: cs,
    colOffset = 0,
    rowOffset = 0,
    x0 = 0,
    y0 = 0,
    theme = 'day',
    print = false,
  } = o

  if (cs < MIN_CELL_FOR_COORDS) return

  const step = coordStep(cs)
  const size = Math.round(Math.max(9, Math.min(13, cs * 0.52)))
  ctx.fillStyle = print ? '#444444' : RENDER_THEMES[theme].coord
  ctx.font = `600 ${size}px ${MONO}`

  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  for (const c of coordLabels(cols, colOffset, step)) {
    ctx.fillText(String(colOffset + c + 1), x0 + c * cs + cs / 2, y0 - 4)
  }

  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const r of coordLabels(rows, rowOffset, step)) {
    ctx.fillText(String(rowOffset + r + 1), x0 - 5, y0 + r * cs + cs / 2)
  }
}

/**
 * Qué celdas llevan número, en índices de lo que se está dibujando.
 *
 * Tres reglas, y el orden entre ellas importa:
 *
 * 1. La primera va **siempre**. Es el ancla: con ella sabes que esta placa
 *    empieza en la columna 59 del montaje, y sin ella la hoja no dice dónde va.
 * 2. Una cada `step` cuentas, que es el esqueleto que la mano sigue al contar.
 * 3. La última, que marca dónde acaba la placa.
 *
 * Y un número se cae si quedaría pegado al anterior —a una sola celda—, porque
 * dos cifras a esa distancia se solapan. Se cae el de menos valor de los dos:
 * el borde se ve solo, el ancla no.
 */
export function coordLabels(count: number, offset: number, step: number): number[] {
  if (count <= 0) return []

  const kept = [0]
  const last = () => kept[kept.length - 1]

  for (let i = 1; i < count - 1; i++) {
    if ((offset + i + 1) % step === 0 && i - last() > 1) kept.push(i)
  }
  if (count > 1 && count - 1 - last() > 1) kept.push(count - 1)

  return kept
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
