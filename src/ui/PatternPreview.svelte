<script lang="ts">
  import { drawPattern, fitCellSize } from '../lib/render'
  import { project } from '../state/project.svelte'
  import { theme } from '../state/theme.svelte'

  let { maxWidth = 268, maxHeight = 200 }: { maxWidth?: number; maxHeight?: number } = $props()

  let canvas = $state<HTMLCanvasElement | null>(null)

  $effect(() => {
    const el = canvas
    const pattern = project.pattern
    const palette = project.palette
    const current = theme.current
    if (!el || !pattern) return

    const cellSize = fitCellSize(pattern, maxWidth, maxHeight)
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
      mode: project.renderMode,
      board: project.board,
    })
  })
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    display: block;
    border-radius: var(--radius-square);
  }
</style>
