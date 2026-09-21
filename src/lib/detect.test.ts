import { describe, expect, it } from 'vitest'

import {
  BLOCKY_THRESHOLD,
  FLAT_THRESHOLD,
  detectImageKind,
  imageStats,
  losesDetail,
  suggestedSettings,
} from './detect'
import type { RgbaImage } from './types'

function make(
  width: number,
  height: number,
  pixel: (x: number, y: number) => readonly [number, number, number, number],
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4
      const c = pixel(x, y)
      data[p] = c[0]
      data[p + 1] = c[1]
      data[p + 2] = c[2]
      data[p + 3] = c[3]
    }
  }
  return { width, height, data }
}

/** Pixel art: bloques grandes y cuatro colores. */
const sprite = make(200, 200, (x, y) => {
  const palette = [
    [217, 59, 40, 255],
    [247, 240, 220, 255],
    [31, 33, 36, 255],
    [0, 160, 175, 255],
  ] as const
  return palette[(Math.floor(x / 10) + Math.floor(y / 10) * 3) % 4]
})

/**
 * Una foto: degradado con grano. El grano es lo que la delata — dos píxeles
 * vecinos casi nunca son exactamente iguales.
 */
let seed = 7
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 24
const photo = make(200, 200, (_x, y) => {
  const t = y / 200
  return [46 + 180 * t + noise(), 111 + 90 * t + noise(), 168 - 30 * t + noise(), 255]
})

/**
 * Una ilustración de línea guardada en JPEG: zonas planas, contornos finos y
 * ruido de compresión. Es el caso que reveló el problema, y está calibrada
 * contra la medida real de aquella imagen — un tercio de vecinos idénticos.
 */
const lineart = make(200, 200, (x, y) => {
  const contorno = x % 11 === 0 || y % 13 === 0 || (x + y) % 17 === 0
  const base = contorno ? [25, 25, 27] : y < 90 ? [244, 244, 244] : [154, 169, 175]
  // El ruido del JPEG rompe la igualdad exacta en la mitad de los píxeles.
  const n = (x * 7 + y * 13) % 2 === 0 ? 0 : ((x * 31 + y * 17) % 5) - 2
  return [base[0] + n, base[1] + n, base[2] + n, 255]
})

describe('imageStats', () => {
  it('el pixel art es casi todo vecinos iguales', () => {
    const stats = imageStats(sprite)
    expect(stats.flatRatio).toBeGreaterThan(BLOCKY_THRESHOLD)
    expect(stats.unique).toBe(4)
  })

  it('una foto con grano casi no tiene vecinos iguales', () => {
    const stats = imageStats(photo)
    expect(stats.flatRatio).toBeLessThan(0.05)
    expect(stats.uniqueRatio).toBeGreaterThan(stats.flatRatio)
  })

  it('una ilustración de línea se queda en medio, pero del lado plano', () => {
    const stats = imageStats(lineart)
    expect(stats.flatRatio).toBeGreaterThan(FLAT_THRESHOLD)
    expect(stats.flatRatio).toBeLessThan(BLOCKY_THRESHOLD)
  })

  it('no cuenta lo transparente', () => {
    const conHueco = make(50, 50, (x) => (x < 25 ? [255, 0, 0, 255] : [0, 0, 0, 0]))
    expect(imageStats(conHueco).samples).toBeLessThan(50 * 50)
  })

  it('protesta con una imagen vacía', () => {
    expect(() => imageStats({ width: 0, height: 0, data: new Uint8ClampedArray() })).toThrow(
      /imagen/i,
    )
  })
})

describe('detectImageKind', () => {
  it('distingue los tres casos que importan', () => {
    expect(detectImageKind(sprite)).toBe('flat')
    expect(detectImageKind(lineart)).toBe('flat')
    expect(detectImageKind(photo)).toBe('photo')
  })
})

describe('suggestedSettings', () => {
  it('a un dibujo plano no le pone difuminado, ni grande ni pequeño', () => {
    expect(suggestedSettings(lineart, 29, 29).dither).toBe(false)
    expect(suggestedSettings(lineart, 120, 120).dither).toBe(false)
  })

  it('a una foto grande sí, que es lo que salva los degradados', () => {
    expect(suggestedSettings(photo, 120, 120)).toEqual({ mode: 'average', dither: true })
  })

  it('a una foto pequeña tampoco: no hay sitio donde repartir el error', () => {
    // Dos placas son 841 celdas. El difuminado ahí sólo añade ruido.
    expect(suggestedSettings(photo, 58, 29).dither).toBe(false)
  })

  it('el muestreo directo se reserva al pixel art de bloques', () => {
    expect(suggestedSettings(sprite, 44, 38).mode).toBe('point')
    // Una ilustración de línea se promedia: tirar píxeles se come los contornos.
    expect(suggestedSettings(lineart, 87, 87).mode).toBe('average')
    expect(suggestedSettings(photo, 87, 87).mode).toBe('average')
  })
})

describe('losesDetail', () => {
  it('avisa cuando el dibujo no cabe en tan pocas cuentas', () => {
    expect(losesDetail(lineart, 29, 29)).toBe(true)
    expect(losesDetail(lineart, 87, 87)).toBe(false)
  })

  it('no avisa con una foto, que aguanta mejor lo pequeño', () => {
    expect(losesDetail(photo, 29, 29)).toBe(false)
  })
})
