import { describe, expect, it } from 'vitest'

import { sample, sampleAverage, samplePoint } from './sample'
import type { RgbaImage } from './types'

/** Imagen de juguete a partir de una lista de píxeles RGBA en orden de lectura. */
function img(width: number, height: number, px: number[][]): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4)
  px.forEach((p, i) => data.set(p, i * 4))
  return { width, height, data }
}

const ROJO = [255, 0, 0, 255]
const VERDE = [0, 255, 0, 255]
const AZUL = [0, 0, 255, 255]
const NEGRO = [0, 0, 0, 255]
const HUECO = [0, 0, 0, 0]

describe('sampleAverage', () => {
  it('promedia el bloque entero', () => {
    const src = img(2, 2, [ROJO, VERDE, AZUL, NEGRO])
    const { data } = sampleAverage(src, 1, 1)
    expect(data[0]).toBeCloseTo(255 / 4, 5)
    expect(data[1]).toBeCloseTo(255 / 4, 5)
    expect(data[2]).toBeCloseTo(255 / 4, 5)
    expect(data[3]).toBe(255)
  })

  it('no toca nada cuando la rejilla es la imagen', () => {
    const src = img(2, 2, [ROJO, VERDE, AZUL, NEGRO])
    const { data, cols, rows } = sampleAverage(src, 2, 2)
    expect([cols, rows]).toEqual([2, 2])
    expect([...data.slice(0, 4)]).toEqual(ROJO)
    expect([...data.slice(4, 8)]).toEqual(VERDE)
  })

  it('pondera por alfa, para que el borde de un sprite no se ensucie', () => {
    // Medio bloque rojo opaco, medio transparente. El color tiene que salir
    // rojo limpio; si se promediara sin ponderar, saldría rojo a medias.
    const src = img(2, 1, [ROJO, HUECO])
    const { data } = sampleAverage(src, 1, 1)
    expect([data[0], data[1], data[2]]).toEqual([255, 0, 0])
    expect(data[3]).toBeCloseTo(127.5, 5)
  })

  it('un bloque del todo transparente sale en cero', () => {
    const { data } = sampleAverage(img(2, 1, [HUECO, HUECO]), 1, 1)
    expect([...data]).toEqual([0, 0, 0, 0])
  })

  it('reparte los píxeles sin dejar bloques vacíos aunque no sea divisible', () => {
    // 3 px en 2 celdas: la primera se lleva 1 y la segunda 2, pero ninguna 0.
    const src = img(3, 1, [ROJO, VERDE, VERDE])
    const { data } = sampleAverage(src, 2, 1)
    expect([data[0], data[1], data[2]]).toEqual([255, 0, 0])
    expect([data[4], data[5], data[6]]).toEqual([0, 255, 0])
  })

  it('aguanta una rejilla más grande que la imagen', () => {
    const { cols, rows, data } = sampleAverage(img(1, 1, [ROJO]), 4, 4)
    expect([cols, rows]).toEqual([4, 4])
    expect(data.length).toBe(4 * 4 * 4)
    expect([data[0], data[1], data[2]]).toEqual([255, 0, 0])
  })
})

describe('samplePoint', () => {
  it('toma el píxel del centro de la celda, sin mezclar', () => {
    const src = img(2, 2, [ROJO, VERDE, AZUL, NEGRO])
    const { data } = samplePoint(src, 2, 2)
    expect([...data.slice(0, 4)]).toEqual(ROJO)
    expect([...data.slice(4, 8)]).toEqual(VERDE)
    expect([...data.slice(8, 12)]).toEqual(AZUL)
    expect([...data.slice(12, 16)]).toEqual(NEGRO)
  })

  it('no inventa colores intermedios al reducir', () => {
    // Éste es el motivo de que exista el modo: promediar dos cuentas vecinas de
    // pixel art produce un color que no está en el dibujo. Cuál de las dos gana
    // da igual —el centro de la celda cae justo en la frontera—; lo que no
    // puede salir es la mezcla.
    const src = img(2, 1, [ROJO, VERDE])
    const { data } = samplePoint(src, 1, 1)
    const color = [data[0], data[1], data[2]]
    expect([ROJO.slice(0, 3), VERDE.slice(0, 3)]).toContainEqual(color)
  })
})

describe('validación', () => {
  it('rechaza rejillas imposibles', () => {
    const src = img(2, 2, [ROJO, VERDE, AZUL, NEGRO])
    expect(() => sampleAverage(src, 0, 4)).toThrow(/rejilla/i)
    expect(() => sampleAverage(src, 4, 2.5)).toThrow(/rejilla/i)
    expect(() => samplePoint(src, -1, 4)).toThrow(/rejilla/i)
  })

  it('rechaza datos que no cuadran con el tamaño', () => {
    const roto: RgbaImage = { width: 4, height: 4, data: new Uint8ClampedArray(8) }
    expect(() => sampleAverage(roto, 2, 2)).toThrow(/no cuadran/i)
  })
})

describe('sample', () => {
  it('por defecto promedia, porque el uso principal son fotos', () => {
    const src = img(2, 1, [ROJO, VERDE])
    expect([...sample(src, 1, 1).data]).toEqual([...sampleAverage(src, 1, 1).data])
    expect([...sample(src, 1, 1, 'point').data]).toEqual([...samplePoint(src, 1, 1).data])
  })
})
