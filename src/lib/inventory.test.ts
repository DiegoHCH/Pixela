import { describe, expect, it } from 'vitest'

import {
  EMPTY_INVENTORY,
  inventoryFrom,
  isOwned,
  ownedCodes,
  ownedPalette,
  setOwned,
  setStock,
  shortfall,
  stockOf,
  toggleOwned,
} from './inventory'
import { DEFAULT_PALETTE } from './palette'

describe('marcar lo que tienes', () => {
  it('lo que no está en el inventario, no lo tienes', () => {
    expect(isOwned(EMPTY_INVENTORY, 'S05')).toBe(false)
    expect(stockOf(EMPTY_INVENTORY, 'S05')).toBeNull()
  })

  it('se puede marcar sin contar, que es el caso normal', () => {
    const inv = setOwned(EMPTY_INVENTORY, 'S05', true)
    expect(isOwned(inv, 'S05')).toBe(true)
    // «Lo tengo sin contar» es null, y no cero: cero sería no tener.
    expect(stockOf(inv, 'S05')).toBeNull()
  })

  it('se puede marcar con cantidad', () => {
    const inv = setStock(EMPTY_INVENTORY, 'S05', 640)
    expect(isOwned(inv, 'S05')).toBe(true)
    expect(stockOf(inv, 'S05')).toBe(640)
  })

  it('poner cantidad implica tenerlo', () => {
    const inv = setStock(EMPTY_INVENTORY, 'S48', 100)
    expect(isOwned(inv, 'S48')).toBe(true)
  })

  it('borrar la cantidad deja el color marcado', () => {
    const inv = setStock(setStock(EMPTY_INVENTORY, 'S05', 640), 'S05', null)
    expect(isOwned(inv, 'S05')).toBe(true)
    expect(stockOf(inv, 'S05')).toBeNull()
  })

  it('desmarcar olvida la cantidad', () => {
    const inv = setOwned(setStock(EMPTY_INVENTORY, 'S05', 640), 'S05', false)
    expect(isOwned(inv, 'S05')).toBe(false)
    expect(stockOf(inv, 'S05')).toBeNull()
  })

  it('marcar y desmarcar conserva la cantidad mientras siga marcado', () => {
    let inv = setStock(EMPTY_INVENTORY, 'S05', 640)
    inv = setOwned(inv, 'S05', true)
    expect(stockOf(inv, 'S05')).toBe(640)
  })

  it('el conmutador va de tener a no tener y vuelve', () => {
    let inv = toggleOwned(EMPTY_INVENTORY, 'S05')
    expect(isOwned(inv, 'S05')).toBe(true)
    inv = toggleOwned(inv, 'S05')
    expect(isOwned(inv, 'S05')).toBe(false)
  })

  it('rechaza cantidades imposibles', () => {
    expect(() => setStock(EMPTY_INVENTORY, 'S05', -1)).toThrow(/cantidad/i)
    expect(() => setStock(EMPTY_INVENTORY, 'S05', NaN)).toThrow(/cantidad/i)
  })

  it('cuenta los que tienes', () => {
    const inv = inventoryFrom(['S01', 'S05', 'S13'])
    expect(ownedCodes(inv).sort()).toEqual(['S01', 'S05', 'S13'])
  })
})

describe('ownedPalette', () => {
  it('deja sólo los colores que están en el cajón', () => {
    const inv = inventoryFrom(['C01', 'C02', 'C15'])
    const usable = ownedPalette(DEFAULT_PALETTE, inv)
    expect(usable.map((b) => b.code)).toEqual(['C01', 'C02', 'C15'])
  })

  it('sin inventario no queda nada', () => {
    // Cuantizar contra colores que no tienes produce un patrón que no se puede
    // montar: es correcto que no quede nada y que la app lo diga.
    expect(ownedPalette(DEFAULT_PALETTE, EMPTY_INVENTORY)).toHaveLength(0)
  })
})

describe('shortfall', () => {
  const needs = [
    { code: 'S01', beads: 1623 },
    { code: 'S05', beads: 39 },
    { code: 'S48', beads: 500 },
  ]

  it('lo que no tienes, falta entero', () => {
    const [blanco] = shortfall(needs, EMPTY_INVENTORY, 320)
    expect(blanco).toEqual({ code: 'S01', needed: 1623, have: 0, missing: 1623, bags: 6 })
  })

  it('con cantidad, resta y dice las bolsas que faltan', () => {
    const inv = setStock(EMPTY_INVENTORY, 'S01', 1000)
    const [blanco] = shortfall(needs, inv, 320)
    expect(blanco.missing).toBe(623)
    expect(blanco.bags).toBe(2)
  })

  it('si tienes de sobra, no falta nada', () => {
    const inv = setStock(EMPTY_INVENTORY, 'S05', 2000)
    const rojo = shortfall(needs, inv, 320)[1]
    expect(rojo.missing).toBe(0)
    expect(rojo.bags).toBe(0)
  })

  it('sin contar, no se inventa un cero', () => {
    // No saber cuánto tienes no es lo mismo que tener suficiente.
    const inv = setOwned(EMPTY_INVENTORY, 'S48', true)
    const amarillo = shortfall(needs, inv, 320)[2]
    expect(amarillo.have).toBeNull()
    expect(amarillo.missing).toBeNull()
    expect(amarillo.bags).toBeNull()
  })

  it('respeta el tamaño de bolsa', () => {
    const inv = setStock(EMPTY_INVENTORY, 'S01', 1000)
    expect(shortfall(needs, inv, 1000)[0].bags).toBe(1)
  })

  it('protesta con una bolsa imposible', () => {
    expect(() => shortfall(needs, EMPTY_INVENTORY, 0)).toThrow(/bolsa/i)
  })
})
