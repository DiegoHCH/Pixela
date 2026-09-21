/**
 * Guardar un archivo generado aquí mismo.
 *
 * No hay servidor por medio: el archivo se arma en el navegador y no viaja a
 * ninguna parte, que es la premisa de toda la app.
 *
 * Donde se puede se abre el diálogo de «Guardar como» y eliges carpeta y
 * nombre; donde no —Firefox y Safari no traen la API— cae a la descarga de
 * siempre, que va a la carpeta de descargas sin preguntar.
 */

/** Qué clase de archivo es, para que el diálogo ofrezca la extensión correcta. */
export type SaveKind = 'png' | 'json' | 'csv'

const KINDS = {
  png: { mime: 'image/png', ext: '.png', label: 'Imagen PNG' },
  json: { mime: 'application/json', ext: '.json', label: 'Proyecto de Pixela' },
  csv: { mime: 'text/csv', ext: '.csv', label: 'Lista en CSV' },
} as const satisfies Record<SaveKind, { mime: string; ext: string; label: string }>

/**
 * Qué pasó al guardar. `cancelled` no es un fallo: es que cerraste el diálogo,
 * y quien llama no debe enseñar un error por eso.
 */
export type SaveResult = 'picked' | 'downloaded' | 'cancelled'

interface FilePickerHandle {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>
}

type FilePicker = (options: {
  suggestedName?: string
  types?: { description: string; accept: Record<string, string[]> }[]
}) => Promise<FilePickerHandle>

/** La API sólo existe en navegadores basados en Chromium, y sólo en HTTPS. */
function filePicker(): FilePicker | null {
  const fn = (window as unknown as { showSaveFilePicker?: FilePicker }).showSaveFilePicker
  return typeof fn === 'function' ? fn : null
}

export async function saveBlob(blob: Blob, name: string, kind: SaveKind): Promise<SaveResult> {
  const pick = filePicker()
  if (pick) {
    const { mime, ext, label } = KINDS[kind]
    try {
      const handle = await pick({
        suggestedName: name,
        types: [{ description: label, accept: { [mime]: [ext] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return 'picked'
    } catch (error) {
      // Cerrar el diálogo sin elegir nada termina aquí, y no es un problema.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Cualquier otro fallo del diálogo —permisos, un iframe, una carpeta
      // protegida— no debe dejarte sin el archivo: se descarga y ya está.
    }
  }

  downloadBlob(blob, name)
  return 'downloaded'
}

export async function saveText(
  text: string,
  name: string,
  kind: SaveKind,
): Promise<SaveResult> {
  // El BOM va delante para que Excel abra el CSV en UTF-8 y no rompa las tildes.
  const blob = new Blob(['﻿', text], { type: `${KINDS[kind].mime};charset=utf-8` })
  return saveBlob(blob, name, kind)
}

/** La descarga de toda la vida: sin preguntar, a la carpeta de descargas. */
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
