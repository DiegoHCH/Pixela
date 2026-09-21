import { describe, expect, it } from 'vitest'

import {
  PROJECT_FILE_VERSION,
  ProjectFileError,
  looksLikeProject,
  parseProjectFile,
  projectFileName,
} from './project-file'

const valido = {
  pixela: PROJECT_FILE_VERSION,
  savedAt: '2026-09-21T12:00:00.000Z',
  name: 'amy.jpeg',
  image: {
    width: 1200,
    height: 1600,
    sourceWidth: 3000,
    sourceHeight: 4000,
    dataUrl: 'data:image/png;base64,AAAA',
  },
  crop: { x: 0, y: 100, width: 1200, height: 1600 },
  measure: 'boards',
  boardsX: 3,
  boardsY: 4,
  beadCols: 58,
  beadRows: 29,
  board: { cols: 29, rows: 29 },
  sampleMode: 'average',
  dither: false,
  maxColors: null,
  brightness: 0,
  contrast: 20,
  saturation: -10,
  renderMode: 'color',
  onlyOwned: true,
}

describe('parseProjectFile', () => {
  it('devuelve lo que se guardó', () => {
    const p = parseProjectFile(valido)
    expect(p.name).toBe('amy.jpeg')
    expect(p.boardsX).toBe(3)
    expect(p.contrast).toBe(20)
    expect(p.crop.y).toBe(100)
  })

  it('rechaza lo que no es un proyecto, y dice por qué', () => {
    expect(() => parseProjectFile(null)).toThrow(/proyecto/i)
    expect(() => parseProjectFile({ hola: 1 })).toThrow(/no es un proyecto/i)
    expect(() => parseProjectFile({ ...valido, image: undefined })).toThrow(/imagen/i)
    expect(() => parseProjectFile({ ...valido, crop: undefined })).toThrow(/recorte/i)
  })

  it('rechaza un archivo de una versión futura en vez de adivinar', () => {
    expect(() => parseProjectFile({ ...valido, pixela: PROJECT_FILE_VERSION + 1 })).toThrow(
      /más nueva/i,
    )
  })

  it('exige que la imagen sea una imagen', () => {
    expect(() =>
      parseProjectFile({ ...valido, image: { ...valido.image, dataUrl: 'data:text/plain,hola' } }),
    ).toThrow(/imagen/i)
  })

  it('acota los números que vengan disparatados', () => {
    // Un archivo editado a mano no puede dejar la app calculando para siempre.
    const p = parseProjectFile({ ...valido, boardsX: 9999, contrast: 500, beadCols: -3 })
    expect(p.boardsX).toBe(40)
    expect(p.contrast).toBe(100)
    expect(p.beadCols).toBe(1)
  })

  it('rellena lo que falte con algo sensato', () => {
    const minimo = { pixela: 1, image: valido.image, crop: valido.crop }
    const p = parseProjectFile(minimo)
    expect(p.measure).toBe('boards')
    expect(p.sampleMode).toBe('average')
    expect(p.renderMode).toBe('color')
    expect(p.onlyOwned).toBe(true)
    expect(p.name).toBe('proyecto')
  })

  it('un error de proyecto se reconoce por su tipo', () => {
    try {
      parseProjectFile({})
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectFileError)
    }
  })
})

describe('projectFileName', () => {
  it('sale del nombre de la imagen, sin tildes ni extensión', () => {
    expect(projectFileName('Mi Cañón.jpeg')).toBe('mi-canon.pixela.json')
  })

  it('aguanta un nombre imposible', () => {
    expect(projectFileName('???.png')).toBe('pixela.pixela.json')
  })
})

describe('looksLikeProject', () => {
  it('distingue un proyecto de una imagen', () => {
    expect(looksLikeProject({ name: 'amy.pixela.json', type: 'application/json' })).toBe(true)
    expect(looksLikeProject({ name: 'amy.json', type: '' })).toBe(true)
    expect(looksLikeProject({ name: 'amy.jpeg', type: 'image/jpeg' })).toBe(false)
  })
})
