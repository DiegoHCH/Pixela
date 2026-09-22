// @vitest-environment jsdom

/**
 * Lo que se prueba aquí es el cable, no el patrón: que los resultados viejos se
 * tiran y que cerrar el proyecto no deja llegar nada de antes.
 *
 * En Node no hay `Worker`, así que corre el camino local. Da el mismo resultado
 * —es el mismo `buildPattern`— y contesta en otro turno igual, que es
 * justamente lo que hace que haya una sola forma de esperarlo.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_PALETTE, quantizable } from '../lib/palette'
import { NEUTRAL } from '../lib/adjust'
import type { RgbaImage } from '../lib/types'
import { pipeline, type PipelineJob } from './pipeline.svelte'

const PAL = quantizable(DEFAULT_PALETTE)

function image(size = 16): RgbaImage {
  const data = new Uint8ClampedArray(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = (i * 7) % 255
    data[i * 4 + 1] = 120
    data[i * 4 + 2] = 90
    data[i * 4 + 3] = 255
  }
  return { width: size, height: size, data }
}

function job(cols: number, rows: number): PipelineJob {
  return {
    image: image(),
    cols,
    rows,
    palette: PAL,
    mode: 'average',
    dither: false,
    adjustments: NEUTRAL,
  }
}

beforeEach(() => {
  pipeline.clear()
})

describe('pipeline', () => {
  it('sin worker calcula en local y lo dice', async () => {
    pipeline.run(job(8, 8))
    expect(pipeline.busy).toBe(true)
    await pipeline.ready()

    expect(pipeline.busy).toBe(false)
    expect(pipeline.local).toBe(true)
    expect(pipeline.result?.pattern.cols).toBe(8)
    expect(pipeline.result?.fidelity).not.toBeNull()
  })

  it('se queda con el último pedido y tira los de antes', async () => {
    // Es el caso de arrastrar el recorte: veinte encargos y sólo vale el último.
    pipeline.run(job(8, 8))
    pipeline.run(job(12, 4))
    pipeline.run(job(20, 10))
    await pipeline.ready()

    expect(pipeline.result?.pattern.cols).toBe(20)
    expect(pipeline.result?.pattern.rows).toBe(10)
  })

  it('cerrar el proyecto invalida lo que venía de camino', async () => {
    pipeline.run(job(8, 8))
    pipeline.clear()
    // El cálculo ya estaba lanzado; su respuesta no debe repoblar el lienzo.
    await Promise.resolve()
    await Promise.resolve()

    expect(pipeline.result).toBeNull()
    expect(pipeline.busy).toBe(false)
  })

  it('esperar cuando no hay nada pendiente no cuelga', async () => {
    await expect(pipeline.ready()).resolves.toBeUndefined()
  })

  it('un encargo imposible se cuenta como error y no como patrón', async () => {
    pipeline.run({ ...job(8, 8), cols: 0 })
    await pipeline.ready()

    expect(pipeline.result).toBeNull()
    expect(pipeline.error).toBeTruthy()
  })
})
