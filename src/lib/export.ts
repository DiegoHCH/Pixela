/**
 * Cómo se llama lo que sale por el otro lado.
 *
 * Puro y aparte del navegador a propósito: el nombre de archivo es lo único de
 * la exportación que tiene reglas, y las reglas se prueban.
 */

/**
 * Tamaño de celda de la exportación.
 *
 * Veinte píxeles por cuenta: un montaje de dos placas sale a 1.160 × 580, que
 * se ve bien en pantalla y se imprime sin escalonarse. Más grande no añade
 * información —una cuenta es un círculo plano— y multiplica el peso.
 */
export const EXPORT_CELL_SIZE = 20

export interface ExportName {
  /** El archivo de origen, con extensión o sin ella. */
  source: string
  cols: number
  rows: number
  /** Número de placa, empezando en 1, cuando es la hoja de una placa suelta. */
  board?: number
}

/**
 * Convierte un nombre cualquiera en algo que sobreviva a cualquier sistema de
 * archivos: sin tildes, sin espacios y en minúsculas. Devuelve vacío si no
 * queda nada utilizable.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Cuando el archivo de origen no deja nada con lo que nombrar. */
const FALLBACK = 'pixela'

export function exportFileName({ source, cols, rows, board }: ExportName): string {
  const base = slugify(source.replace(/\.[a-z0-9]{1,5}$/i, '')) || FALLBACK
  return board == null ? `${base}-patron-${cols}x${rows}.png` : `${base}-placa-${board}.png`
}
