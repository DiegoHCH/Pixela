<script lang="ts">
  /**
   * La vista imprimible: una hoja por placa, con símbolos, sobre papel blanco.
   *
   * El sistema de diseño lo fija en una línea — «hoja por placa con símbolos,
   * siempre en tema día, sin gastar cartucho en fondos» — y de ahí sale todo lo
   * de aquí: sin la placa oscura de fondo, sin agujeros dibujados, una letra
   * por color y la regla numerada como en el montaje completo.
   *
   * En pantalla se ven las hojas como saldrán, sobre la mesa. Al imprimir, la
   * hoja de estilos esconde la app y deja sólo el papel, una placa por página.
   */

  import { i18n } from '../i18n/index.svelte'
  import {
    coordGutter,
    drawCoordinates,
    drawPattern,
    symbolFor,
  } from '../lib/render'
  import type { Sheet } from '../lib/sheets'
  import { project } from '../state/project.svelte'

  /**
   * Lo que mide una celda en el papel. 22 px a 96 ppp son unos 5,8 mm: la
   * cuenta impresa sale un poco mayor que la de verdad, que es lo que hace
   * falta para escribirle una letra encima y seguirla con el dedo.
   */
  const CELL = 22

  const sheets = $derived(project.sheets)

  /**
   * Dibuja una hoja. Al doble de resolución y reducida por CSS: una impresora
   * pone 300 ppp donde la pantalla pone 96, y un canvas a tamaño 1 sale con los
   * bordes deshilachados en el papel.
   */
  function sheet(canvas: HTMLCanvasElement, data: Sheet) {
    const gutter = coordGutter(CELL)
    const width = data.pattern.cols * CELL + gutter
    const height = data.pattern.rows * CELL + gutter
    const scale = 2

    canvas.width = width * scale
    canvas.height = height * scale
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)

    drawPattern(ctx, data.pattern, {
      palette: project.palette,
      cellSize: CELL,
      mode: 'print',
      x0: gutter,
      y0: gutter,
    })
    drawCoordinates(ctx, {
      cols: data.pattern.cols,
      rows: data.pattern.rows,
      cellSize: CELL,
      colOffset: data.col,
      rowOffset: data.row,
      x0: gutter,
      y0: gutter,
      print: true,
    })
  }

  /** Una acción de Svelte para no meter un `$effect` por hoja. */
  function paint(node: HTMLCanvasElement, data: Sheet) {
    sheet(node, data)
    return { update: (next: Sheet) => sheet(node, next) }
  }
</script>

<div class="sheets">
  <p class="hint">{i18n.t('print.hint')}</p>

  {#each sheets as s (s.number)}
    <article class="paper">
      <header>
        <h1>{project.name}</h1>
        <p class="meta">
          {i18n.t('print.board', { n: s.number, total: sheets.length })} ·
          {i18n.t('print.range', {
            c1: s.col + 1,
            c2: s.col + s.pattern.cols,
            r1: s.row + 1,
            r2: s.row + s.pattern.rows,
          })} ·
          {i18n.t('print.beads', { n: s.total.toLocaleString() })}
        </p>
      </header>

      <canvas use:paint={s}></canvas>

      <section class="legend">
        <h2>{i18n.t('print.legend')}</h2>
        <ul>
          {#each s.counts as c (c.index)}
            {@const bead = project.palette[c.index]}
            {#if bead}
              <li>
                <span class="sym">{symbolFor(c.index)}</span>
                <span class="code">{bead.approximate ? '≈' : ''}{bead.code}</span>
                <span class="nm">{bead.name}</span>
                <span class="n">{c.count.toLocaleString()}</span>
              </li>
            {/if}
          {/each}
        </ul>
      </section>
    </article>
  {/each}
</div>

<style>
  .sheets {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }

  .hint {
    margin: 0;
    max-width: 62ch;
    font-size: 12.5px;
    color: var(--on-dark-2);
    text-align: center;
  }

  /* El papel es papel también en pantalla: blanco sobre la mesa. */
  .paper {
    background: #ffffff;
    color: #111111;
    padding: 20px 22px 22px;
    border-radius: var(--radius-square);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  }

  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 17px;
    color: #111111;
  }

  .meta {
    margin: 2px 0 12px;
    font-size: 11.5px;
    color: #555555;
  }

  canvas {
    display: block;
  }

  .legend {
    margin-top: 14px;
  }

  .legend h2 {
    margin: 0 0 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #555555;
  }

  .legend ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: 2px 14px;
  }

  .legend li {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 11.5px;
    border-bottom: 1px solid #eeeeee;
    padding: 2px 0;
  }

  /* La letra es la que está en la rejilla: misma fuente y mismo peso. */
  .sym {
    font-family: var(--font-mono);
    font-weight: 700;
    width: 1.4em;
    text-align: center;
  }

  .code {
    font-family: var(--font-mono);
    color: #555555;
  }

  .nm {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .n {
    font-variant-numeric: tabular-nums;
    color: #555555;
  }

  /*
    Al imprimir no hay app: hay hojas. Una placa por página, y ni un fondo
    oscuro que se coma el cartucho.
  */
  @media print {
    .sheets {
      display: block;
      overflow: visible;
      padding: 0;
    }

    .hint {
      display: none;
    }

    .paper {
      box-shadow: none;
      border-radius: 0;
      padding: 0;
      break-after: page;
    }

    .paper:last-child {
      break-after: auto;
    }
  }
</style>
