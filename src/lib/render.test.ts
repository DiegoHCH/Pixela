import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_PALETTE, quantizable } from './palette'
import { MIDI_SQUARE } from './boards'
import {
  MIN_CELL_FOR_COORDS,
  MIN_CELL_FOR_DETAIL,
  MIN_CELL_FOR_SYMBOL,
  coordGutter,
  coordLabels,
  coordStep,
  drawCoordinates,
  drawEmptyBoard,
  drawPattern,
  fitCellSize,
  minCellFor,
  patternPixelSize,
  symbolFor,
} from './render'
import type { Pattern } from './types'
import { SIN_CUENTA } from './types'

const PAL = quantizable(DEFAULT_PALETTE)

/**
 * Un contexto de canvas de mentira que anota lo que se le pide.
 *
 * No comprueba cómo queda —eso es para los ojos— sino que el dibujo se hace:
 * una cuenta por celda con cuenta, ninguna donde hay hueco, y ni una llamada a
 * un método que no exista. Eso último sólo se ve en tiempo de ejecución.
 */
class FakeContext {
  ops: string[] = []
  fills: Array<{ style: string; rect?: [number, number, number, number] }> = []
  texts: Array<{ text: string; x: number; y: number }> = []

  fillStyle = ''
  strokeStyle = ''
  lineWidth = 1
  globalAlpha = 1
  font = ''
  textAlign = 'start'
  textBaseline = 'alphabetic'

  fillRect(x: number, y: number, w: number, h: number) {
    this.ops.push('fillRect')
    this.fills.push({ style: String(this.fillStyle), rect: [x, y, w, h] })
  }
  strokeRect() {
    this.ops.push('strokeRect')
  }
  clearRect() {
    this.ops.push('clearRect')
  }
  beginPath() {
    this.ops.push('beginPath')
  }
  closePath() {
    this.ops.push('closePath')
  }
  arc() {
    this.ops.push('arc')
  }
  roundRect() {
    this.ops.push('roundRect')
  }
  rect() {
    this.ops.push('rect')
  }
  moveTo() {
    this.ops.push('moveTo')
  }
  lineTo() {
    this.ops.push('lineTo')
  }
  fill() {
    this.ops.push('fill')
    this.fills.push({ style: String(this.fillStyle) })
  }
  stroke() {
    this.ops.push('stroke')
  }
  fillText(text: string, x: number, y: number) {
    this.ops.push('fillText')
    this.texts.push({ text, x, y })
  }
  setTransform() {
    this.ops.push('setTransform')
  }

  count(op: string): number {
    return this.ops.filter((o) => o === op).length
  }
}

function ctx(): { fake: FakeContext; real: CanvasRenderingContext2D } {
  const fake = new FakeContext()
  return { fake, real: fake as unknown as CanvasRenderingContext2D }
}

/** Dos cuentas y dos huecos. */
function tiny(): Pattern {
  return { cols: 2, rows: 2, cells: Int16Array.from([0, SIN_CUENTA, 3, SIN_CUENTA]) }
}

describe('patternPixelSize', () => {
  it('es el tamaño en celdas por el tamaño de celda', () => {
    expect(patternPixelSize({ cols: 58, rows: 29, cells: new Int16Array(0) }, 20)).toEqual({
      width: 1160,
      height: 580,
    })
  })
})

describe('fitCellSize', () => {
  const pattern: Pattern = { cols: 58, rows: 29, cells: new Int16Array(58 * 29) }

  it('elige el lado que limita', () => {
    expect(fitCellSize(pattern, 580, 1000)).toBeCloseTo(10, 6)
    expect(fitCellSize(pattern, 10000, 290)).toBeCloseTo(10, 6)
  })

  it('no pasa del máximo ni baja de uno', () => {
    expect(fitCellSize(pattern, 100000, 100000)).toBe(28)
    expect(fitCellSize(pattern, 1, 1)).toBe(1)
  })
})

describe('drawPattern', () => {
  let fake: FakeContext
  let real: CanvasRenderingContext2D

  beforeEach(() => {
    const c = ctx()
    fake = c.fake
    real = c.real
  })

  it('dibuja la placa debajo y una cuenta por celda con cuenta', () => {
    drawPattern(real, tiny(), { palette: PAL, cellSize: 20 })

    // El fondo de placa es el primer relleno, y ocupa el patrón entero.
    expect(fake.fills[0].rect).toEqual([0, 0, 40, 40])
    // Dos cuentas: cada una su redondeo, su agujero y su brillo.
    expect(fake.count('roundRect')).toBe(2)
    expect(fake.fills.some((f) => f.style === PAL[0].hex)).toBe(true)
    expect(fake.fills.some((f) => f.style === PAL[3].hex)).toBe(true)
  })

  it('no pinta nada donde no hay cuenta', () => {
    drawPattern(real, tiny(), { palette: PAL, cellSize: 20 })
    // Cuatro celdas, dos cuentas: si pintara los huecos habría cuatro.
    expect(fake.count('roundRect')).toBe(2)
  })

  it('a celda muy pequeña la cuenta es un cuadrado, sin agujero', () => {
    drawPattern(real, tiny(), { palette: PAL, cellSize: 4 })
    expect(fake.count('roundRect')).toBe(0)
    // El fondo de placa y las dos cuentas; los pines van con arcos, no rectángulos.
    expect(fake.count('fillRect')).toBe(3)
  })

  it('las líneas de placa se dibujan sólo si se le pasa la placa', () => {
    const wide: Pattern = { cols: 58, rows: 29, cells: new Int16Array(58 * 29) }

    const sin = ctx()
    drawPattern(sin.real, wide, { palette: PAL, cellSize: 4 })
    const antes = sin.fake.count('stroke')

    drawPattern(real, wide, { palette: PAL, cellSize: 4, board: MIDI_SQUARE })
    // Una costura vertical en la mitad, ninguna horizontal: 58 × 29 son dos placas.
    expect(fake.count('stroke')).toBe(antes + 1)
  })

  it('la caída sólo pinta las filas que ya han caído', () => {
    const lleno: Pattern = { cols: 4, rows: 4, cells: new Int16Array(16) }
    drawPattern(real, lleno, { palette: PAL, cellSize: 20, rowsVisible: 2 })
    expect(fake.count('roundRect')).toBe(8)
  })

  it('aislar un color apaga los demás sin quitarlos', () => {
    const mezcla: Pattern = { cols: 2, rows: 1, cells: Int16Array.from([0, 3]) }
    drawPattern(real, mezcla, { palette: PAL, cellSize: 20, only: 3 })
    // Las dos se dibujan; la diferencia está en la transparencia.
    expect(fake.count('roundRect')).toBe(2)
  })

  it('el modo símbolos pone una letra por cuenta', () => {
    drawPattern(real, tiny(), { palette: PAL, cellSize: 20, mode: 'symbol' })
    expect(fake.texts.map((t) => t.text)).toEqual([symbolFor(0), symbolFor(3)])
  })

  it('con la celda diminuta no hay letra que dibujar', () => {
    // Y por eso `minCellFor` existe: el modo pedía una celda que la mesa no le
    // daba, y se quedaba en cuadrados planos sin decir nada.
    drawPattern(real, tiny(), { palette: PAL, cellSize: 5, mode: 'symbol' })
    expect(fake.texts).toHaveLength(0)
  })

  it('la impresión va en blanco, con símbolos y sin agujeros', () => {
    drawPattern(real, tiny(), { palette: PAL, cellSize: 20, mode: 'print' })
    expect(fake.fills[0].style).toBe('#FFFFFF')
    expect(fake.count('arc')).toBe(0)
    expect(fake.texts).toHaveLength(2)
  })

  it('no se cae con un índice que no está en la paleta', () => {
    const roto: Pattern = { cols: 1, rows: 1, cells: Int16Array.from([999]) }
    expect(() => drawPattern(real, roto, { palette: PAL, cellSize: 20 })).not.toThrow()
    expect(fake.count('roundRect')).toBe(0)
  })
})

describe('drawEmptyBoard', () => {
  it('es una placa con sus pines y ninguna cuenta', () => {
    const { fake, real } = ctx()
    drawEmptyBoard(real, 3, 2, 9)
    expect(fake.fills[0].rect).toEqual([0, 0, 27, 18])
    expect(fake.count('arc')).toBe(6)
    expect(fake.count('roundRect')).toBe(0)
  })
})

describe('minCellFor', () => {
  it('el color se conforma con cualquier tamaño', () => {
    expect(minCellFor('color')).toBe(1)
  })

  it('los símbolos piden sitio, y es más de lo que dibuja una cuenta', () => {
    expect(minCellFor('symbol')).toBe(MIN_CELL_FOR_SYMBOL)
    expect(MIN_CELL_FOR_SYMBOL).toBeGreaterThan(MIN_CELL_FOR_DETAIL)
  })

  it('a ese tamaño sí se dibujan', () => {
    const { fake, real } = ctx()
    drawPattern(real, tiny(), { palette: PAL, cellSize: minCellFor('symbol'), mode: 'symbol' })
    expect(fake.texts).toHaveLength(2)
  })
})

describe('symbolFor', () => {
  it('salta la I y la O, que se confunden con 1 y 0', () => {
    const letters = Array.from({ length: 24 }, (_, i) => symbolFor(i)).join('')
    expect(letters).not.toContain('I')
    expect(letters).not.toContain('O')
  })

  it('da la vuelta cuando se acaban las letras', () => {
    expect(symbolFor(24)).toBe(symbolFor(0))
  })
})

describe('drawCoordinates', () => {
  /** Los números que se escribieron, en orden de dibujo. */
  function labels(o: Parameters<typeof drawCoordinates>[1]) {
    const { fake, real } = ctx()
    drawCoordinates(real, o)
    return fake.texts.map((t) => Number(t.text))
  }

  const board = { cols: 29, rows: 29, cellSize: 20 }

  it('numera desde donde empieza la placa en el montaje, no desde uno', () => {
    // La placa 3 de una fila de 29 empieza en la columna 59 de la pieza. Que su
    // regla dijera 1 es exactamente lo que hace imposible juntarlas después.
    const nums = labels({ ...board, colOffset: 58, rowOffset: 0 })
    const cols = nums.slice(0, nums.length / 2)
    expect(cols[0]).toBe(59)
    expect(cols.at(-1)).toBe(87)
    // El 60 cae a una celda del 59 y se solaparían: el esqueleto sigue en el 65.
    expect(cols).not.toContain(60)
    expect(cols).toContain(65)
    expect(cols).toContain(85)
  })

  it('una placa sin desplazar empieza en uno', () => {
    const nums = labels(board)
    expect(nums[0]).toBe(1)
    expect(nums).toContain(5)
  })

  it('numera de cinco en cinco, y de diez en diez si la celda es pequeña', () => {
    expect(coordStep(20)).toBe(5)
    expect(coordStep(10)).toBe(10)

    const cinco = labels({ ...board, cellSize: 20 })
    expect(cinco).toContain(15)
    const diez = labels({ ...board, cellSize: 10 })
    expect(diez).not.toContain(15)
    expect(diez).toContain(20)
  })

  it('con la celda diminuta no dibuja nada, en vez de una mancha de números', () => {
    expect(labels({ ...board, cellSize: MIN_CELL_FOR_COORDS - 1 })).toEqual([])
  })

  it('el margen crece con la celda, dentro de un límite', () => {
    expect(coordGutter(20)).toBe(26)
    expect(coordGutter(4)).toBe(16)
    expect(coordGutter(200)).toBe(30)
  })

  it('escribe fuera de la rejilla, en el margen', () => {
    const { fake, real } = ctx()
    const gutter = coordGutter(20)
    drawCoordinates(real, { ...board, x0: gutter, y0: gutter })
    // Ni un número dentro del área de cuentas: taparían una cuenta.
    for (const t of fake.texts) {
      expect(t.x < gutter || t.y < gutter).toBe(true)
    }
  })
})

describe('coordLabels', () => {
  /** Los números tal cual salen, para leer la regla de un vistazo. */
  const nums = (count: number, offset = 0, step = 5) =>
    coordLabels(count, offset, step).map((i) => offset + i + 1)

  it('una placa entera: el uno, cada cinco, y el final', () => {
    expect(nums(29)).toEqual([1, 5, 10, 15, 20, 25, 29])
  })

  it('el ancla gana al esqueleto cuando chocan', () => {
    // La placa 3 empieza en 59 y el 60 está a una celda. Se cae el 60: sin el
    // 59 la hoja no dice en qué columna del montaje empieza.
    expect(nums(29, 58)).toEqual([59, 65, 70, 75, 80, 85, 87])
  })

  it('el borde se calla si queda pegado a un número puesto', () => {
    // 31 acaba en 30 y 31. El borde se ve solo —ahí se acaba la placa—, así que
    // el que sobra es el 31.
    expect(nums(31)).toEqual([1, 5, 10, 15, 20, 25, 30])
  })

  it('aguanta los casos de una celda y de ninguna', () => {
    expect(coordLabels(1, 0, 5)).toEqual([0])
    expect(coordLabels(0, 0, 5)).toEqual([])
  })
})
