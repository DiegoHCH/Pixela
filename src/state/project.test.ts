import { beforeEach, describe, expect, test } from 'vitest'

import { MIDI_SQUARE } from '../lib/boards'
import type { LoadedImage } from './load-image'
import { project } from './project.svelte'

/**
 * Una imagen de mentira con un degradado horizontal. No hace falta que sea
 * bonita: lo que se comprueba aquí es el cableado —recorte, rejilla, patrón y
 * tandas—, no el color que sale.
 *
 * `source` se queda vacío a propósito: es sólo para dibujar en pantalla, y el
 * pipeline no lo toca. Si algún día lo tocara, este test lo diría.
 */
function fakeImage(width: number, height: number): LoadedImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4
      data[p] = (x / width) * 255
      data[p + 1] = (y / height) * 255
      data[p + 2] = 120
      data[p + 3] = 255
    }
  }
  return {
    name: 'prueba.png',
    width,
    height,
    sourceWidth: width,
    sourceHeight: height,
    pixels: { width, height, data },
    source: null as unknown as HTMLCanvasElement,
  }
}

beforeEach(() => {
  project.close()
  project.board = MIDI_SQUARE
  project.ownedBoards = 2
  project.setMeasure('boards')
  project.setShape(2, 1)
})

describe('sin imagen', () => {
  test('no hay recorte ni patrón', () => {
    expect(project.crop).toBeNull()
    expect(project.pattern).toBeNull()
    expect(project.total).toBe(0)
    expect(project.counts).toEqual([])
    expect(project.layout).toBeNull()
  })
})

describe('al abrir una imagen', () => {
  test('encuadra sola con la proporción del montaje', () => {
    project.open(fakeImage(1200, 800))
    // 2 × 1 placas son 58 × 29 cuentas, o sea 2:1.
    expect(project.crop!.width / project.crop!.height).toBeCloseTo(2, 6)
    expect(project.crop!.width).toBe(1200)
  })

  test('el patrón sale del tamaño que piden las placas', () => {
    project.open(fakeImage(1200, 800))
    expect(project.pattern).not.toBeNull()
    expect([project.pattern!.cols, project.pattern!.rows]).toEqual([58, 29])
    expect(project.total).toBe(58 * 29)
  })

  test('cabe de una sentada si tienes las placas que pide', () => {
    project.open(fakeImage(1200, 800))
    expect(project.layout).toEqual({ cols: 2, rows: 1, total: 2 })
    expect(project.batches).toHaveLength(1)
    expect(project.fitsInOneGo).toBe(true)
  })

  test('los índices del patrón son de la paleta que devuelve', () => {
    project.open(fakeImage(1200, 800))
    const max = Math.max(...project.counts.map((c) => c.index))
    expect(max).toBeLessThan(project.palette.length)
    // Sin metálicos: son 21 de los 23 del cajón.
    expect(project.palette).toHaveLength(21)
  })
})

describe('al cambiar la forma del montaje', () => {
  test('reencuadra y cambia el tamaño del patrón', () => {
    project.open(fakeImage(1200, 800))
    project.setShape(3, 2)

    expect([project.pattern!.cols, project.pattern!.rows]).toEqual([87, 58])
    expect(project.crop!.width / project.crop!.height).toBeCloseTo(87 / 58, 6)
    expect(project.layout).toEqual({ cols: 3, rows: 2, total: 6 })
  })

  test('con más placas de las que tienes, aparecen las tandas', () => {
    project.open(fakeImage(1200, 800))
    project.setShape(3, 2)

    expect(project.fitsInOneGo).toBe(false)
    expect(project.batches).toHaveLength(3)
    for (const batch of project.batches) {
      expect(batch.cols * batch.rows).toBeLessThanOrEqual(project.ownedBoards)
    }
  })
})

describe('midiendo en cuentas', () => {
  test('el tamaño lo pones tú y la proporción sale de ahí', () => {
    project.open(fakeImage(1200, 800))
    project.setMeasure('beads')
    project.setBeadSize(40, 40)

    expect([project.pattern!.cols, project.pattern!.rows]).toEqual([40, 40])
    expect(project.crop!.width / project.crop!.height).toBeCloseTo(1, 6)
    // 40 × 40 no cabe en una placa de 29: son cuatro, aunque tres vayan a medias.
    expect(project.layout).toEqual({ cols: 2, rows: 2, total: 4 })
  })
})

describe('al convertir', () => {
  test('cambia de pantalla y arma la caída de las cuentas', () => {
    project.open(fakeImage(1200, 800))
    const antes = project.conversionId
    project.convert()

    expect(project.phase).toBe('pattern')
    expect(project.fallRows).toBe(29)
    expect(project.conversionId).toBe(antes + 1)
  })

  test('sin patrón no hay nada que convertir', () => {
    project.convert()
    expect(project.phase).toBe('crop')
  })

  test('volver al recorte apaga lo que sólo tiene sentido en el patrón', () => {
    project.open(fakeImage(1200, 800))
    project.convert()
    project.toggleIsolate(3)
    project.selectBoard(1)
    project.backToCrop()

    expect(project.phase).toBe('crop')
    expect(project.isolated).toBeNull()
    expect(project.selectedBoard).toBeNull()
  })
})

describe('aislar un color', () => {
  test('se enciende y se apaga con el mismo gesto', () => {
    project.open(fakeImage(1200, 800))
    const color = project.counts[0].index

    project.toggleIsolate(color)
    expect(project.isolated).toBe(color)
    project.toggleIsolate(color)
    expect(project.isolated).toBeNull()
  })
})

describe('la placa señalada', () => {
  test('se recorta del patrón con el tamaño de la placa', () => {
    project.open(fakeImage(1200, 800))
    project.selectBoard(1)

    const placa = project.selectedBoardPattern!
    expect([placa.cols, placa.rows]).toEqual([29, 29])
  })

  test('sin placa señalada no hay recorte de placa', () => {
    project.open(fakeImage(1200, 800))
    expect(project.selectedBoardPattern).toBeNull()
  })
})

describe('al cambiar de proporción con el encuadre hecho', () => {
  test('conserva el centro y el zoom en vez de saltar al medio', () => {
    project.open(fakeImage(1200, 800))
    // Un recorte pequeño arriba a la izquierda: un encuadre decidido a mano.
    project.crop = { x: 100, y: 100, width: 400, height: 200 }

    project.setShape(1, 1)

    const crop = project.crop!
    expect(crop.width / crop.height).toBeCloseTo(1, 6)
    // El centro estaba en (300, 200) y ahí sigue.
    expect(crop.x + crop.width / 2).toBeCloseTo(300, 6)
    expect(crop.y + crop.height / 2).toBeCloseTo(200, 6)
    // Y no se ha estirado hasta llenar la imagen.
    expect(crop.width).toBeLessThanOrEqual(400)
  })

  test('sin encuadre previo, el recorte más grande que quepa', () => {
    project.open(fakeImage(1200, 800))
    expect(project.crop!.width).toBe(1200)
  })
})

describe('las placas que tienes', () => {
  test('se cambian cuando quieras y acotan a lo posible', () => {
    project.setOwnedBoards(6)
    expect(project.ownedBoards).toBe(6)
    project.setOwnedBoards(0)
    expect(project.ownedBoards).toBe(1)
    project.setOwnedBoards(500)
    expect(project.ownedBoards).toBe(99)
    project.setOwnedBoards(2)
  })

  test('cambiarlas recalcula las tandas al momento', () => {
    project.open(fakeImage(1200, 800))
    project.setShape(3, 2)
    expect(project.batches).toHaveLength(3)

    project.setOwnedBoards(6)
    expect(project.batches).toHaveLength(1)
    expect(project.fitsInOneGo).toBe(true)

    project.setOwnedBoards(1)
    expect(project.batches).toHaveLength(6)
    project.setOwnedBoards(2)
  })

  test('el tamaño de bolsa también, y la lista lo sigue', () => {
    project.open(fakeImage(1200, 800))
    const con320 = project.shopping!.totalBags
    project.setBagSize(1000)
    expect(project.bagSize).toBe(1000)
    expect(project.shopping!.totalBags).toBeLessThan(con320)
    project.setBagSize(320)
  })
})

describe('al cerrar', () => {
  test('no queda nada del proyecto anterior', () => {
    project.open(fakeImage(600, 600))
    project.close()
    expect(project.image).toBeNull()
    expect(project.crop).toBeNull()
    expect(project.pattern).toBeNull()
  })
})
