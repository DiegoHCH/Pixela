/**
 * Lo que se prueba aquí no es que el archivo se escriba —eso lo hace el
 * navegador— sino las tres salidas: se eligió carpeta, se canceló, o no hay
 * diálogo y se descarga. Cancelar es la que importa: no puede parecer un fallo.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveBlob, saveText } from './download'

type Picker = (options: unknown) => Promise<unknown>

function withPicker(picker: Picker | null): void {
  if (picker) (window as unknown as { showSaveFilePicker: Picker }).showSaveFilePicker = picker
  else delete (window as unknown as { showSaveFilePicker?: Picker }).showSaveFilePicker
}

/** Un destino de escritura que apunta lo que le cae. */
function fakeHandle() {
  const written: Blob[] = []
  return {
    written,
    handle: {
      createWritable: async () => ({
        write: async (data: Blob) => void written.push(data),
        close: async () => {},
      }),
    },
  }
}

/** jsdom no trae blobs con URL: la descarga necesita una de mentira. */
function stubObjectUrl() {
  URL.createObjectURL = vi.fn(() => 'blob:prueba')
  URL.revokeObjectURL = vi.fn()
  return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
}

afterEach(() => {
  withPicker(null)
  vi.restoreAllMocks()
})

describe('saveBlob', () => {
  it('escribe donde elijas y ofrece el nombre y el tipo', async () => {
    const { handle, written } = fakeHandle()
    const pick = vi.fn(async () => handle)
    withPicker(pick as unknown as Picker)

    const blob = new Blob(['hola'], { type: 'image/png' })
    expect(await saveBlob(blob, 'nami-patron.png', 'png')).toBe('picked')
    expect(written).toEqual([blob])
    expect(pick).toHaveBeenCalledWith({
      suggestedName: 'nami-patron.png',
      types: [{ description: 'Imagen PNG', accept: { 'image/png': ['.png'] } }],
    })
  })

  it('cancelar no es un fallo', async () => {
    withPicker(async () => {
      throw new DOMException('cancelado', 'AbortError')
    })
    expect(await saveBlob(new Blob(['x']), 'x.png', 'png')).toBe('cancelled')
  })

  it('si el diálogo falla por otra cosa, el archivo se descarga igual', async () => {
    withPicker(async () => {
      throw new DOMException('no', 'NotAllowedError')
    })
    const click = stubObjectUrl()
    expect(await saveBlob(new Blob(['x']), 'x.png', 'png')).toBe('downloaded')
    // Quedarte sin archivo porque el diálogo no se abrió sería lo peor de las
    // dos opciones.
    expect(click).toHaveBeenCalled()
  })

  it('sin diálogo en el navegador, descarga como siempre', async () => {
    withPicker(null)
    const click = stubObjectUrl()
    expect(await saveBlob(new Blob(['x']), 'x.json', 'json')).toBe('downloaded')
    expect(click).toHaveBeenCalled()
  })
})

describe('saveText', () => {
  it('el CSV sale con BOM, para que Excel no rompa las tildes', async () => {
    const { handle, written } = fakeHandle()
    withPicker((async () => handle) as unknown as Picker)

    await saveText('código;2', 'lista.csv', 'csv')
    // Se miran los bytes y no el texto: `Blob.text()` se come el BOM al
    // decodificar, así que leerlo así diría que no está cuando sí está.
    const bytes = new Uint8Array(await written[0].arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(await written[0].text()).toBe('código;2')
    expect(written[0].type).toBe('text/csv;charset=utf-8')
  })
})
