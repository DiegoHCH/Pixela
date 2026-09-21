<script lang="ts">
  import { i18n } from '../i18n/index.svelte'
  import { drawEmptyBoard } from '../lib/render'
  import { theme } from '../state/theme.svelte'

  let { dragging = false, onopen }: { dragging?: boolean; onopen: () => void } = $props()

  let canvas = $state<HTMLCanvasElement | null>(null)

  /**
   * Lo vacío *es* el producto: una placa sin cuentas, no un icono gris con una
   * frase simpática.
   */
  $effect(() => {
    const el = canvas
    const current = theme.current
    if (!el) return

    const cols = 34
    const rows = 15
    const cs = 9
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    el.width = cols * cs * dpr
    el.height = rows * cs * dpr
    el.style.width = `${cols * cs}px`
    el.style.height = `${rows * cs}px`

    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawEmptyBoard(ctx, cols, rows, cs, current)
  })
</script>

<div class="empty" class:dragging>
  <canvas bind:this={canvas}></canvas>
  <p class="title">{dragging ? i18n.t('drop.title') : i18n.t('empty.title')}</p>
  <p class="body">{i18n.t('empty.body')}</p>
  {#if !dragging}
    <button type="button" class="primary" onclick={onopen}>{i18n.t('bar.open')}</button>
  {/if}
</div>

<style>
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 48px 28px;
    text-align: center;
    border: 1px dashed transparent;
    border-radius: var(--radius-square);
    margin: 18px;
  }

  /*
    El único momento en que el acento aparece sin haber patrón. La placa se
    ilumina porque el archivo va a caer ahí, no en cualquier parte de la ventana.
  */
  .empty.dragging {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  canvas {
    display: block;
    border-radius: var(--radius-square);
    margin-bottom: 8px;
  }

  .title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 19px;
    color: var(--on-dark);
  }

  .body {
    margin: 0;
    max-width: 42ch;
    font-size: 13px;
    color: var(--on-dark-2);
  }

  button.primary {
    margin-top: 6px;
    background: var(--accent);
    color: var(--accent-ink);
    border: 0;
    padding: 8px 18px;
    font-weight: 600;
  }
</style>
