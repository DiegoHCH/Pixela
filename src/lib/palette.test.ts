import { describe, expect, it } from 'vitest'

import { rgbToLab } from './color'
import { DEFAULT_PALETTE, beadByCode, makeBead, parsePalette, quantizable } from './palette'

describe('la paleta del cajón', () => {
  it('trae los 23 colores de la foto', () => {
    // La caja tiene 24 compartimentos, pero uno es de mezcla y no es un color.
    expect(DEFAULT_PALETTE).toHaveLength(23)
  })

  it('no repite códigos', () => {
    const codes = new Set(DEFAULT_PALETTE.map((b) => b.code))
    expect(codes.size).toBe(DEFAULT_PALETTE.length)
  })

  it('trae el LAB ya calculado y correcto', () => {
    for (const bead of DEFAULT_PALETTE) {
      expect(bead.lab).toEqual(rgbToLab(...bead.rgb))
    }
  })

  it('marca como metálicos el dorado y la plata, y sólo esos', () => {
    const metal = DEFAULT_PALETTE.filter((b) => b.metallic).map((b) => b.name)
    expect(metal).toEqual(['Dorado', 'Plata'])
  })
})

describe('quantizable', () => {
  it('deja fuera los metálicos', () => {
    const usable = quantizable(DEFAULT_PALETTE)
    expect(usable).toHaveLength(21)
    expect(usable.some((b) => b.metallic)).toBe(false)
  })

  it('protesta si no queda nada con lo que cuantizar', () => {
    const solo = parsePalette({
      colores: [{ code: 'C1', name: 'Dorado', hex: '#877D47', aviso: 'metalico' }],
    })
    expect(() => quantizable(solo)).toThrow(/metálico/i)
  })
})

describe('parsePalette', () => {
  it('falla temprano en vez de producir patrones raros', () => {
    expect(() => parsePalette(null)).toThrow(/colores/i)
    expect(() => parsePalette({})).toThrow(/colores/i)
    expect(() => parsePalette({ colores: [] })).toThrow(/vacía/i)
    expect(() => parsePalette({ colores: [{ code: 'C1', name: 'X' }] })).toThrow(/hex/i)
    expect(() =>
      parsePalette({
        colores: [
          { code: 'C1', name: 'A', hex: '#000000' },
          { code: 'C1', name: 'B', hex: '#FFFFFF' },
        ],
      }),
    ).toThrow(/repetido/i)
  })

  it('numera los colores que llegan sin código', () => {
    const p = parsePalette({ colores: [{ hex: '#FD274A' }, { hex: '#0FE102' }] })
    expect(p.map((b) => b.code)).toEqual(['C1', 'C2'])
    expect(p[0].name).toBe('C1')
  })
})

describe('makeBead', () => {
  it('normaliza el hex a mayúsculas', () => {
    expect(makeBead({ code: 'C1', name: 'Rojo', hex: '#fd274a' }).hex).toBe('#FD274A')
  })

  it('sólo es metálico con el aviso exacto', () => {
    expect(makeBead({ code: 'C1', name: 'X', hex: '#000000' }).metallic).toBe(false)
    expect(
      makeBead({ code: 'C1', name: 'X', hex: '#000000', aviso: 'metalico' }).metallic,
    ).toBe(true)
  })
})

describe('beadByCode', () => {
  it('encuentra y no inventa', () => {
    expect(beadByCode(DEFAULT_PALETTE, 'C15')?.name).toBe('Negro')
    expect(beadByCode(DEFAULT_PALETTE, 'C99')).toBeUndefined()
  })
})
