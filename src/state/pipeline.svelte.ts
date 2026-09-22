/**
 * El que habla con el worker.
 *
 * Dos cosas que no son obvias y son la razón de que esto exista:
 *
 * 1. **Se tiran los resultados viejos.** Arrastrar el recorte pide veinte
 *    patrones por segundo y sólo el último importa. Si se aceptaran todos, el
 *    lienzo iría dando saltos atrás cada vez que uno lento llega tarde.
 * 2. **El patrón anterior se queda en pantalla** mientras el nuevo se calcula.
 *    Vaciarlo daría un parpadeo a negro en cada movimiento, y el sistema de
 *    diseño es explícito: la única animación de la app son las cuentas cayendo.
 *
 * Si el navegador no tiene workers —o el worker se muere— el pipeline corre
 * aquí mismo. Es el mismo código puro de `lib/`, así que el resultado es
 * idéntico; lo que se pierde es que la ventana no se congele mientras calcula.
 */

import PipelineWorker from '../worker/pipeline.worker?worker'
import { buildPattern } from '../lib/index'
import { fidelity as measureFidelity, type Fidelity } from '../lib/fidelity'
import type { Adjustments } from '../lib/adjust'
import type { SampleMode } from '../lib/sample'
import type { Palette, Pattern, RgbaImage } from '../lib/types'
import { isFailure, type PipelineMessage, type PipelineRequest } from '../worker/protocol'

export interface PipelineJob {
  /** El recorte, recién hecho: se transfiere al worker y aquí queda vacío. */
  image: RgbaImage
  cols: number
  rows: number
  /** Ya sin metálicos. Los índices del patrón son de esta paleta. */
  palette: Palette
  mode: SampleMode
  dither: boolean
  maxColors?: number
  adjustments: Adjustments
}

export interface PipelineResult {
  pattern: Pattern
  /** La paleta con la que se cuantizó, para que los índices signifiquen algo. */
  palette: Palette
  fidelity: Fidelity
}

class Pipeline {
  result = $state<PipelineResult | null>(null)
  /** Hay un patrón en el horno. No dibuja ruedas giratorias; informa. */
  busy = $state(false)
  error = $state<string | null>(null)
  /** Si se está calculando aquí en vez de en un worker. Para poder decirlo. */
  local = $state(false)

  #worker: Worker | null = null
  /** El worker no se pudo crear o se murió: de aquí en adelante, en local. */
  #noWorker = false
  #id = 0
  /** El pedido que cuenta. Cualquier respuesta con otro número se tira. */
  #awaiting = 0
  #palette: Palette | null = null
  /** La paleta que el worker ya tiene, para no volver a mandarla. */
  #sent: Palette | null = null
  #waiters: Array<() => void> = []

  run(job: PipelineJob): void {
    const id = ++this.#id
    this.#awaiting = id
    this.#palette = job.palette
    this.busy = true
    this.error = null

    const worker = this.#ensure()
    if (!worker) {
      // En local también se contesta en otro turno: así quien espera hace lo
      // mismo con worker y sin él, y no hay dos formas de usar esto.
      queueMicrotask(() => this.#local(id, job))
      return
    }

    const palette = job.palette === this.#sent ? undefined : job.palette
    this.#sent = job.palette

    const request: PipelineRequest = {
      id,
      image: job.image,
      cols: job.cols,
      rows: job.rows,
      palette,
      mode: job.mode,
      dither: job.dither,
      maxColors: job.maxColors,
      adjustments: job.adjustments,
    }
    worker.postMessage(request, [job.image.data.buffer])
  }

  /** Se cerró el proyecto: no hay patrón, y lo que venga de camino no vale. */
  clear(): void {
    this.#id++
    this.#awaiting = this.#id
    this.result = null
    this.error = null
    this.busy = false
    this.#wake()
  }

  /**
   * Resuelve cuando no queda nada pendiente. Es para las pruebas y para quien
   * necesite el patrón terminado —exportar, guardar—, no para pintar.
   */
  ready(): Promise<void> {
    if (!this.busy) return Promise.resolve()
    return new Promise((resolve) => this.#waiters.push(resolve))
  }

  #ensure(): Worker | null {
    if (this.#worker || this.#noWorker) return this.#worker
    if (typeof Worker === 'undefined') {
      this.#noWorker = true
      this.local = true
      return null
    }

    try {
      const worker = new PipelineWorker()
      worker.onmessage = (event: MessageEvent<PipelineMessage>) => this.#accept(event.data)
      // Si el worker se cae, el trabajo no se pierde: se sigue en local. Un
      // patrón calculado con la ventana congelada es mejor que ningún patrón.
      worker.onerror = () => this.#giveUp()
      this.#worker = worker
    } catch {
      this.#noWorker = true
      this.local = true
    }
    return this.#worker
  }

  #giveUp(): void {
    this.#worker?.terminate()
    this.#worker = null
    this.#noWorker = true
    this.#sent = null
    this.local = true
  }

  #local(id: number, job: PipelineJob): void {
    if (id !== this.#awaiting) return
    try {
      const built = buildPattern(job.image, job.cols, job.rows, job.palette, {
        mode: job.mode,
        dither: job.dither,
        maxColors: job.maxColors,
        adjustments: job.adjustments,
        includeMetallic: true,
      })
      this.#accept({
        id,
        cols: built.pattern.cols,
        rows: built.pattern.rows,
        cells: built.pattern.cells,
        fidelity: measureFidelity(built.grid, built.pattern, built.palette),
      })
    } catch (error) {
      this.#accept({
        id,
        error: error instanceof Error ? error.message : 'El patrón no se pudo calcular.',
      })
    }
  }

  #accept(message: PipelineMessage): void {
    // Llegó tarde: ya hay un pedido más nuevo. Tirarlo es el punto de todo esto.
    if (message.id !== this.#awaiting) return

    if (isFailure(message)) {
      this.error = message.error
      this.result = null
    } else if (this.#palette) {
      this.result = {
        pattern: { cols: message.cols, rows: message.rows, cells: message.cells },
        palette: this.#palette,
        fidelity: message.fidelity,
      }
    }

    this.busy = false
    this.#wake()
  }

  #wake(): void {
    const waiters = this.#waiters
    this.#waiters = []
    for (const resolve of waiters) resolve()
  }
}

export const pipeline = new Pipeline()
