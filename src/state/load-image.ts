/**
 * Cargar una imagen. Todo ocurre dentro del navegador: el archivo no sale de
 * este equipo, que es la única duda razonable al arrastrar una foto a una web.
 */

import type { RgbaImage } from '../lib/types'

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

/**
 * La copia de trabajo se limita a este lado mayor.
 *
 * No es un recorte de calidad: un patrón ancho son 120 cuentas, así que cada
 * celda promedia más de diez píxeles incluso aquí. Lo que evita es copiar 48 MB
 * de píxeles en cada fotograma mientras arrastras el recorte.
 */
export const MAX_WORKING_SIDE = 1600

export type LoadFailure = 'type' | 'decode'

export class ImageLoadError extends Error {
  constructor(public readonly reason: LoadFailure) {
    super(`No se pudo cargar la imagen: ${reason}`)
    this.name = 'ImageLoadError'
  }
}

export interface LoadedImage {
  name: string
  /** Tamaño de la copia de trabajo, que es en el que se mide el recorte. */
  width: number
  height: number
  /** Tamaño real del archivo, sólo para enseñarlo. */
  sourceWidth: number
  sourceHeight: number
  pixels: RgbaImage
  /** Para dibujarla en pantalla sin volver a decodificar. */
  source: HTMLCanvasElement
}

export async function loadImageFile(file: File): Promise<LoadedImage> {
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageLoadError('type')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageLoadError('decode')
  }

  const sourceWidth = bitmap.width
  const sourceHeight = bitmap.height
  if (sourceWidth < 1 || sourceHeight < 1) {
    bitmap.close()
    throw new ImageLoadError('decode')
  }

  const scale = Math.min(1, MAX_WORKING_SIDE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    bitmap.close()
    throw new ImageLoadError('decode')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const { data } = ctx.getImageData(0, 0, width, height)

  return {
    name: file.name,
    width,
    height,
    sourceWidth,
    sourceHeight,
    pixels: { width, height, data },
    source: canvas,
  }
}

/** El primer archivo de imagen de un arrastre o de un pegado. */
export function pickImageFile(items: DataTransfer | null): File | null {
  if (!items) return null
  const files = [...items.files]
  return files.find((f) => !f.type || f.type.startsWith('image/')) ?? null
}
