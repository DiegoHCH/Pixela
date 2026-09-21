/**
 * La lista de la compra: cuántas cuentas de cada color y en cuántas bolsas.
 *
 * Sin precios, y no por pereza: el plan los deja fuera a propósito —«no pide
 * precios ni compra las cuentas por ti»— porque caducan y cambian con la tienda
 * y el país. Lo que no caduca es cuántas cuentas hacen falta.
 */

import { countBeads, totalBeads } from './quantize'
import type { Palette, Pattern } from './types'

/**
 * Cuentas por bolsa. 320 es lo que traen las bolsas de la tienda del cajón;
 * las de fábrica suelen venir de 1.000.
 */
export const DEFAULT_BAG_SIZE = 320

export interface ShoppingRow {
  /** Índice en la paleta con la que se cuantizó. */
  index: number
  code: string
  name: string
  hex: string
  /** El código de fábrica, si la paleta lo trae. Aproximado siempre. */
  factoryCode?: string
  beads: number
  bags: number
}

export interface ShoppingList {
  rows: ShoppingRow[]
  bagSize: number
  totalBeads: number
  /** Suma de bolsas por color, que es lo que se compra de verdad. */
  totalBags: number
  colors: number
}

export function shoppingList(
  pattern: Pattern,
  palette: Palette,
  bagSize: number = DEFAULT_BAG_SIZE,
): ShoppingList {
  if (!Number.isFinite(bagSize) || bagSize < 1) {
    throw new Error(`Tamaño de bolsa inválido: ${bagSize}.`)
  }

  const rows = countBeads(pattern).map((count): ShoppingRow => {
    const bead = palette[count.index]
    return {
      index: count.index,
      code: bead.code,
      name: bead.name,
      hex: bead.hex,
      ...(bead.factoryCode ? { factoryCode: bead.factoryCode } : {}),
      beads: count.count,
      // Hacia arriba y por color: 30 cuentas de rojo siguen siendo una bolsa,
      // y no se reparte una bolsa entre dos colores.
      bags: Math.ceil(count.count / bagSize),
    }
  })

  return {
    rows,
    bagSize,
    totalBeads: totalBeads(pattern),
    totalBags: rows.reduce((sum, row) => sum + row.bags, 0),
    colors: rows.length,
  }
}

/**
 * La lista como CSV, para llevarla a la tienda o a una hoja de cálculo.
 *
 * Separador de punto y coma: es lo que espera un Excel en español, y los nombres
 * de color llevan comas con más frecuencia de la que parece.
 */
export function toCsv(list: ShoppingList): string {
  const escape = (value: string) => (/[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  const lines = [
    ['codigo', 'nombre', 'hex', 'codigo_fabrica', 'cuentas', 'bolsas'].join(';'),
    ...list.rows.map((row) =>
      [
        escape(row.code),
        escape(row.name),
        row.hex,
        row.factoryCode ? `~${row.factoryCode}` : '',
        String(row.beads),
        String(row.bags),
      ].join(';'),
    ),
    ['TOTAL', '', '', '', String(list.totalBeads), String(list.totalBags)].join(';'),
  ]
  return `${lines.join('\n')}\n`
}
