/**
 * La paleta sale de tu cajón, no del catálogo de una fábrica.
 *
 * Este módulo sólo sabe leer, validar y preparar una paleta para el pipeline.
 * La captura desde una foto (corrección de blanco incluida) es otro paso y vive
 * aparte: aquí sólo llega el resultado.
 */

import { deltaE76, hexToRgb, rgbToLab } from './color'
import type { Bead, Palette } from './types'

import artkalS from './artkal-s.json'
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
  /**
   * El código de fábrica más parecido, con la distancia que hay hasta él.
   *
   * Es para volver a comprar, no para cuantizar: el color que manda sigue
   * siendo el medido. El fabricante declara su propia tabla «sólo de
   * referencia», y estas cuentas además vienen medidas de una foto.
   */
  artkal?: {
    code: string
    deltaE?: number
    /**
     * El código se asignó por nombre y no por distancia de color. Es el caso de
     * los metálicos: el fabricante no publica un RGB utilizable, así que no hay
     * distancia que medir — pero el código se sabe.
     */
    porNombre?: boolean
  }
}

export interface PaletteFile {
  fuente?: string
  referenciaDeBlanco?: string
  nota?: string
  /** La marca, cuando se sabe. */
  marca?: string
  avisoCodigos?: string
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
    ...(entry.artkal
      ? {
          factoryCode: entry.artkal.code,
          ...(entry.artkal.deltaE !== undefined ? { factoryDeltaE: entry.artkal.deltaE } : {}),
          ...(entry.artkal.porNombre ? { factoryByName: true } : {}),
        }
      : {}),
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

/** Un catálogo de fábrica: códigos y su color publicado, cuando lo publican. */
export interface FactoryChart {
  fuente?: string
  aviso?: string
  serie?: string
  colores: Array<{ code: string; hex: string | null; aviso?: string }>
}

/**
 * El catálogo oficial de Artkal serie S (5 mm), la marca del cajón.
 *
 * Está aquí para la lista de la compra y para quien sí tenga bolsas con
 * códigos. No se usa para cuantizar: los valores son los que publica el
 * fabricante, que además los declara «sólo de referencia», y el dorado, la
 * plata y el cobre los deja directamente sin valor.
 */
export const ARTKAL_S: FactoryChart = artkalS as FactoryChart

/**
 * El catálogo entero como paleta, con **el color medido donde lo hay**.
 *
 * Es la síntesis de dos verdades incómodas. El catálogo es la única fuente de
 * los códigos —lo que se puede pedir— pero sus valores de color no son de fiar:
 * los dos documentos oficiales del fabricante se contradicen hasta en ΔE 8, y
 * él mismo declara su tabla «sólo de referencia». Las cuentas medidas del cajón
 * sí describen lo que vas a poner en la placa.
 *
 * Así que manda la medida cuando existe, y el catálogo rellena el resto
 * marcado como aproximado.
 */
export function catalogPalette(
  chart: FactoryChart = ARTKAL_S,
  measured: Palette = DEFAULT_PALETTE,
): Palette {
  const porCodigo = new Map(
    measured.filter((b) => b.factoryCode).map((b) => [b.factoryCode!, b]),
  )

  const out: Bead[] = []
  for (const entry of chart.colores) {
    const medido = porCodigo.get(entry.code)

    if (medido) {
      // El color es el medido; el código y el nombre, los de fábrica y los tuyos.
      out.push({ ...medido, code: entry.code, factoryCode: entry.code })
      continue
    }
    // Sin medida y sin color publicado —los metálicos— no hay nada que usar.
    if (!entry.hex) continue

    const rgb = hexToRgb(entry.hex)
    out.push({
      code: entry.code,
      name: entry.code,
      hex: entry.hex.toUpperCase(),
      rgb,
      lab: rgbToLab(rgb[0], rgb[1], rgb[2]),
      metallic: entry.aviso === 'metalico',
      factoryCode: entry.code,
      // El color viene del catálogo, no de una cuenta real.
      approximate: true,
    })
  }
  return out
}

/** El código de fábrica más cercano de un catálogo, con su distancia. */
export function nearestFactoryCode(
  hex: string,
  chart: FactoryChart = ARTKAL_S,
): { code: string; deltaE: number } | null {
  const lab = rgbToLab(...hexToRgb(hex))
  let best: { code: string; deltaE: number } | null = null
  for (const entry of chart.colores) {
    if (!entry.hex) continue
    const d = deltaE76(lab, rgbToLab(...hexToRgb(entry.hex)))
    if (!best || d < best.deltaE) best = { code: entry.code, deltaE: d }
  }
  return best
}
