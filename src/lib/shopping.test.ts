import { describe, expect, it } from 'vitest'

import { DEFAULT_PALETTE, quantizable } from './palette'
import { DEFAULT_BAG_SIZE, shoppingList, toCsv } from './shopping'
import type { Pattern } from './types'
import { SIN_CUENTA } from './types'

const PAL = quantizable(DEFAULT_PALETTE)

/** Un patrón con cantidades a propósito: 400 de uno, 320 de otro, 1 del tercero. */
function pattern(): Pattern {
  const cells = new Int16Array(400 + 320 + 1 + 50)
  cells.fill(0, 0, 400)
  cells.fill(1, 400, 720)
  cells.fill(2, 720, 721)
  cells.fill(SIN_CUENTA, 721)
  return { cols: cells.length, rows: 1, cells }
}

describe('shoppingList', () => {
  const list = shoppingList(pattern(), PAL)

  it('cuenta las cuentas y no los huecos', () => {
    expect(list.totalBeads).toBe(721)
    expect(list.colors).toBe(3)
  })

  it('redondea la bolsa hacia arriba, por color', () => {
    // 400 cuentas no caben en una bolsa de 320: hacen falta dos.
    expect(list.rows[0].bags).toBe(2)
    // 320 justas son una bolsa exacta.
    expect(list.rows[1].bags).toBe(1)
    // Una sola cuenta también obliga a comprar una bolsa entera.
    expect(list.rows[2].bags).toBe(1)
  })

  it('no reparte una bolsa entre dos colores', () => {
    // Cuatro bolsas para 721 cuentas: sobra casi una bolsa y media, y es real.
    expect(list.totalBags).toBe(4)
    expect(list.totalBags * list.bagSize).toBeGreaterThan(list.totalBeads)
  })

  it('ordena de más a menos, como el recuento', () => {
    expect(list.rows.map((r) => r.beads)).toEqual([400, 320, 1])
  })

  it('arrastra el código de fábrica de cada color', () => {
    for (const row of list.rows) {
      expect(row.factoryCode).toBe(PAL[row.index].factoryCode)
    }
  })

  it('respeta el tamaño de bolsa que se le pase', () => {
    const mil = shoppingList(pattern(), PAL, 1000)
    expect(mil.bagSize).toBe(1000)
    expect(mil.rows[0].bags).toBe(1)
    expect(mil.totalBags).toBe(3)
  })

  it('por defecto usa las bolsas de 320', () => {
    expect(list.bagSize).toBe(DEFAULT_BAG_SIZE)
  })

  it('protesta con una bolsa imposible', () => {
    expect(() => shoppingList(pattern(), PAL, 0)).toThrow(/bolsa/i)
    expect(() => shoppingList(pattern(), PAL, NaN)).toThrow(/bolsa/i)
  })

  it('un patrón vacío da una lista vacía, no un error', () => {
    const vacio: Pattern = { cols: 2, rows: 1, cells: Int16Array.from([SIN_CUENTA, SIN_CUENTA]) }
    const nada = shoppingList(vacio, PAL)
    expect(nada.rows).toEqual([])
    expect(nada.totalBags).toBe(0)
  })
})

describe('toCsv', () => {
  const csv = toCsv(shoppingList(pattern(), PAL))
  const lines = csv.trim().split('\n')

  it('lleva encabezado, una fila por color y un total', () => {
    expect(lines).toHaveLength(1 + 3 + 1)
    expect(lines[0]).toBe('codigo;nombre;hex;codigo_fabrica;cuentas;bolsas')
    expect(lines.at(-1)).toBe('TOTAL;;;;721;4')
  })

  it('usa punto y coma, que es lo que espera un Excel en español', () => {
    expect(lines[1].split(';')).toHaveLength(6)
  })

  it('marca el código de fábrica como aproximado', () => {
    expect(lines[1]).toContain('~S')
  })

  it('protege los nombres con comillas o punto y coma', () => {
    const raro = shoppingList(
      { cols: 1, rows: 1, cells: Int16Array.from([0]) },
      [{ ...PAL[0], name: 'Rojo; el "bueno"' }],
    )
    expect(toCsv(raro)).toContain('"Rojo; el ""bueno"""')
  })
})
