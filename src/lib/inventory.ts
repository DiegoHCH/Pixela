/**
 * El inventario: qué colores tienes y, si quieres, cuántas cuentas.
 *
 * La cantidad es **opcional a propósito**. Contar 3.000 cuentas blancas no lo
 * va a hacer nadie, así que marcar «lo tengo» sin número tiene que ser un
 * estado válido y no un formulario a medio llenar. Con número, la lista de la
 * compra puede restar y decir lo que falta; sin número, sólo puede avisar de
 * que lo mires.
 */

import type { Palette } from './types'

export interface StockEntry {
  /** Lo tienes. */
  owned: boolean
  /**
   * Cuántas cuentas tienes. `null` es «lo tengo, no sé cuántas», que es
   * distinto de cero: cero sería no tener.
   */
  beads: number | null
}

/** Por código de color. Lo que no está, no lo tienes. */
export type Inventory = Readonly<Record<string, StockEntry>>

export const EMPTY_INVENTORY: Inventory = {}

export function isOwned(inventory: Inventory, code: string): boolean {
  return inventory[code]?.owned === true
}

/** Cuentas que tienes de un color: número, o `null` si no lo has contado. */
export function stockOf(inventory: Inventory, code: string): number | null {
  const entry = inventory[code]
  return entry?.owned ? entry.beads : null
}

export function ownedCodes(inventory: Inventory): string[] {
  return Object.keys(inventory).filter((code) => inventory[code].owned)
}

/** Marca o desmarca un color, conservando la cantidad si la había. */
export function setOwned(inventory: Inventory, code: string, owned: boolean): Inventory {
  const previous = inventory[code]
  return { ...inventory, [code]: { owned, beads: owned ? (previous?.beads ?? null) : null } }
}

/**
 * Pone la cantidad. Pasar `null` la borra y deja el color en «lo tengo sin
 * contar»; poner una cantidad implica que lo tienes.
 */
export function setStock(inventory: Inventory, code: string, beads: number | null): Inventory {
  if (beads !== null && (!Number.isFinite(beads) || beads < 0)) {
    throw new Error(`Cantidad inválida para ${code}: ${beads}.`)
  }
  return { ...inventory, [code]: { owned: true, beads: beads === null ? null : Math.round(beads) } }
}

/** Los tres estados en un solo gesto: no lo tengo → lo tengo → no lo tengo. */
export function toggleOwned(inventory: Inventory, code: string): Inventory {
  return setOwned(inventory, code, !isOwned(inventory, code))
}

/**
 * La paleta reducida a lo que tienes.
 *
 * Es lo que hace honesto un patrón: cuantizar contra colores que no están en
 * el cajón produce un patrón que no se puede montar.
 */
export function ownedPalette(palette: Palette, inventory: Inventory): Palette {
  return palette.filter((bead) => isOwned(inventory, bead.code))
}

/** Un inventario con todos estos códigos marcados, sin cantidad. */
export function inventoryFrom(codes: Iterable<string>): Inventory {
  const inventory: Record<string, StockEntry> = {}
  for (const code of codes) inventory[code] = { owned: true, beads: null }
  return inventory
}

export interface Shortfall {
  code: string
  /** Lo que pide el patrón. */
  needed: number
  /** Lo que tienes, o `null` si no lo has contado. */
  have: number | null
  /** Lo que falta. `null` cuando no se puede saber por no haber contado. */
  missing: number | null
  /** Bolsas que faltan, redondeando hacia arriba. `null` si no se sabe. */
  bags: number | null
}

/**
 * Qué falta para montar algo, cruzando lo que pide con lo que tienes.
 *
 * Los colores sin contar salen con `missing: null` en vez de con un cero
 * optimista: no saber cuánto tienes no es lo mismo que tener suficiente.
 */
export function shortfall(
  needs: ReadonlyArray<{ code: string; beads: number }>,
  inventory: Inventory,
  bagSize: number,
): Shortfall[] {
  if (!Number.isFinite(bagSize) || bagSize < 1) {
    throw new Error(`Tamaño de bolsa inválido: ${bagSize}.`)
  }

  return needs.map(({ code, beads }) => {
    const have = stockOf(inventory, code)
    const owned = isOwned(inventory, code)

    // Si no lo tienes, falta todo.
    if (!owned) {
      return { code, needed: beads, have: 0, missing: beads, bags: Math.ceil(beads / bagSize) }
    }
    // Lo tienes pero no contado: no se puede restar.
    if (have === null) {
      return { code, needed: beads, have: null, missing: null, bags: null }
    }
    const missing = Math.max(0, beads - have)
    return { code, needed: beads, have, missing, bags: Math.ceil(missing / bagSize) }
  })
}
