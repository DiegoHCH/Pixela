/**
 * El recorte, medido en placas.
 *
 * La placa es la entrada y no el resultado: eliges la forma del montaje y la
 * imagen se ajusta a ella. Por eso aquí no hay selector de proporciones — la
 * proporción *es* la forma del montaje, y eran el mismo control dicho dos
 * veces.
 *
 * Todo en coordenadas de píxel de la imagen original, y todo puro.
 */

import type { RgbaImage } from './types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Las cuatro esquinas, que son los únicos tiradores del recorte. */
export type Handle = 'nw' | 'ne' | 'sw' | 'se'

/** Por debajo de esto el recorte deja de tener sentido y de poder agarrarse. */
export const MIN_CROP = 16

export function aspectOf(cols: number, rows: number): number {
  if (cols < 1 || rows < 1) throw new Error(`Rejilla inválida: ${cols} × ${rows}.`)
  return cols / rows
}

/** El recorte más grande con esa proporción que cabe en la imagen, centrado. */
export function centeredCrop(imageW: number, imageH: number, aspect: number): Rect {
  if (imageW < 1 || imageH < 1) throw new Error('Imagen vacía.')
  if (!(aspect > 0)) throw new Error(`Proporción inválida: ${aspect}.`)

  let width = imageW
  let height = width / aspect
  if (height > imageH) {
    height = imageH
    width = height * aspect
  }
  return {
    x: (imageW - width) / 2,
    y: (imageH - height) / 2,
    width,
    height,
  }
}

/** Empuja el recorte dentro de la imagen sin cambiarle el tamaño. */
export function clampToImage(rect: Rect, imageW: number, imageH: number): Rect {
  return {
    ...rect,
    x: Math.min(Math.max(0, rect.x), Math.max(0, imageW - rect.width)),
    y: Math.min(Math.max(0, rect.y), Math.max(0, imageH - rect.height)),
  }
}

export function moveCrop(
  rect: Rect,
  dx: number,
  dy: number,
  imageW: number,
  imageH: number,
): Rect {
  return clampToImage({ ...rect, x: rect.x + dx, y: rect.y + dy }, imageW, imageH)
}

/**
 * Arrastra una esquina. La opuesta queda clavada, la proporción no se negocia y
 * el recorte no puede salirse de la imagen.
 */
export function resizeCrop(
  rect: Rect,
  handle: Handle,
  pointerX: number,
  pointerY: number,
  imageW: number,
  imageH: number,
  aspect: number,
  minSize: number = MIN_CROP,
): Rect {
  // La esquina que no se mueve.
  const anchorX = handle === 'nw' || handle === 'sw' ? rect.x + rect.width : rect.x
  const anchorY = handle === 'nw' || handle === 'ne' ? rect.y + rect.height : rect.y

  // Hacia dónde crece desde el ancla. Se decide con el puntero, así que cruzar
  // la esquina opuesta da la vuelta al recorte en vez de bloquearlo.
  const dirX = pointerX >= anchorX ? 1 : -1
  const dirY = pointerY >= anchorY ? 1 : -1

  // De las dos medidas que pide el puntero, manda la que da el recorte mayor:
  // así la esquina sigue al ratón por el lado que domina.
  let width = Math.max(Math.abs(pointerX - anchorX), Math.abs(pointerY - anchorY) * aspect)

  // Techo: lo que queda de imagen desde el ancla, por los dos ejes.
  const roomX = dirX > 0 ? imageW - anchorX : anchorX
  const roomY = dirY > 0 ? imageH - anchorY : anchorY
  width = Math.min(width, roomX, roomY * aspect)

  // Suelo, sin salirse: si no cabe ni el mínimo, se queda con lo que haya.
  width = Math.max(Math.min(minSize, roomX, roomY * aspect), width)

  const height = width / aspect
  return {
    x: dirX > 0 ? anchorX : anchorX - width,
    y: dirY > 0 ? anchorY : anchorY - height,
    width,
    height,
  }
}

/**
 * Saca la región recortada como imagen suelta, lista para el paso 2.
 *
 * Redondea a píxel entero y se queda dentro de la imagen: un recorte con
 * decimales sería una fuente silenciosa de filas corridas.
 */
export function cropImage(img: RgbaImage, rect: Rect): RgbaImage {
  const x0 = Math.max(0, Math.min(img.width - 1, Math.round(rect.x)))
  const y0 = Math.max(0, Math.min(img.height - 1, Math.round(rect.y)))
  const width = Math.max(1, Math.min(Math.round(rect.width), img.width - x0))
  const height = Math.max(1, Math.min(Math.round(rect.height), img.height - y0))

  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const from = ((y0 + y) * img.width + x0) * 4
    data.set(img.data.subarray(from, from + width * 4), y * width * 4)
  }
  return { width, height, data }
}
