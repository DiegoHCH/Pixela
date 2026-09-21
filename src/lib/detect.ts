/**
 * Qué clase de imagen es, y qué ajustes pedirle al pipeline.
 *
 * Existe porque elegir mal aquí es el error más común del proyecto: el mismo
 * difuminado que salva los degradados de una foto convierte un dibujo plano en
 * confeti. La propuesta es automática, pero **siempre visible y corregible**:
 * un modo automático que no se puede corregir es peor que no tenerlo.
 */

import type { RgbaImage } from './types'
import type { SampleMode } from './sample'

/** Una foto, o un dibujo de zonas planas (ilustración o pixel art). */
export type ImageKind = 'photo' | 'flat'

export interface ImageStats {
  /** Píxeles mirados. Se muestrea: no hace falta recorrer cuatro megapíxeles. */
  samples: number
  /** Colores distintos entre las muestras, a 5 bits por canal. */
  unique: number
  uniqueRatio: number
  /**
   * Proporción de vecinos exactamente iguales.
   *
   * Es la señal que separa de verdad, medida sobre imágenes reales: un JPEG de
   * un dibujo de línea da ~0,34 —un tercio de los vecinos idénticos pese al
   * ruido de compresión— y un degradado fotográfico ~0,003. El pixel art de
   * bloques se va por encima de 0,7.
   */
  flatRatio: number
}

/** A partir de aquí la imagen se considera de zonas planas. */
export const FLAT_THRESHOLD = 0.15
/** Y a partir de aquí, pixel art de bloques: conviene muestreo directo. */
export const BLOCKY_THRESHOLD = 0.6

/**
 * Cuentas mínimas para que el difuminado aporte algo.
 *
 * Floyd–Steinberg cambia resolución espacial por resolución de color. Por
 * debajo de unas 2.500 celdas —50 × 50— no hay resolución espacial que dar, y
 * lo único que queda es el ruido.
 */
export const MIN_CELLS_FOR_DITHER = 2500

export function imageStats(image: RgbaImage): ImageStats {
  const { width, height, data } = image
  if (width < 1 || height < 1) throw new Error('Imagen vacía.')

  // Como mucho ~20.000 muestras: de sobra para una proporción, y constante.
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 20000)))

  const seen = new Set<number>()
  let samples = 0
  let pairs = 0
  let flat = 0

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const p = (y * width + x) * 4
      if (data[p + 3] < 110) continue
      samples++
      seen.add(((data[p] >> 3) << 10) | ((data[p + 1] >> 3) << 5) | (data[p + 2] >> 3))

      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx * step
        const ny = y + dy * step
        if (nx >= width || ny >= height) continue
        const q = (ny * width + nx) * 4
        if (data[q + 3] < 110) continue
        pairs++
        if (data[p] === data[q] && data[p + 1] === data[q + 1] && data[p + 2] === data[q + 2]) {
          flat++
        }
      }
    }
  }

  return {
    samples,
    unique: seen.size,
    uniqueRatio: seen.size / Math.max(1, samples),
    flatRatio: flat / Math.max(1, pairs),
  }
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
]

export function detectImageKind(image: RgbaImage): ImageKind {
  return kindFromStats(imageStats(image))
}

export interface SuggestedSettings {
  mode: SampleMode
  dither: boolean
}

/**
 * Los ajustes que se proponen al cargar, para el tamaño de rejilla que haya.
 *
 * El difuminado se apaga en los dibujos planos y también en cualquier patrón
 * pequeño, sea lo que sea la imagen: a 841 celdas —dos placas— no hay sitio
 * donde repartir el error.
 */
export function suggestedSettings(image: RgbaImage, cols: number, rows: number): SuggestedSettings {
  return suggestedSettingsFor(imageStats(image), cols, rows)
}

/** Igual, cuando las métricas ya están calculadas: se miran una vez al cargar. */
export function suggestedSettingsFor(
  stats: ImageStats,
  cols: number,
  rows: number,
): SuggestedSettings {
  const flat = stats.flatRatio >= FLAT_THRESHOLD
  const blocky = stats.flatRatio >= BLOCKY_THRESHOLD

  return {
    // El muestreo directo sólo para pixel art de bloques: en una ilustración
    // con líneas finas tirar píxeles se come los contornos.
    mode: blocky ? 'point' : 'average',
    dither: !flat && cols * rows >= MIN_CELLS_FOR_DITHER,
  }
}

/**
 * Si a este tamaño el dibujo se va a perder.
 *
 * Un dibujo de líneas necesita celdas para que se lean; una foto aguanta mejor
 * porque lo que la sostiene son las manchas de color. El plan avisa de los
 * patrones demasiado grandes —los que no caben en tus placas—, y este es el
 * aviso que faltaba: el del patrón demasiado pequeño para lo que le pides.
 */
export function losesDetail(image: RgbaImage, cols: number, rows: number): boolean {
  return losesDetailFor(detectImageKind(image), cols, rows)
}

/** Igual, con el tipo ya averiguado. */
export function losesDetailFor(kind: ImageKind, cols: number, rows: number): boolean {
  return kind === 'flat' && cols * rows < MIN_CELLS_FOR_DITHER
}

export function kindFromStats(stats: ImageStats): ImageKind {
  return stats.flatRatio >= FLAT_THRESHOLD ? 'flat' : 'photo'
}
