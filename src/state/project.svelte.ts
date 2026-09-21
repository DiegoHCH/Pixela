/**
 * El proyecto abierto: la imagen, la forma del montaje y el recorte.
 *
 * Todo el cálculo de verdad vive en `lib/`. Esto sólo guarda las decisiones del
 * usuario y encadena los pasos cuando cambian.
 */

import { MIDI_SQUARE, boardSlice, layoutFor, patternSize, planBatches } from '../lib/boards'
import { aspectOf, centeredCrop, clampToImage, cropImage, type Rect } from '../lib/crop'
import {
  imageStats,
  kindFromStats,
  losesDetailFor,
  suggestedSettingsFor,
  type ImageKind,
} from '../lib/detect'
import { accentSourceOf } from '../lib/accent'
import { isNeutral, type Adjustments } from '../lib/adjust'
import { fidelity, isFar, type Fidelity } from '../lib/fidelity'
import { MIDI_PITCH_MM, physicalSize, type PhysicalSize } from '../lib/measure'
import { ownedPalette } from '../lib/inventory'
import { catalogPalette } from '../lib/palette'
import { buildPattern } from '../lib/index'
import { countBeads, totalBeads } from '../lib/quantize'
import type { SampleMode } from '../lib/sample'
import { DEFAULT_BAG_SIZE, shoppingList, type ShoppingList } from '../lib/shopping'
import type { Board, Palette, Pattern } from '../lib/types'
import { inventory } from './inventory.svelte'
import type { ProjectFile } from '../lib/project-file'
import type { LoadedImage } from './load-image'
import { readNumber, readString, writeNumber, writeString } from './storage'

/** Lo que se recuerda entre sesiones: son datos tuyos, no del patrón. */
const KEYS = {
  boards: 'pixela:boards',
  bag: 'pixela:bagSize',
  pitch: 'pixela:pitchMm',
  onlyOwned: 'pixela:onlyOwned',
} as const

/**
 * El catálogo entero, con el color medido donde lo hay. Se calcula una vez: son
 * 175 conversiones a CIELAB que no cambian nunca.
 */
const CATALOG = catalogPalette()

/** Se mide en placas por defecto; «Cuentas» es la salida para un tamaño concreto. */
export type Measure = 'boards' | 'beads'

/**
 * Encuadrar, mirar el patrón y repasar el inventario son pantallas, no
 * pestañas. El inventario recuerda de dónde vino para volver ahí.
 */
export type Phase = 'crop' | 'pattern' | 'inventory'

/** Lo más grande que ofrece el selector de forma del montaje. */
export const MAX_BOARDS_X = 5
export const MAX_BOARDS_Y = 4

/**
 * El nombre del archivo sin la extensión: el punto de partida del título.
 *
 * Quita sólo extensiones de imagen y no «lo que haya tras el último punto»,
 * porque un patrón puede llamarse «Nami v1.2» y ese «.2» es parte del nombre.
 */
function titleFrom(fileName: string): string {
  return fileName.replace(/\.(png|jpe?g|gif|webp)$/i, '').trim() || 'patrón'
}

class Project {
  image = $state<LoadedImage | null>(null)
  /**
   * Cómo se llama esto. Sale del archivo que abriste, y lo cambias cuando
   * quieras: es lo que nombra el PNG que exportas y el proyecto que guardas.
   */
  name = $state('')
  /** En qué pantalla estás: encuadrando, o mirando el patrón. */
  phase = $state<Phase>('crop')
  measure = $state<Measure>('boards')
  boardsX = $state(2)
  boardsY = $state(1)
  beadCols = $state(58)
  beadRows = $state(29)
  board = $state<Board>(MIDI_SQUARE)
  /**
   * Cuántas placas tienes. Es un dato tuyo, no del patrón: se pregunta una vez
   * y se recuerda, como el tema. Se cambia cuando compres más.
   */
  ownedBoards = $state(readNumber(KEYS.boards, 2, { min: 1, max: 99 }))
  /** Cuentas por bolsa: 320 en la tienda del cajón, 1.000 las de fábrica. */
  bagSize = $state(readNumber(KEYS.bag, DEFAULT_BAG_SIZE, { min: 1, max: 10000 }))
  /**
   * Lo que mide una cuenta de lado, en milímetros. Midi son 5; si mides tu
   * placa de borde a borde y no cuadra, aquí se corrige.
   */
  pitchMm = $state(readNumber(KEYS.pitch, MIDI_PITCH_MM, { min: 1, max: 20 }))
  crop = $state<Rect | null>(null)

  sampleMode = $state<SampleMode>('average')
  dither = $state(true)
  maxColors = $state<number | null>(null)

  /**
   * Brillo, contraste y saturación. Con fotos cambian el resultado tanto como
   * el difuminado: las cuentas son colores planos y saturados, así que subir
   * algo el contraste casi siempre mejora el patrón.
   */
  brightness = $state(0)
  contrast = $state(0)
  saturation = $state(0)

  /**
   * Cómo se dibuja: color, o una letra por color. Los símbolos no son para
   * imprimir —eso es otro modo— sino para montar cuando dos colores se parecen
   * demasiado en pantalla, y para que la app sirva a quien no distingue rojo de
   * verde.
   */
  renderMode = $state<'color' | 'symbol'>('color')

  /** Qué clase de imagen es, mirada una sola vez al cargar. */
  imageKind = $state<ImageKind | null>(null)

  /**
   * Cuantizar sólo contra lo que tienes. Puesto por defecto: un patrón con
   * colores que no están en la caja no se puede montar.
   */
  onlyOwned = $state(readString(KEYS.onlyOwned) !== 'no')

  /**
   * El color del que sale el acento de la interfaz.
   *
   * Se fija al abrir una imagen y al convertir, y no se toca mientras afinas:
   * recalcularlo en cada tic de un deslizante hacía parpadear los botones
   * mientras los usabas. El acento es del patrón, no del último fotograma.
   */
  accentSource = $state<string | null>(null)

  /** El color aislado: apaga todos los demás en el lienzo. */
  isolated = $state<number | null>(null)
  /** La placa señalada en la tira, en índice de lectura. */
  selectedBoard = $state<number | null>(null)

  /**
   * Sube cada vez que se convierte. Es lo que dispara la única animación de la
   * app —las cuentas cayendo fila a fila— sin que se repita al mover un control
   * después: esperar transiciones mientras ajustas algo es irritante.
   */
  conversionId = $state(0)
  fallRows = $state(0)

  #phaseBefore: Phase = 'crop'

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

  /**
   * La paleta de trabajo: el catálogo entero, recortado a lo que tienes cuando
   * «sólo lo que tengo» está puesto.
   *
   * Con el catálogo completo el patrón sale bonito y no se puede montar; con lo
   * que tienes sale montable. Por eso el filtro viene puesto por defecto.
   */
  get workingPalette(): Palette {
    return this.onlyOwned ? ownedPalette(CATALOG, inventory.all) : CATALOG
  }

  #result = $derived.by(() => {
    const image = this.image
    const crop = this.crop
    if (!image || !crop) return null

    const palette = this.workingPalette
    // Sin colores marcados no hay patrón posible, y decirlo es mejor que
    // dibujar algo con cuentas que no están en la caja.
    if (palette.filter((b) => !b.metallic).length === 0) return null

    const { cols, rows } = this.grid
    const cut = cropImage(image.pixels, crop)
    return buildPattern(cut, cols, rows, palette, {
      mode: this.sampleMode,
      dither: this.dither,
      maxColors: this.maxColors ?? undefined,
      adjustments: this.adjustments,
    })
  })

  get pattern(): Pattern | null {
    return this.#result?.pattern ?? null
  }

  /**
   * Cuánto se aleja el patrón de la imagen. Se mide en la misma pasada que lo
   * genera: con una paleta corta, una foto de una cara sale con la piel gris y
   * el algoritmo no tiene la culpa — no hay con qué.
   */
  get fidelity(): Fidelity | null {
    const r = this.#result
    return r ? fidelity(r.grid, r.pattern, r.palette) : null
  }

  /** Si conviene decir que el parecido es flojo. */
  get farFromImage(): boolean {
    return isFar(this.fidelity)
  }

  /** La paleta con la que se cuantizó: los índices del patrón son suyos. */
  get palette(): Palette {
    return this.#result?.palette ?? this.workingPalette
  }

  get counts() {
    const pattern = this.pattern
    return pattern ? countBeads(pattern) : []
  }

  /** La lista de la compra: cuentas y bolsas por color. */
  get shopping(): ShoppingList | null {
    const pattern = this.pattern
    return pattern ? shoppingList(pattern, this.palette, this.bagSize) : null
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

  /** Si a este tamaño el dibujo se va a perder, para decirlo antes de montar. */
  get losesDetail(): boolean {
    if (!this.imageKind) return false
    const { cols, rows } = this.grid
    return losesDetailFor(this.imageKind, cols, rows)
  }

  get adjustments(): Adjustments {
    return { brightness: this.brightness, contrast: this.contrast, saturation: this.saturation }
  }

  get adjusted(): boolean {
    return !isNeutral(this.adjustments)
  }

  resetAdjustments(): void {
    this.brightness = 0
    this.contrast = 0
    this.saturation = 0
  }

  /** El recorte de la placa señalada, para verla sola y con sus huecos. */
  get selectedBoardPattern(): Pattern | null {
    const pattern = this.pattern
    const layout = this.layout
    const index = this.selectedBoard
    if (!pattern || !layout || index == null) return null
    return boardSlice(pattern, index % layout.cols, Math.floor(index / layout.cols), this.board)
  }

  /**
   * Abre una imagen y **propone** los ajustes según lo que es.
   *
   * Se proponen y no se imponen: quedan visibles en la columna y se cambian en
   * un gesto. Pero proponerlos es lo que separa un patrón de un confeti — el
   * mismo difuminado que salva una foto destroza un dibujo plano.
   */
  open(image: LoadedImage): void {
    this.image = image
    this.name = titleFrom(image.name)
    this.phase = 'crop'
    this.isolated = null
    this.selectedBoard = null
    this.maxColors = null
    this.resetAdjustments()
    this.refitCrop()

    const stats = imageStats(image.pixels)
    this.imageKind = kindFromStats(stats)
    const { cols, rows } = this.grid
    const suggested = suggestedSettingsFor(stats, cols, rows)
    this.sampleMode = suggested.mode
    this.dither = suggested.dither
    // Con la imagen recién abierta ya hay patrón de previsualización: de ahí
    // sale el acento, y ahí se queda hasta que conviertas.
    this.refreshAccent()
  }

  close(): void {
    this.image = null
    this.name = ''
    this.crop = null
    this.phase = 'crop'
    this.isolated = null
    this.selectedBoard = null
    this.imageKind = null
    this.accentSource = null
  }

  /** Los ajustes que definen el patrón, para guardarlos en un archivo. */
  get settings() {
    return {
      crop: this.crop ?? { x: 0, y: 0, width: 1, height: 1 },
      measure: this.measure,
      boardsX: this.boardsX,
      boardsY: this.boardsY,
      beadCols: this.beadCols,
      beadRows: this.beadRows,
      board: { cols: this.board.cols, rows: this.board.rows },
      sampleMode: this.sampleMode,
      dither: this.dither,
      maxColors: this.maxColors,
      brightness: this.brightness,
      contrast: this.contrast,
      saturation: this.saturation,
      renderMode: this.renderMode,
      onlyOwned: this.onlyOwned,
      // El inventario no entra, pero la pantalla sí: es parte de dónde lo
      // dejaste, no de lo que tienes en el cajón.
      phase: this.phase === 'pattern' ? ('pattern' as const) : ('crop' as const),
    }
  }

  /**
   * Abre un proyecto guardado.
   *
   * No pasa por la propuesta automática de `open()`: los ajustes del archivo
   * son decisiones que ya tomaste, y volver a proponer encima las borraría.
   */
  restore(image: LoadedImage, file: ProjectFile): void {
    this.image = image
    this.name = titleFrom(file.name || image.name)
    this.phase = 'crop'
    this.isolated = null
    this.selectedBoard = null
    this.imageKind = kindFromStats(imageStats(image.pixels))

    this.measure = file.measure
    this.boardsX = file.boardsX
    this.boardsY = file.boardsY
    this.beadCols = file.beadCols
    this.beadRows = file.beadRows
    this.board = { cols: file.board.cols, rows: file.board.rows }
    this.sampleMode = file.sampleMode
    this.dither = file.dither
    this.maxColors = file.maxColors
    this.brightness = file.brightness
    this.contrast = file.contrast
    this.saturation = file.saturation
    this.renderMode = file.renderMode
    this.onlyOwned = file.onlyOwned

    // El recorte va al final: los ajustes de arriba cambian la proporción, y
    // ponerlo antes lo dejaría reencuadrado por `refitCrop`.
    this.crop = clampToImage(file.crop, image.width, image.height)

    // Y si lo guardaste convertido, vuelve convertido: reabrir un proyecto
    // terminado no debería obligarte a convertirlo otra vez.
    if (file.phase === 'pattern') this.convert()
    else this.refreshAccent()
  }

  /** Vuelve a mirar de qué color es el patrón. Sólo en momentos concretos. */
  refreshAccent(): void {
    const pattern = this.pattern
    this.accentSource = pattern ? accentSourceOf(pattern, this.palette) : null
  }

  /** Del recorte al patrón. Aquí es donde caen las cuentas. */
  convert(): void {
    const pattern = this.pattern
    if (!pattern) return
    this.refreshAccent()
    this.phase = 'pattern'
    this.isolated = null
    this.selectedBoard = null
    this.fallRows = pattern.rows
    this.conversionId++
  }

  /** El inventario se abre encima y vuelve a donde estabas. */
  openInventory(): void {
    if (this.phase === 'inventory') return
    this.#phaseBefore = this.phase
    this.phase = 'inventory'
  }

  closeInventory(): void {
    if (this.phase !== 'inventory') return
    // Si estabas mirando un patrón y ahora no hay colores, no hay a dónde
    // volver: el recorte sí funciona siempre.
    this.phase = this.#phaseBefore === 'pattern' && !this.pattern ? 'crop' : this.#phaseBefore
  }

  backToCrop(): void {
    this.phase = 'crop'
    this.isolated = null
    this.selectedBoard = null
  }

  /**
   * Aislar un color sirve para dos cosas concretas: ver si aporta algo antes de
   * comprarlo, y colocar todas sus cuentas de una tacada, que es como se monta
   * rápido de verdad. Pulsar el mismo otra vez vuelve al patrón completo.
   */
  toggleIsolate(index: number): void {
    this.isolated = this.isolated === index ? null : index
  }

  selectBoard(index: number | null): void {
    this.selectedBoard = this.selectedBoard === index ? null : index
  }

  /** Cuántas placas tienes, recordado entre sesiones. */
  setOwnedBoards(count: number): void {
    const n = Math.max(1, Math.min(99, Math.round(count)))
    this.ownedBoards = n
    writeNumber(KEYS.boards, n)
  }

  setOnlyOwned(value: boolean): void {
    this.onlyOwned = value
    writeString(KEYS.onlyOwned, value ? 'si' : 'no')
  }

  /** El tamaño de la pieza terminada. Lo primero que se pregunta al enmarcar. */
  get size(): PhysicalSize {
    const { cols, rows } = this.grid
    return physicalSize(cols, rows, this.pitchMm)
  }

  setPitch(mm: number): void {
    const value = Math.max(1, Math.min(20, Math.round(mm * 100) / 100))
    this.pitchMm = value
    writeNumber(KEYS.pitch, value)
  }

  /** Sin nombre no se queda: vuelve al del archivo, o a algo. */
  setName(value: string): void {
    const clean = value.trim().slice(0, 80)
    this.name = clean || (this.image ? titleFrom(this.image.name) : '')
  }

  setBagSize(size: number): void {
    const n = Math.max(1, Math.min(10000, Math.round(size)))
    this.bagSize = n
    writeNumber(KEYS.bag, n)
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
   * Reencuadra con la proporción actual.
   *
   * Si ya había recorte se conserva su centro y su tamaño hasta donde la nueva
   * proporción lo permita: encuadraste una cara y cambias de 2 × 1 a 3 × 2, y
   * la cara sigue donde estaba. Saltar al centro de la imagen sería perder un
   * encuadre que sí habías decidido.
   */
  refitCrop(): void {
    const image = this.image
    if (!image) {
      this.crop = null
      return
    }

    const aspect = this.aspect
    const largest = centeredCrop(image.width, image.height, aspect)
    const previous = this.crop
    if (!previous) {
      this.crop = largest
      return
    }

    const width = Math.min(previous.width, largest.width)
    const height = width / aspect
    const centerX = previous.x + previous.width / 2
    const centerY = previous.y + previous.height / 2

    this.crop = clampToImage(
      { x: centerX - width / 2, y: centerY - height / 2, width, height },
      image.width,
      image.height,
    )
  }
}

export const project = new Project()
