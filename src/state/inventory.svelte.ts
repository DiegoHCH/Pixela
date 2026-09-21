/**
 * Qué cuentas tienes, recordado entre sesiones.
 *
 * Arranca con los 23 colores medidos del cajón marcados y sin contar: es lo que
 * se sabe de verdad el primer día. El resto del catálogo queda sin marcar,
 * listo para que lo marques cuando compres.
 */

import {
  EMPTY_INVENTORY,
  inventoryFrom,
  isOwned,
  ownedCodes,
  setStock as setStockPure,
  stockOf,
  toggleOwned,
  type Inventory,
} from '../lib/inventory'
import { DEFAULT_PALETTE } from '../lib/palette'
import { readString, writeString } from './storage'

const KEY = 'pixela:inventory'

/** Lo que se sabe sin preguntar: los colores medidos del cajón. */
function seed(): Inventory {
  return inventoryFrom(
    DEFAULT_PALETTE.map((bead) => bead.factoryCode).filter((code): code is string => !!code),
  )
}

function load(): Inventory {
  const raw = readString(KEY)
  if (!raw) return seed()
  try {
    const parsed = JSON.parse(raw) as Record<string, { owned?: unknown; beads?: unknown }>
    const out: Record<string, { owned: boolean; beads: number | null }> = {}
    for (const [code, entry] of Object.entries(parsed ?? {})) {
      if (!entry || typeof entry !== 'object') continue
      const beads = typeof entry.beads === 'number' && entry.beads >= 0 ? entry.beads : null
      out[code] = { owned: entry.owned === true, beads }
    }
    return out
  } catch {
    // Un inventario corrupto no puede tumbar la app ni borrarse en silencio:
    // se vuelve a lo que se sabe del cajón.
    return seed()
  }
}

class InventoryState {
  #inventory = $state<Inventory>(load())

  get all(): Inventory {
    return this.#inventory
  }

  get count(): number {
    return ownedCodes(this.#inventory).length
  }

  /** Cuántos de los que tienes están contados. */
  get counted(): number {
    return ownedCodes(this.#inventory).filter((c) => stockOf(this.#inventory, c) !== null).length
  }

  has(code: string): boolean {
    return isOwned(this.#inventory, code)
  }

  stock(code: string): number | null {
    return stockOf(this.#inventory, code)
  }

  toggle(code: string): void {
    this.#save(toggleOwned(this.#inventory, code))
  }

  /** `null` deja el color marcado pero sin contar. */
  setStock(code: string, beads: number | null): void {
    this.#save(setStockPure(this.#inventory, code, beads))
  }

  /** Vuelve a lo medido del cajón. */
  reset(): void {
    this.#save(seed())
  }

  clear(): void {
    this.#save(EMPTY_INVENTORY)
  }

  #save(next: Inventory): void {
    this.#inventory = next
    writeString(KEY, JSON.stringify(next))
  }
}

export const inventory = new InventoryState()
