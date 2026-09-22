import { describe, expect, it } from 'vitest'

import { MIN_CROP, aspectOf, centeredCrop, clampToImage, cropImage, moveCrop, resizeCrop } from './crop'
import type { Rect } from './crop'
import type { RgbaImage } from './types'

/** Dos placas en horizontal: 58 × 29 cuentas, o sea 2:1. */
const DOS_PLACAS = aspectOf(58, 29)

function fits(rect: Rect, w: number, h: number): boolean {
  return (
    rect.x >= -0.001 &&
    rect.y >= -0.001 &&
    rect.x + rect.width <= w + 0.001 &&
    rect.y + rect.height <= h + 0.001
  )
}

describe('aspectOf', () => {
  it('la proporción sale de la forma del montaje', () => {
    expect(aspectOf(58, 29)).toBe(2)
    expect(aspectOf(29, 29)).toBe(1)
    expect(aspectOf(87, 58)).toBe(1.5)
  })

  it('no hay montajes de cero', () => {
    expect(() => aspectOf(0, 10)).toThrow(/rejilla/i)
  })
})

describe('centeredCrop', () => {
  it('en una imagen más ancha que el montaje, limita la altura', () => {
    const crop = centeredCrop(1000, 400, DOS_PLACAS)
    expect(crop).toEqual({ x: 100, y: 0, width: 800, height: 400 })
  })

  it('en una imagen más alta, limita el ancho', () => {
    const crop = centeredCrop(600, 900, DOS_PLACAS)
    expect(crop).toEqual({ x: 0, y: 300, width: 600, height: 300 })
  })

  it('cuando la proporción ya coincide, se queda con la imagen entera', () => {
    expect(centeredCrop(580, 290, DOS_PLACAS)).toEqual({ x: 0, y: 0, width: 580, height: 290 })
  })

  it('siempre cabe y siempre conserva la proporción', () => {
    for (const [w, h] of [
      [4032, 3024],
      [1080, 1920],
      [500, 500],
      [3000, 200],
    ]) {
      for (const aspect of [1, 2, 3 / 2, 1 / 2]) {
        const crop = centeredCrop(w, h, aspect)
        expect(fits(crop, w, h)).toBe(true)
        expect(crop.width / crop.height).toBeCloseTo(aspect, 6)
      }
    }
  })

  it('protesta con entradas imposibles', () => {
    expect(() => centeredCrop(0, 100, 2)).toThrow(/imagen/i)
    expect(() => centeredCrop(100, 100, 0)).toThrow(/proporción/i)
  })
})

describe('moveCrop', () => {
  const crop = centeredCrop(1000, 400, DOS_PLACAS) // 800 × 400 en x=100

  it('mueve lo que se le pide mientras quepa', () => {
    expect(moveCrop(crop, -50, 0, 1000, 400).x).toBe(50)
  })

  it('topa con el borde en vez de salirse', () => {
    expect(moveCrop(crop, -500, 0, 1000, 400).x).toBe(0)
    expect(moveCrop(crop, 500, 0, 1000, 400).x).toBe(200)
    expect(moveCrop(crop, 0, 80, 1000, 400).y).toBe(0)
  })

  it('no cambia el tamaño al mover', () => {
    const movido = moveCrop(crop, -500, 300, 1000, 400)
    expect([movido.width, movido.height]).toEqual([crop.width, crop.height])
  })
})

describe('clampToImage', () => {
  it('con un recorte más grande que la imagen lo deja en el origen', () => {
    const grande: Rect = { x: -30, y: -20, width: 2000, height: 1000 }
    expect(clampToImage(grande, 500, 500)).toMatchObject({ x: 0, y: 0 })
  })
})

describe('resizeCrop', () => {
  const imagen = { w: 1000, h: 600 }
  const crop: Rect = { x: 200, y: 150, width: 400, height: 200 }

  it('clava la esquina opuesta', () => {
    const nuevo = resizeCrop(crop, 'se', 900, 500, imagen.w, imagen.h, DOS_PLACAS)
    expect(nuevo.x).toBeCloseTo(crop.x, 6)
    expect(nuevo.y).toBeCloseTo(crop.y, 6)
  })

  it('la esquina de arriba a la izquierda crece hacia arriba y hacia la izquierda', () => {
    const nuevo = resizeCrop(crop, 'nw', 100, 100, imagen.w, imagen.h, DOS_PLACAS)
    expect(nuevo.x + nuevo.width).toBeCloseTo(crop.x + crop.width, 6)
    expect(nuevo.y + nuevo.height).toBeCloseTo(crop.y + crop.height, 6)
    expect(nuevo.width).toBeGreaterThan(crop.width)
  })

  it('la proporción no se negocia', () => {
    for (const handle of ['nw', 'ne', 'sw', 'se'] as const) {
      for (const [px, py] of [
        [0, 0],
        [999, 599],
        [500, 20],
        [10, 580],
      ]) {
        const nuevo = resizeCrop(crop, handle, px, py, imagen.w, imagen.h, DOS_PLACAS)
        expect(nuevo.width / nuevo.height).toBeCloseTo(DOS_PLACAS, 6)
      }
    }
  })

  it('nunca se sale de la imagen, tire uno donde tire', () => {
    for (const handle of ['nw', 'ne', 'sw', 'se'] as const) {
      for (const [px, py] of [
        [-400, -400],
        [3000, 3000],
        [-400, 3000],
        [3000, -400],
      ]) {
        const nuevo = resizeCrop(crop, handle, px, py, imagen.w, imagen.h, DOS_PLACAS)
        expect(fits(nuevo, imagen.w, imagen.h)).toBe(true)
      }
    }
  })

  it('no se encoge por debajo del mínimo agarrable', () => {
    const nuevo = resizeCrop(crop, 'se', 601, 351, imagen.w, imagen.h, DOS_PLACAS)
    expect(nuevo.width).toBeGreaterThanOrEqual(MIN_CROP)
  })

  it('sigue al puntero por el lado que domina', () => {
    // Puntero muy a la derecha y poco abajo: manda el ancho.
    const ancho = resizeCrop(crop, 'se', 900, 360, imagen.w, imagen.h, DOS_PLACAS)
    expect(ancho.width).toBeCloseTo(700, 6)
    // Puntero poco a la derecha y muy abajo: manda el alto.
    const alto = resizeCrop(crop, 'se', 620, 550, imagen.w, imagen.h, DOS_PLACAS)
    expect(alto.height).toBeCloseTo(400, 6)
  })

  it('al cruzar la esquina opuesta, el recorte da la vuelta', () => {
    const nuevo = resizeCrop(crop, 'se', 100, 100, imagen.w, imagen.h, DOS_PLACAS)
    expect(nuevo.x + nuevo.width).toBeCloseTo(crop.x, 6)
    expect(fits(nuevo, imagen.w, imagen.h)).toBe(true)
  })
})

describe('cropImage', () => {
  /** Imagen donde cada píxel guarda su columna y su fila, para reconocerlo. */
  function marked(width: number, height: number): RgbaImage {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4
        data[p] = x
        data[p + 1] = y
        data[p + 2] = 0
        data[p + 3] = 255
      }
    }
    return { width, height, data }
  }

  it('saca la región pedida, y sólo esa', () => {
    const out = cropImage(marked(10, 10), { x: 2, y: 3, width: 4, height: 5 })
    expect([out.width, out.height]).toEqual([4, 5])
    expect([out.data[0], out.data[1]]).toEqual([2, 3])
    const ultimo = (4 * 5 - 1) * 4
    expect([out.data[ultimo], out.data[ultimo + 1]]).toEqual([5, 7])
  })

  it('redondea a píxel entero', () => {
    const out = cropImage(marked(10, 10), { x: 1.6, y: 2.4, width: 3.5, height: 3.4 })
    expect([out.width, out.height]).toEqual([4, 3])
    expect([out.data[0], out.data[1]]).toEqual([2, 2])
  })

  it('no se sale de la imagen aunque se lo pidan', () => {
    const out = cropImage(marked(10, 10), { x: 8, y: 8, width: 100, height: 100 })
    expect([out.width, out.height]).toEqual([2, 2])
    expect(out.data.length).toBe(2 * 2 * 4)
  })

  it('devuelve al menos un píxel', () => {
    const out = cropImage(marked(10, 10), { x: 0, y: 0, width: 0, height: 0 })
    expect([out.width, out.height]).toEqual([1, 1])
  })

  it('el recorte completo es la imagen entera', () => {
    const src = marked(6, 4)
    const out = cropImage(src, { x: 0, y: 0, width: 6, height: 4 })
    expect([...out.data]).toEqual([...src.data])
  })
})
