<script lang="ts">
  import { drawPattern, fitCellSize } from '../lib/render'
  import { project } from '../state/project.svelte'
  import { theme } from '../state/theme.svelte'

  /** La única animación de la app, y dura lo que dice el sistema de diseño. */
  const FALL_MS = 240

  let canvas = $state<HTMLCanvasElement | null>(null)
  let boxWidth = $state(0)
  let boxHeight = $state(0)
  /** Cuántas filas han caído ya. `null` = todas, que es el estado normal. */
  let fallen = $state<number | null>(null)

  /** Si hay una placa señalada se ve ella sola, con sus huecos. */
  const shown = $derived(project.selectedBoardPattern ?? project.pattern)
  const whole = $derived(project.selectedBoard == null)

  $effect(() => {
    const id = project.conversionId
    const rows = project.fallRows
    if (!id || !rows) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fallen = null
      return
    }

    // No hay rueda giratoria ni barra falsa: el patrón apareciendo *es* el
    // indicador de progreso, y deja ver cómo va quedando antes de terminar.
    const start = performance.now()
    let raf = 0
    fallen = 0

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FALL_MS)
      fallen = Math.max(1, Math.ceil(t * rows))
      if (t < 1) raf = requestAnimationFrame(step)
      else fallen = null
    }
    raf = requestAnimationFrame(step)

    return () => cancelAnimationFrame(raf)
  })

  $effect(() => {
    const el = canvas
    const pattern = shown
    const palette = project.palette
    const current = theme.current
    const only = project.isolated
    const rowsVisible = fallen
    const mode = project.renderMode
    const isWhole = whole

    if (!el || !pattern || boxWidth <= 0 || boxHeight <= 0) return

    const cellSize = fitCellSize(pattern, boxWidth, boxHeight)
    const width = pattern.cols * cellSize
    const height = pattern.rows * cellSize
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    el.width = Math.round(width * dpr)
    el.height = Math.round(height * dpr)
    el.style.width = `${width}px`
    el.style.height = `${height}px`

    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    drawPattern(ctx, pattern, {
      palette,
      cellSize,
      theme: current,
      mode,
      only,
      // Una placa sola no lleva costuras: ella *es* la placa.
      board: isWhole ? project.board : undefined,
      rowsVisible: isWhole ? (rowsVisible ?? undefined) : undefined,
    })
  })
</script>

<div class="stage-canvas" bind:clientWidth={boxWidth} bind:clientHeight={boxHeight}>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .stage-canvas {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
  }

  canvas {
    display: block;
    border-radius: var(--radius-square);
  }
</style>
