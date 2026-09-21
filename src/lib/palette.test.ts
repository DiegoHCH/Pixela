import { describe, expect, it } from 'vitest'

import { rgbToLab } from './color'
import {
  catalogPalette,
  ARTKAL_S,
  DEFAULT_PALETTE,
  beadByCode,
  makeBead,
  nearestFactoryCode,
  parsePalette,
  quantizable,
} from './palette'

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

  it('cada color lleva su código de fábrica y lo lejos que está', () => {
    // Identificada la marca —Artkal S de 5 mm—, cada cuenta puede decir con qué
    // código se vuelve a comprar. El ΔE viaja con el código a propósito: hay
    // emparejamientos de 4 y otros de 22, y la diferencia importa.
    for (const bead of DEFAULT_PALETTE) {
      expect(bead.factoryCode).toMatch(/^SE?\d{1,3}$/)
      if (bead.metallic) {
        // Los metálicos no tienen distancia: su código se sabe por el nombre.
        expect(bead.factoryByName).toBe(true)
        expect(bead.factoryDeltaE).toBeUndefined()
      } else {
        expect(typeof bead.factoryDeltaE).toBe('number')
      }
    }
  })

  it('el código de fábrica no entra en la cuantización', () => {
    // El color que manda es el medido. Si un día se colara el del catálogo, el
    // patrón cambiaría de colores sin que nada fallara.
    const rojo = DEFAULT_PALETTE[1]
    expect(rojo.hex).toBe('#FD274A')
    expect(rojo.lab).toEqual(rgbToLab(...rojo.rgb))
  })
})

describe('el catálogo de fábrica', () => {
  it('trae las 176 entradas de la serie S', () => {
    expect(ARTKAL_S.colores).toHaveLength(176)
  })

  it('deja sin valor los tres metálicos, como el propio fabricante', () => {
    const sinColor = ARTKAL_S.colores.filter((c) => !c.hex).map((c) => c.code)
    expect(sinColor).toEqual(['S41', 'S42', 'S63'])
  })

  it('conserva el aviso del fabricante', () => {
    expect(ARTKAL_S.aviso).toMatch(/referencia/i)
  })
})

describe('catalogPalette', () => {
  const catalog = catalogPalette()

  it('trae el catálogo menos lo que no tiene color', () => {
    // 176 códigos, de los que S41, S42 y S63 no tienen RGB publicado. Los dos
    // primeros están medidos del cajón, así que entran; el cobre no.
    expect(catalog).toHaveLength(175)
    expect(catalog.find((b) => b.code === 'S41')?.name).toBe('Dorado')
    expect(catalog.find((b) => b.code === 'S42')?.name).toBe('Plata')
    expect(catalog.find((b) => b.code === 'S63')).toBeUndefined()
  })

  it('el color medido manda sobre el del catálogo', () => {
    // C02 Rojo se midió en #FD274A y el catálogo publica #EE2737 para S05.
    const rojo = catalog.find((b) => b.code === 'S05')
    expect(rojo?.hex).toBe('#FD274A')
    expect(rojo?.name).toBe('Rojo')
    expect(rojo?.approximate).toBeUndefined()
  })

  it('lo que sólo está en el catálogo queda marcado como aproximado', () => {
    const sinMedir = catalog.find((b) => b.code === 'S100')
    expect(sinMedir?.approximate).toBe(true)
    expect(sinMedir?.name).toBe('S100')
  })

  it('cada color del cajón aparece una vez, con su código de fábrica', () => {
    const medidos = catalog.filter((b) => !b.approximate)
    expect(medidos).toHaveLength(23)
    for (const bead of medidos) expect(bead.code).toBe(bead.factoryCode)
  })

  it('no repite códigos', () => {
    expect(new Set(catalog.map((b) => b.code)).size).toBe(catalog.length)
  })
})

describe('nearestFactoryCode', () => {
  it('clava el blanco, que en el catálogo es el S01', () => {
    const match = nearestFactoryCode('#FFFFFF')
    expect(match?.code).toBe('S01')
    expect(match?.deltaE).toBeCloseTo(0, 6)
  })

  it('coincide con lo que la paleta trae guardado', () => {
    // Si alguien edita el JSON a mano y desincroniza los códigos, esto lo dice.
    // Los metálicos van aparte: su código se asigna por nombre.
    for (const bead of DEFAULT_PALETTE.filter((b) => !b.metallic)) {
      const match = nearestFactoryCode(bead.hex)
      expect(match?.code).toBe(bead.factoryCode)
      expect(match?.deltaE).toBeCloseTo(bead.factoryDeltaE ?? -1, 1)
    }
  })

  it('los metálicos llevan su código por nombre, no por distancia', () => {
    // El dorado medido es un oliva apagado: buscarle el color más cercano daba
    // S117, un verde liso. Su código de verdad es el S41, y se sabe por el
    // nombre — que es lo único que el fabricante da de los metálicos.
    const dorado = DEFAULT_PALETTE.find((b) => b.name === 'Dorado')
    const plata = DEFAULT_PALETTE.find((b) => b.name === 'Plata')
    expect(dorado?.factoryCode).toBe('S41')
    expect(plata?.factoryCode).toBe('S42')
    expect(nearestFactoryCode(dorado!.hex)?.code).not.toBe('S41')
  })

  it('nunca propone un metálico', () => {
    // S41, S42 y S63 no tienen color publicado, así que no pueden ganar nunca.
    const metales = new Set(['S41', 'S42', 'S63'])
    for (const hex of ['#877D47', '#BECACE', '#B87333', '#FFD700', '#C0C0C0']) {
      expect(metales.has(nearestFactoryCode(hex)?.code ?? '')).toBe(false)
    }
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
