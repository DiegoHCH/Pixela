import { describe, expect, it } from 'vitest'

import { NEUTRAL, adjustGrid, isNeutral, type Adjustments } from './adjust'
import { sampleAverage } from './sample'
import type { CellGrid, RgbaImage } from './types'

function grid(pixels: Array<readonly [number, number, number, number]>): CellGrid {
  const data = new Float32Array(pixels.length * 4)
  pixels.forEach((px, i) => data.set(px, i * 4))
  return { cols: pixels.length, rows: 1, data }
}

const cell = (g: CellGrid, i = 0) => [g.data[i * 4], g.data[i * 4 + 1], g.data[i * 4 + 2]]

describe('en neutro', () => {
  it('no toca nada y devuelve la misma rejilla', () => {
    const original = grid([[10, 120, 240, 255]])
    expect(adjustGrid(original, NEUTRAL)).toBe(original)
    expect(isNeutral(NEUTRAL)).toBe(true)
  })
})

describe('brillo', () => {
  it('suma y resta luz', () => {
    const g = grid([[100, 100, 100, 255]])
    expect(cell(adjustGrid(g, { ...NEUTRAL, brightness: 20 }))[0]).toBeCloseTo(151, 0)
    expect(cell(adjustGrid(g, { ...NEUTRAL, brightness: -20 }))[0]).toBeCloseTo(49, 0)
  })

  it('no se sale del canal', () => {
    const g = grid([[250, 5, 128, 255]])
    const claro = cell(adjustGrid(g, { ...NEUTRAL, brightness: 100 }))
    const oscuro = cell(adjustGrid(g, { ...NEUTRAL, brightness: -100 }))
    expect(Math.max(...claro)).toBeLessThanOrEqual(255)
    expect(Math.min(...oscuro)).toBeGreaterThanOrEqual(0)
  })
})

describe('contraste', () => {
  it('separa del gris medio', () => {
    const g = grid([
      [200, 200, 200, 255],
      [60, 60, 60, 255],
    ])
    const out = adjustGrid(g, { ...NEUTRAL, contrast: 40 })
    expect(cell(out, 0)[0]).toBeGreaterThan(200)
    expect(cell(out, 1)[0]).toBeLessThan(60)
  })

  it('a contraste negativo, todo se acerca al gris', () => {
    const g = grid([
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    ])
    const out = adjustGrid(g, { ...NEUTRAL, contrast: -80 })
    expect(cell(out, 0)[0]).toBeLessThan(180)
    expect(cell(out, 1)[0]).toBeGreaterThan(70)
  })

  it('el gris medio es el punto que no se mueve', () => {
    const g = grid([[128, 128, 128, 255]])
    for (const contrast of [-60, -20, 20, 60]) {
      expect(cell(adjustGrid(g, { ...NEUTRAL, contrast }))[0]).toBeCloseTo(128, 6)
    }
  })
})

describe('saturación', () => {
  it('a −100 queda gris, y con la luminancia que toca', () => {
    // Rojo puro: su luminancia es baja, así que el gris tiene que salir oscuro.
    // Promediar los tres canales daría 85; la fórmula percibida da 54.
    const out = adjustGrid(grid([[255, 0, 0, 255]]), { ...NEUTRAL, saturation: -100 })
    const [r, g, b] = cell(out)
    expect(r).toBeCloseTo(g, 4)
    expect(g).toBeCloseTo(b, 4)
    expect(r).toBeCloseTo(54, 0)
  })

  it('un gris no cambia por saturarlo', () => {
    const g = grid([[120, 120, 120, 255]])
    for (const saturation of [-100, -40, 40, 100]) {
      expect(cell(adjustGrid(g, { ...NEUTRAL, saturation }))).toEqual([120, 120, 120])
    }
  })

  it('a saturación positiva, el color se aleja del gris', () => {
    const out = adjustGrid(grid([[180, 120, 100, 255]]), { ...NEUTRAL, saturation: 50 })
    const [r, , b] = cell(out)
    expect(r).toBeGreaterThan(180)
    expect(b).toBeLessThan(100)
  })
})

describe('el alfa', () => {
  it('no se toca: lo transparente sigue sin cuenta', () => {
    const out = adjustGrid(grid([[10, 20, 30, 40]]), {
      brightness: 50,
      contrast: 50,
      saturation: 50,
    })
    expect(out.data[3]).toBe(40)
  })
})

describe('ajustar después de muestrear, no antes', () => {
  /** Una imagen con variación en los tres canales. */
  function image(width: number, height: number): RgbaImage {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4
        data[p] = 40 + ((x * 7) % 120)
        data[p + 1] = 90 + ((y * 5) % 90)
        data[p + 2] = 60 + ((x + y) % 100)
        data[p + 3] = 255
      }
    }
    return { width, height, data }
  }

  /** Los mismos ajustes aplicados a la imagen, píxel a píxel. */
  function adjustImage(img: RgbaImage, a: Adjustments): RgbaImage {
    const asGrid: CellGrid = {
      cols: img.width,
      rows: img.height,
      data: Float32Array.from(img.data),
    }
    const out = adjustGrid(asGrid, a)
    return { width: img.width, height: img.height, data: Uint8ClampedArray.from(out.data) }
  }

  it('da el mismo resultado, porque las tres operaciones son afines', () => {
    // Es lo que justifica hacerlo sobre la rejilla y no sobre la imagen: mil
    // veces más barato, y una operación afín conmuta con la media.
    const img = image(120, 90)
    const ajustes: Adjustments = { brightness: 12, contrast: 25, saturation: -15 }

    const despues = adjustGrid(sampleAverage(img, 30, 20), ajustes)
    const antes = sampleAverage(adjustImage(img, ajustes), 30, 20)

    for (let i = 0; i < despues.data.length; i++) {
      // Un punto de margen: la versión «antes» pasa por enteros de 8 bits.
      expect(despues.data[i]).toBeCloseTo(antes.data[i], 0)
    }
  })

  it('sólo se separan donde el recorte al canal muerde', () => {
    // Con ajustes que empujan fuera de gama, el orden sí importa: recortar a
    // 0–255 no es una operación afín. Es la única diferencia, y se acota.
    const img = image(60, 60)
    const brutal: Adjustments = { brightness: 90, contrast: 90, saturation: 0 }

    const despues = adjustGrid(sampleAverage(img, 15, 15), brutal)
    const antes = sampleAverage(adjustImage(img, brutal), 15, 15)

    let iguales = 0
    for (let i = 0; i < despues.data.length; i++) {
      if (Math.abs(despues.data[i] - antes.data[i]) <= 1) iguales++
    }
    // La mayoría sigue coincidiendo; lo que no, es gama recortada.
    expect(iguales / despues.data.length).toBeGreaterThan(0.6)
  })
})
