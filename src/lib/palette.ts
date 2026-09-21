/**
 * La paleta sale de tu cajón, no del catálogo de una fábrica.
 *
 * Este módulo sólo sabe leer, validar y preparar una paleta para el pipeline.
 * La captura desde una foto (corrección de blanco incluida) es otro paso y vive
 * aparte: aquí sólo llega el resultado.
 */

import { hexToRgb, rgbToLab } from './color'
import type { Bead, Palette } from './types'

import paletaDeDiego from './paleta-de-diego.json'

/** Una entrada tal como viene en el JSON de paleta. */
export interface PaletteEntry {
  code: string
  name: string
  hex: string
  /** Antes de la corrección de blanco. Se conserva por trazabilidad. */
  hexSinCorregir?: string
  /** `"metalico"` marca las cuentas que la cuantización no debe usar. */
  aviso?: string
}

export interface PaletteFile {
  fuente?: string
  referenciaDeBlanco?: string
  nota?: string
  colores: PaletteEntry[]
}

export function makeBead(entry: PaletteEntry): Bead {
  const rgb = hexToRgb(entry.hex)
  return {
    code: entry.code,
    name: entry.name,
    hex: entry.hex.toUpperCase(),
    rgb,
    // LAB precalculado: la cuantización lo consulta millones de veces.
    lab: rgbToLab(rgb[0], rgb[1], rgb[2]),
    metallic: entry.aviso === 'metalico',
  }
}

/**
 * Valida y convierte un archivo de paleta. Falla fuerte y temprano: una paleta
 * a medias produce patrones sutilmente equivocados en vez de un error visible.
 */
export function parsePalette(input: unknown): Palette {
  const file = input as Partial<PaletteFile> | null
  if (!file || !Array.isArray(file.colores)) {
    throw new Error('Paleta inválida: falta la lista «colores».')
  }
  if (file.colores.length === 0) {
    throw new Error('Paleta vacía: hace falta al menos un color.')
  }

  const seen = new Set<string>()
  return file.colores.map((entry, i) => {
    if (!entry || typeof entry.hex !== 'string') {
      throw new Error(`Paleta inválida: el color ${i} no tiene «hex».`)
    }
    const code = typeof entry.code === 'string' && entry.code ? entry.code : `C${i + 1}`
    if (seen.has(code)) throw new Error(`Paleta inválida: código repetido «${code}».`)
    seen.add(code)
    return makeBead({ ...entry, code, name: entry.name ?? code })
  })
}

/**
 * Los 23 colores reales del cajón, extraídos de una foto el 21-09-2026 y
 * corregidos contra el compartimento de cuentas blancas.
 */
export const DEFAULT_PALETTE: Palette = parsePalette(paletaDeDiego)

/**
 * La paleta que la cuantización puede usar: sin metálicos.
 *
 * No es una preferencia estética. El dorado medido da `#877D47`, un oliva
 * apagado; si se deja dentro, el algoritmo lo reparte por todas las zonas
 * verdosas oscuras de la imagen y el patrón sale con cuentas que no pegan.
 */
export function quantizable(palette: Palette): Palette {
  const usable = palette.filter((b) => !b.metallic)
  if (usable.length === 0) {
    throw new Error('No queda ningún color no metálico con el que cuantizar.')
  }
  return usable
}

export function beadByCode(palette: Palette, code: string): Bead | undefined {
  return palette.find((b) => b.code === code)
}
