<script lang="ts">
  import { i18n } from '../i18n/index.svelte'
  import { boardSlice } from '../lib/boards'
  import { drawPattern } from '../lib/render'
  import { project } from '../state/project.svelte'
  import { theme } from '../state/theme.svelte'

  /**
   * La tira de placas: un mapa en miniatura con la forma real del montaje.
   * Sustituye al desplegable de «elegir placa» — un desplegable no dice que la
   * pieza sea ancha, y esto sí.
   */
  const layout = $derived(project.layout)
  const cells = $derived(
    layout
      ? Array.from({ length: layout.total }, (_, i) => ({
          index: i,
          col: i % layout.cols,
          row: Math.floor(i / layout.cols),
        }))
      : [],
  )

  let thumbs = $state<Array<HTMLCanvasElement | null>>([])

  /** Un solo píxel por cuenta: es un mapa, no una vista previa. */
  const THUMB_CELL = 1

  $effect(() => {
    const pattern = project.pattern
    const l = layout
    const current = theme.current
    const only = project.isolated
    const palette = project.palette
    const board = project.board
    if (!pattern || !l) return

    thumbs.forEach((node, index) => {
      if (!node) return
      const slice = boardSlice(pattern, index % l.cols, Math.floor(index / l.cols), board)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = slice.cols * THUMB_CELL
      const height = slice.rows * THUMB_CELL

      node.width = Math.round(width * dpr)
      node.height = Math.round(height * dpr)
      node.style.width = `${width}px`
      node.style.height = `${height}px`

      const ctx = node.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawPattern(ctx, slice, { palette, cellSize: THUMB_CELL, theme: current, only })
    })
  })
</script>

{#if layout}
  <div class="strip">
    <span class="strip-h">{i18n.t('strip.title')}</span>

    <div class="grid" style:--cols={layout.cols}>
      {#each cells as cell (cell.index)}
        <button
          type="button"
          class="cell"
          class:on={project.selectedBoard === cell.index}
          aria-pressed={project.selectedBoard === cell.index}
          aria-label={i18n.t('stage.board', { n: cell.index + 1 })}
          onclick={() => project.selectBoard(cell.index)}
        >
          <span class="idx">{cell.index + 1}</span>
          <canvas bind:this={thumbs[cell.index]}></canvas>
        </button>
      {/each}
    </div>

    <div class="meta">
      <b>{i18n.t('strip.meta', {
          n: layout.total,
          cols: project.board.cols,
          rows: project.board.rows,
        })}</b>
      <span>{i18n.t('strip.hint')}</span>
    </div>
  </div>
{/if}

<style>
  .strip {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    background: var(--surface-2);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    overflow-x: auto;
  }

  .strip-h {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--on-dark-2);
    flex: 0 0 auto;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 34px);
    gap: 3px;
    flex: 0 0 auto;
  }

  .cell {
    position: relative;
    padding: 2px;
    background: var(--surface-3);
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
  }

  .cell.on {
    border-color: var(--accent);
  }

  .idx {
    position: absolute;
    top: 1px;
    left: 3px;
    font-size: 9px;
    font-family: var(--font-mono);
    color: var(--on-dark-2);
  }

  .cell.on .idx {
    color: var(--accent);
  }

  canvas {
    display: block;
  }

  .meta {
    display: flex;
    flex-direction: column;
    font-size: 11.5px;
    color: var(--on-dark-2);
    flex: 0 0 auto;
  }

  .meta b {
    color: var(--on-dark);
    font-weight: 600;
  }
</style>
