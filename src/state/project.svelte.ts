/**
 * El proyecto abierto: la imagen, la forma del montaje y el recorte.
 *
 * Todo el cálculo de verdad vive en `lib/`. Esto sólo guarda las decisiones del
 * usuario y encadena los pasos cuando cambian.
 */

import { MIDI_SQUARE, layoutFor, patternSize, planBatches } from '../lib/boards'
import { aspectOf, centeredCrop, cropImage, type Rect } from '../lib/crop'
import { DEFAULT_PALETTE } from '../lib/palette'
import { buildPattern } from '../lib/index'
import { countBeads, totalBeads } from '../lib/quantize'
import type { SampleMode } from '../lib/sample'
import type { Board, Palette, Pattern } from '../lib/types'
import type { LoadedImage } from './load-image'

/** Se mide en placas por defecto; «Cuentas» es la salida para un tamaño concreto. */
export type Measure = 'boards' | 'beads'

/** Lo más grande que ofrece el selector de forma del montaje. */
export const MAX_BOARDS_X = 5
export const MAX_BOARDS_Y = 4

class Project {
  image = $state<LoadedImage | null>(null)
  measure = $state<Measure>('boards')
  boardsX = $state(2)
  boardsY = $state(1)
  beadCols = $state(58)
  beadRows = $state(29)
  board = $state<Board>(MIDI_SQUARE)
  /** Cuántas placas tienes. Es un dato tuyo, no del patrón, y se pregunta una vez. */
  ownedBoards = $state(2)
  crop = $state<Rect | null>(null)

  sampleMode = $state<SampleMode>('average')
  dither = $state(true)
  maxColors = $state<number | null>(null)

  /** El tamaño del patrón en cuentas, venga de placas o de un tamaño a mano. */
  get grid(): { cols: number; rows: number } {
    return this.measure === 'boards'
      ? patternSize(this.board, this.boardsX, this.boardsY)
      : { cols: this.beadCols, rows: this.beadRows }
  }

  /** La proporción del recorte *es* la forma del montaje. Un solo control. */
  get aspect(): number {
    const { cols, rows } = this.grid
    return aspectOf(cols, rows)
  }

  #result = $derived.by(() => {
    const image = this.image
    const crop = this.crop
    if (!image || !crop) return null
    const { cols, rows } = this.grid
    const cut = cropImage(image.pixels, crop)
    return buildPattern(cut, cols, rows, DEFAULT_PALETTE, {
      mode: this.sampleMode,
      dither: this.dither,
      maxColors: this.maxColors ?? undefined,
    })
  })

  get pattern(): Pattern | null {
    return this.#result?.pattern ?? null
  }

  /** La paleta con la que se cuantizó: los índices del patrón son suyos. */
  get palette(): Palette {
    return this.#result?.palette ?? DEFAULT_PALETTE
  }

  get counts() {
    const pattern = this.pattern
    return pattern ? countBeads(pattern) : []
  }

  get total(): number {
    const pattern = this.pattern
    return pattern ? totalBeads(pattern) : 0
  }

  get layout() {
    const pattern = this.pattern
    return pattern ? layoutFor(pattern, this.board) : null
  }

  /** Las tandas: lo que cabe a la vez en las placas que tienes. */
  get batches() {
    const layout = this.layout
    return layout ? planBatches(layout, this.ownedBoards) : []
  }

  /** Si cabe de una sentada no hay cola que hacer: es una sola tanda. */
  get fitsInOneGo(): boolean {
    return this.batches.length === 1
  }

  open(image: LoadedImage): void {
    this.image = image
    this.refitCrop()
  }

  close(): void {
    this.image = null
    this.crop = null
  }

  /** Elegir la forma del montaje reencuadra: la proporción ha cambiado. */
  setShape(boardsX: number, boardsY: number): void {
    this.boardsX = boardsX
    this.boardsY = boardsY
    this.refitCrop()
  }

  setMeasure(measure: Measure): void {
    this.measure = measure
    this.refitCrop()
  }

  setBeadSize(cols: number, rows: number): void {
    this.beadCols = Math.max(1, Math.round(cols))
    this.beadRows = Math.max(1, Math.round(rows))
    this.refitCrop()
  }

  /**
   * Vuelve al recorte centrado más grande con la proporción actual.
   *
   * Se pierde el encuadre fino al cambiar de forma, y es lo correcto: un
   * recorte 2:1 metido a la fuerza en un 1:1 no es el encuadre que elegiste,
   * es otro distinto sin que lo hayas decidido.
   */
  refitCrop(): void {
    const image = this.image
    if (!image) {
      this.crop = null
      return
    }
    this.crop = centeredCrop(image.width, image.height, this.aspect)
  }
}

export const project = new Project()
