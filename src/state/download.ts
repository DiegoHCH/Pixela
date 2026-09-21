/**
 * Descargar un archivo generado aquí mismo.
 *
 * No hay servidor por medio: el archivo se arma en el navegador y no viaja a
 * ninguna parte, que es la premisa de toda la app.
 */

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Se revoca en el siguiente turno: revocarlo ya cancelaría la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadText(text: string, name: string, type = 'text/plain'): void {
  // El BOM va delante para que Excel abra el CSV en UTF-8 y no rompa las tildes.
  downloadBlob(new Blob(['﻿', text], { type: `${type};charset=utf-8` }), name)
}
