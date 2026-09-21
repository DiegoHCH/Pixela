/**
 * Guardar el proyecto en un archivo y volver a abrirlo.
 *
 * Sin servidor y sin cuentas: el archivo se arma aquí, lo guardas donde quieras
 * y lo abres cuando quieras. Es el respaldo de verdad — una galería dentro del
 * navegador desaparece si borras los datos del sitio o cambias de equipo.
 */

import {
  parseProjectFile,
  projectFileName,
  ProjectFileError,
  PROJECT_FILE_VERSION,
  type ProjectFile,
} from '../lib/project-file'
import { downloadText } from './download'
import type { LoadedImage } from './load-image'

/** Arma el archivo a partir de lo que hay abierto. */
export function buildProjectFile(
  image: LoadedImage,
  name: string,
  settings: Omit<ProjectFile, 'pixela' | 'savedAt' | 'name' | 'image'>,
): ProjectFile {
  return {
    pixela: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    name,
    image: {
      width: image.width,
      height: image.height,
      sourceWidth: image.sourceWidth,
      sourceHeight: image.sourceHeight,
      // PNG: recomprimir en JPEG cambiaría colores y el patrón al reabrir no
      // sería el mismo.
      dataUrl: image.source.toDataURL('image/png'),
    },
    ...settings,
  }
}

export function saveProjectFile(file: ProjectFile): string {
  const name = projectFileName(file.name)
  downloadText(JSON.stringify(file), name, 'application/json')
  return name
}

/** Lee un archivo de proyecto y reconstruye su imagen de trabajo. */
export async function readProjectFile(
  file: File,
): Promise<{ project: ProjectFile; image: LoadedImage }> {
  let parsed: ProjectFile
  try {
    parsed = parseProjectFile(JSON.parse(await file.text()))
  } catch (error) {
    if (error instanceof ProjectFileError) throw error
    throw new ProjectFileError('El archivo no se pudo leer como proyecto.')
  }

  const image = await imageFromDataUrl(parsed)
  return { project: parsed, image }
}

async function imageFromDataUrl(file: ProjectFile): Promise<LoadedImage> {
  const response = await fetch(file.image.dataUrl)
  const blob = await response.blob()

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    throw new ProjectFileError('La imagen del proyecto está dañada.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    bitmap.close()
    throw new ProjectFileError('Este navegador no deja dibujar en un canvas.')
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return {
    name: file.name,
    width: canvas.width,
    height: canvas.height,
    sourceWidth: file.image.sourceWidth,
    sourceHeight: file.image.sourceHeight,
    pixels: { width: canvas.width, height: canvas.height, data },
    source: canvas,
  }
}
