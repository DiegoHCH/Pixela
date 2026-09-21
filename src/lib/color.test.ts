import { describe, expect, it } from 'vitest'

import {
  clamp8,
  deltaE76,
  hexToRgb,
  hslToRgb,
  labDistanceSq,
  rgbToHex,
  rgbToHsl,
  rgbToLab,
  srgbToLinear,
} from './color'

describe('hex', () => {
  it('lee las tres formas de escribirlo', () => {
    expect(hexToRgb('#FD274A')).toEqual([253, 39, 74])
    expect(hexToRgb('fd274a')).toEqual([253, 39, 74])
    expect(hexToRgb('#FFF')).toEqual([255, 255, 255])
  })

  it('falla en vez de adivinar', () => {
    expect(() => hexToRgb('#GG0000')).toThrow()
    expect(() => hexToRgb('#FF00')).toThrow()
    expect(() => hexToRgb('')).toThrow()
  })

  it('va y vuelve', () => {
    for (const hex of ['#000000', '#FFFFFF', '#FD274A', '#0FE102', '#19191B']) {
      expect(rgbToHex(...hexToRgb(hex))).toBe(hex)
    }
  })

  it('recorta lo que se sale del canal', () => {
    expect(rgbToHex(-20, 300, 127.6)).toBe('#00FF80')
  })
})

describe('clamp8', () => {
  it('redondea y acota', () => {
    expect(clamp8(-1)).toBe(0)
    expect(clamp8(256)).toBe(255)
    expect(clamp8(127.5)).toBe(128)
  })
})

describe('srgbToLinear', () => {
  it('fija los extremos', () => {
    expect(srgbToLinear(0)).toBe(0)
    expect(srgbToLinear(255)).toBeCloseTo(1, 6)
  })

  it('usa el tramo recto abajo del codo', () => {
    // Por debajo de 0.04045 la curva es lineal; a 10/255 todavía lo es.
    expect(srgbToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 9)
  })
})

describe('rgbToLab', () => {
  // Valores de referencia de sRGB con blanco D65. Si alguno de estos se mueve,
  // todo el patrón cambia de color sin que nada falle a la vista.
  it('clava los colores conocidos', () => {
    const cases: Array<[string, [number, number, number]]> = [
      ['#FFFFFF', [100, 0, 0]],
      ['#000000', [0, 0, 0]],
      ['#FF0000', [53.2408, 80.0925, 67.2032]],
      ['#00FF00', [87.7347, -86.1827, 83.1793]],
      ['#0000FF', [32.297, 79.1875, -107.8602]],
      ['#808080', [53.585, 0, 0]],
    ]
    for (const [hex, expected] of cases) {
      const lab = rgbToLab(...hexToRgb(hex))
      expect(lab[0]).toBeCloseTo(expected[0], 3)
      expect(lab[1]).toBeCloseTo(expected[1], 3)
      expect(lab[2]).toBeCloseTo(expected[2], 3)
    }
  })

  it('deja los grises sin croma', () => {
    // No dan cero exacto: el blanco de referencia D65 está redondeado a cinco
    // decimales y eso deja un croma residual de ~2e-6, invisible y constante.
    for (const v of [16, 64, 128, 200]) {
      const [, a, b] = rgbToLab(v, v, v)
      expect(a).toBeCloseTo(0, 4)
      expect(b).toBeCloseTo(0, 4)
    }
  })
})

describe('distancia', () => {
  it('es cero contra uno mismo', () => {
    const lab = rgbToLab(253, 39, 74)
    expect(labDistanceSq(lab, lab)).toBe(0)
    expect(deltaE76(lab, lab)).toBe(0)
  })

  it('es simétrica', () => {
    const a = rgbToLab(253, 39, 74)
    const b = rgbToLab(15, 225, 2)
    expect(labDistanceSq(a, b)).toBeCloseTo(labDistanceSq(b, a), 9)
  })

  it('ordena como el ojo y no como el RGB', () => {
    // El caso que justifica el paso 3 entero. Un azul marino (0,0,90) está, en
    // RGB, más cerca del negro (5.219) que del azul (14.444) — o sea que una
    // cuantización en RGB lo pintaría negro. En LAB el orden se invierte y el
    // marino se resuelve como azul oscuro, que es lo que se ve.
    const marino: [number, number, number] = [0, 0, 90]
    const azul: [number, number, number] = [14, 62, 192]
    const negro: [number, number, number] = [25, 25, 27]

    const enRgb = (a: number[], b: number[]) =>
      (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

    expect(enRgb(marino, negro)).toBeLessThan(enRgb(marino, azul))
    expect(labDistanceSq(rgbToLab(...marino), rgbToLab(...azul))).toBeLessThan(
      labDistanceSq(rgbToLab(...marino), rgbToLab(...negro)),
    )
  })

  it('deltaE76 es la raíz de la distancia al cuadrado', () => {
    const a = rgbToLab(253, 39, 74)
    const b = rgbToLab(15, 225, 2)
    expect(deltaE76(a, b) ** 2).toBeCloseTo(labDistanceSq(a, b), 6)
  })
})

describe('hsl', () => {
  it('va y vuelve', () => {
    for (const hex of ['#FD274A', '#0FE102', '#8CDEE9', '#19191B', '#F4F4F4']) {
      const rgb = hexToRgb(hex)
      const [h, s, l] = rgbToHsl(...rgb)
      const back = hslToRgb(h, s, l)
      expect(back[0]).toBeCloseTo(rgb[0], 6)
      expect(back[1]).toBeCloseTo(rgb[1], 6)
      expect(back[2]).toBeCloseTo(rgb[2], 6)
    }
  })

  it('deja el gris sin saturación', () => {
    const [h, s, l] = rgbToHsl(128, 128, 128)
    expect(h).toBe(0)
    expect(s).toBe(0)
    expect(l).toBeCloseTo(128 / 255, 6)
  })

  it('normaliza el tono fuera de rango', () => {
    expect(hslToRgb(370, 0.5, 0.5)).toEqual(hslToRgb(10, 0.5, 0.5))
    expect(hslToRgb(-350, 0.5, 0.5)).toEqual(hslToRgb(10, 0.5, 0.5))
  })
})
