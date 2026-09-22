import { beforeEach, describe, expect, it } from 'vitest'

import { readNumber, readString, removeKey, writeNumber, writeString } from './storage'

/** Un `localStorage` de verdad, porque el global de Node está a medio hacer. */
function install(): Map<string, string> {
  const map = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, String(v)),
      removeItem: (k: string) => map.delete(k),
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    },
  })
  return map
}

describe('con almacenamiento disponible', () => {
  beforeEach(() => {
    install()
  })

  it('guarda y recupera texto', () => {
    writeString('pixela:x', 'hola')
    expect(readString('pixela:x')).toBe('hola')
    removeKey('pixela:x')
    expect(readString('pixela:x')).toBeNull()
  })

  it('guarda y recupera números', () => {
    writeNumber('pixela:placas', 6)
    expect(readNumber('pixela:placas', 2)).toBe(6)
  })

  it('devuelve el de reserva si lo guardado no vale', () => {
    writeString('pixela:placas', 'dos')
    expect(readNumber('pixela:placas', 2)).toBe(2)
  })

  it('devuelve el de reserva si lo guardado sale del rango', () => {
    // Un valor fuera de rango en el almacenamiento no debe colarse a la app:
    // 900 placas darían tandas absurdas sin que nada fallara a la vista.
    writeNumber('pixela:placas', 900)
    expect(readNumber('pixela:placas', 2, { min: 1, max: 99 })).toBe(2)
    writeNumber('pixela:placas', 0)
    expect(readNumber('pixela:placas', 2, { min: 1, max: 99 })).toBe(2)
  })

  it('sin nada guardado, el de reserva', () => {
    expect(readNumber('pixela:nuevo', 320)).toBe(320)
  })
})

describe('sin almacenamiento', () => {
  beforeEach(() => {
    // Así es como lo expone Node: el objeto está, los métodos no.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {},
    })
  })

  it('no revienta: lee el de reserva y las escrituras se pierden en silencio', () => {
    expect(() => writeString('pixela:x', 'hola')).not.toThrow()
    expect(readString('pixela:x')).toBeNull()
    expect(readNumber('pixela:x', 7)).toBe(7)
    expect(() => removeKey('pixela:x')).not.toThrow()
  })
})

describe('con el almacenamiento bloqueado', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('bloqueado por el navegador')
      },
    })
  })

  it('tampoco revienta', () => {
    // En modo privado, tocar localStorage lanza. Se pierde la preferencia,
    // no la sesión.
    expect(() => writeString('pixela:x', 'hola')).not.toThrow()
    expect(readNumber('pixela:x', 3)).toBe(3)
  })
})
