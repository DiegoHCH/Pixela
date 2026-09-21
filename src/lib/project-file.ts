/**
 * El archivo de proyecto: guardar lo que hiciste y volver a abrirlo.
 *
 * Guarda **la imagen de trabajo y las decisiones**, no el patrón ya calculado.
 * Así, al abrirlo, el patrón se vuelve a generar con el código de hoy — si
 * mañana mejora la cuantización, tus proyectos mejoran con ella. Guardar el
 * resultado lo habría congelado.
 *
 * Lo que **no** guarda es tu inventario ni cuántas placas tienes: eso es tuyo y
 * no del proyecto, y ya se recuerda aparte. Abrir el proyecto de otra persona no
 * debería reescribir lo que hay en tu cajón.
 *
 * La imagen va en PNG y no en JPEG a propósito: un JPEG recomprimido cambiaría
 * algunos colores y el patrón al reabrir no sería el mismo. Pesa más y da igual.
 */

import type { Rect } from './crop'
import type { SampleMode } from './sample'

/** Sube cuando el formato cambie de forma incompatible. */
export const PROJECT_FILE_VERSION = 1

export interface ProjectFile {
  /** Marca de formato: si no está, no es un proyecto de Pixela. */
  pixela: number
  savedAt: string
  name: string
  image: {
    width: number
    height: number
    sourceWidth: number
    sourceHeight: number
    /** PNG en base64, la copia de trabajo tal cual se usó. */
    dataUrl: string
  }
  crop: Rect
  measure: 'boards' | 'beads'
  boardsX: number
  boardsY: number
  beadCols: number
  beadRows: number
  board: { cols: number; rows: number }
  sampleMode: SampleMode
  dither: boolean
  maxColors: number | null
  brightness: number
  contrast: number
  saturation: number
  renderMode: 'color' | 'symbol'
  onlyOwned: boolean
  /**
   * En qué pantalla estabas. Sin esto, reabrir un proyecto ya convertido te
   * devolvía al recorte y había que convertir otra vez.
   */
  phase: 'crop' | 'pattern'
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ProjectFileError(`El campo «${field}» no es un número.`)
  }
  return value
}

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectFileError'
  }
}

/**
 * Valida y devuelve el proyecto. Falla con un motivo legible: abrir un JSON
 * cualquiera tiene que decir qué pasa, no dejar la app en un estado raro.
 */
export function parseProjectFile(input: unknown): ProjectFile {
  if (!input || typeof input !== 'object') {
    throw new ProjectFileError('El archivo no contiene un proyecto.')
  }
  const raw = input as Record<string, unknown>

  if (typeof raw.pixela !== 'number') {
    throw new ProjectFileError('Esto no es un proyecto de Pixela.')
  }
  if (raw.pixela > PROJECT_FILE_VERSION) {
    throw new ProjectFileError(
      `El proyecto es de una versión más nueva (${raw.pixela}) que esta app.`,
    )
  }

  const image = raw.image as Record<string, unknown> | undefined
  if (!image || typeof image.dataUrl !== 'string' || !image.dataUrl.startsWith('data:image/')) {
    throw new ProjectFileError('El proyecto no trae su imagen.')
  }

  const crop = raw.crop as Record<string, unknown> | undefined
  if (!crop) throw new ProjectFileError('El proyecto no trae su recorte.')

  const board = (raw.board ?? {}) as Record<string, unknown>

  return {
    pixela: raw.pixela,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    name: typeof raw.name === 'string' ? raw.name : 'proyecto',
    image: {
      width: asNumber(image.width, 'image.width'),
      height: asNumber(image.height, 'image.height'),
      sourceWidth: asNumber(image.sourceWidth ?? image.width, 'image.sourceWidth'),
      sourceHeight: asNumber(image.sourceHeight ?? image.height, 'image.sourceHeight'),
      dataUrl: image.dataUrl,
    },
    crop: {
      x: asNumber(crop.x, 'crop.x'),
      y: asNumber(crop.y, 'crop.y'),
      width: asNumber(crop.width, 'crop.width'),
      height: asNumber(crop.height, 'crop.height'),
    },
    measure: raw.measure === 'beads' ? 'beads' : 'boards',
    boardsX: clampInt(raw.boardsX, 1, 40, 2),
    boardsY: clampInt(raw.boardsY, 1, 40, 1),
    beadCols: clampInt(raw.beadCols, 1, 1000, 58),
    beadRows: clampInt(raw.beadRows, 1, 1000, 29),
    board: {
      cols: clampInt(board.cols, 1, 1000, 29),
      rows: clampInt(board.rows, 1, 1000, 29),
    },
    sampleMode: raw.sampleMode === 'point' ? 'point' : 'average',
    dither: raw.dither === true,
    maxColors: typeof raw.maxColors === 'number' ? clampInt(raw.maxColors, 1, 1000, 2) : null,
    brightness: clampInt(raw.brightness, -100, 100, 0),
    contrast: clampInt(raw.contrast, -100, 100, 0),
    saturation: clampInt(raw.saturation, -100, 100, 0),
    renderMode: raw.renderMode === 'symbol' ? 'symbol' : 'color',
    onlyOwned: raw.onlyOwned !== false,
    // Los archivos guardados antes de que esto existiera abren en el recorte,
    // que es de donde venían.
    phase: raw.phase === 'pattern' ? 'pattern' : 'crop',
  }
}

/**
 * Un número entero dentro de su rango, o el de reserva.
 *
 * Nada de lo que venga de un archivo entra sin comprobar: un `boardsX` de
 * 10.000 no rompería nada visible, sólo dejaría la app calculando para siempre.
 */
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}

/** Un nombre de archivo que se entienda dentro de un mes. */
export function projectFileName(source: string): string {
  const base =
    source
      .replace(/\.[a-z0-9]{1,5}$/i, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pixela'
  return `${base}.pixela.json`
}

/** Si el archivo que sueltan parece un proyecto y no una imagen. */
export function looksLikeProject(file: { name: string; type: string }): boolean {
  return file.type === 'application/json' || /\.json$/i.test(file.name)
}
