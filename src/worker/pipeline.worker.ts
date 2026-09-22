/**
 * El pipeline, fuera del hilo principal.
 *
 * Un patrón grande con difuminado son millones de conversiones a CIELAB. En el
 * hilo principal eso congela la ventana justo mientras arrastras el recorte o
 * un deslizante, que es lo que se hace todo el rato: la app parece rota sin
 * estarlo.
 *
 * Aquí no hay lógica nueva. Es `buildPattern` de `lib/`, que sigue siendo puro
 * y probado, con el cable alrededor.
 */

import { buildPattern } from '../lib/index'
import { fidelity } from '../lib/fidelity'
import type { Palette } from '../lib/types'
import type { PipelineRequest, PipelineResponse } from './protocol'

/** La última paleta recibida: la app sólo la manda cuando cambia. */
let palette: Palette | null = null

self.onmessage = (event: MessageEvent<PipelineRequest>) => {
  const job = event.data
  if (job.palette) palette = job.palette

  if (!palette) {
    self.postMessage({ id: job.id, error: 'El worker no tiene paleta todavía.' })
    return
  }

  try {
    const built = buildPattern(job.image, job.cols, job.rows, palette, {
      mode: job.mode,
      dither: job.dither,
      maxColors: job.maxColors,
      adjustments: job.adjustments,
      // La paleta llega ya sin metálicos: volver a filtrarla aquí cambiaría los
      // índices respecto a los que la app usa para pintar.
      includeMetallic: true,
    })

    const response: PipelineResponse = {
      id: job.id,
      cols: built.pattern.cols,
      rows: built.pattern.rows,
      cells: built.pattern.cells,
      fidelity: fidelity(built.grid, built.pattern, built.palette),
    }
    self.postMessage(response, { transfer: [response.cells.buffer] })
  } catch (error) {
    self.postMessage({
      id: job.id,
      error: error instanceof Error ? error.message : 'El patrón no se pudo calcular.',
    })
  }
}
