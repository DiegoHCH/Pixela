<script lang="ts">
  import { i18n } from '../i18n/index.svelte'
  import { inventory } from '../state/inventory.svelte'
  import { project } from '../state/project.svelte'
  import BoardPicker from './BoardPicker.svelte'

  const grid = $derived(project.grid)
  const layout = $derived(project.layout)
  const batches = $derived(project.batches)
  const colors = $derived(project.counts.length)
</script>

<aside class="rail">
  {#if project.phase === 'pattern' && project.image}
    <section>
      <h3>{i18n.t('rail.origin')}</h3>
      <div class="file">
        <span class="nm">{project.image.name}</span>
        <span class="dm">{project.image.sourceWidth} × {project.image.sourceHeight}</span>
      </div>
    </section>
  {/if}

  <section>
    <h3>{i18n.t('rail.measure')}</h3>
    <div class="seg" role="group" aria-label={i18n.t('rail.measure')}>
      <button
        type="button"
        aria-pressed={project.measure === 'boards'}
        onclick={() => project.setMeasure('boards')}>{i18n.t('rail.measure.boards')}</button
      >
      <button
        type="button"
        aria-pressed={project.measure === 'beads'}
        onclick={() => project.setMeasure('beads')}>{i18n.t('rail.measure.beads')}</button
      >
    </div>
  </section>

  {#if project.measure === 'boards'}
    <section>
      <h3>{i18n.t('rail.shape')}</h3>
      <BoardPicker />
      <p class="read">
        {i18n.t('rail.shape.readout', {
          x: project.boardsX,
          y: project.boardsY,
          cols: grid.cols,
          rows: grid.rows,
        })}
      </p>
      <p class="read dim">{i18n.t('rail.owned', { n: project.ownedBoards })}</p>
    </section>
  {:else}
    <section>
      <h3>{i18n.t('rail.size')}</h3>
      <div class="pair">
        <label>
          <span>{i18n.t('rail.size.cols')}</span>
          <input
            type="number"
            min="1"
            max="400"
            value={project.beadCols}
            onchange={(e) =>
              project.setBeadSize(e.currentTarget.valueAsNumber || 1, project.beadRows)}
          />
        </label>
        <label>
          <span>{i18n.t('rail.size.rows')}</span>
          <input
            type="number"
            min="1"
            max="400"
            value={project.beadRows}
            onchange={(e) =>
              project.setBeadSize(project.beadCols, e.currentTarget.valueAsNumber || 1)}
          />
        </label>
      </div>
    </section>
  {/if}

  {#if project.losesDetail}
    <!--
      El aviso que faltaba. El plan avisa del patrón demasiado grande —el que no
      cabe en tus placas—; éste es el contrario, y es el que de verdad arruina un
      intento: un dibujo de líneas metido en 841 cuentas no se reconoce.
    -->
    <section>
      <div class="notice warn">
        <p class="nt">{i18n.t('rail.detail.title')}</p>
        <p class="nd">{i18n.t('rail.detail.body', { cells: grid.cols * grid.rows })}</p>
      </div>
    </section>
  {/if}

  {#if project.image}
    <!--
      Los ajustes se proponen al cargar según lo que sea la imagen, pero viven
      aquí a la vista: un modo automático que no se puede corregir es peor que no
      tenerlo. Y con fotos el tope de colores no es un extra — sin él una imagen
      se va a veinte y pico colores, o sea veinte y pico bolsas que comprar.
    -->
    <section>
      <h3>{i18n.t('rail.image')}</h3>
      <div class="seg" role="group" aria-label={i18n.t('rail.image')}>
        <button
          type="button"
          aria-pressed={project.sampleMode === 'average'}
          onclick={() => (project.sampleMode = 'average')}>{i18n.t('rail.mode.average')}</button
        >
        <button
          type="button"
          aria-pressed={project.sampleMode === 'point'}
          onclick={() => (project.sampleMode = 'point')}>{i18n.t('rail.mode.point')}</button
        >
      </div>
      <label class="toggle">
        <input type="checkbox" checked={project.dither} onchange={() => (project.dither = !project.dither)} />
        <span>{i18n.t('rail.dither')}</span>
      </label>
      <label class="toggle">
        <input
          type="checkbox"
          checked={project.onlyOwned}
          onchange={() => project.setOnlyOwned(!project.onlyOwned)}
        />
        <span>{i18n.t('rail.onlyOwned')}</span>
      </label>
      <button type="button" class="quiet" onclick={() => project.openInventory()}>
        {i18n.t('bar.inventory')} · {inventory.count}
      </button>
      {#if project.onlyOwned && inventory.count === 0}
        <p class="warnline">{i18n.t('rail.onlyOwned.none')}</p>
      {/if}
      <label class="slider">
        <span class="top">
          <span>{i18n.t('rail.maxColors')}</span>
          <span class="val">{project.maxColors ?? i18n.t('rail.maxColors.none')}</span>
        </span>
        <input
          type="range"
          min="2"
          max={project.palette.length}
          value={project.maxColors ?? project.palette.length}
          oninput={(e) => {
            const v = e.currentTarget.valueAsNumber
            project.maxColors = v >= project.palette.length ? null : v
          }}
        />
      </label>
    </section>
  {/if}

  {#if layout}
    <section>
      <h3>{i18n.t('rail.batches')}</h3>
      <!--
        El aviso de desmoldar va donde toca: la tanda siguiente necesita las
        mismas placas físicas, así que hay que planchar y liberar antes.
      -->
      <div class="notice" class:warn={batches.length > 1}>
        <p class="nt">
          {batches.length === 1
            ? i18n.t('rail.batches.one.title')
            : i18n.t('rail.batches.many.title', { n: batches.length })}
        </p>
        <p class="nd">
          {batches.length === 1
            ? i18n.t('rail.batches.one.body', {
                boards: layout.total,
                owned: project.ownedBoards,
              })
            : i18n.t('rail.batches.many.body', { owned: project.ownedBoards })}
        </p>
      </div>
    </section>
  {/if}

  <section>
    <h3>{i18n.t('rail.cost')}</h3>
    <dl>
      <div><dt>{i18n.t('rail.cost.beads')}</dt><dd>{project.total.toLocaleString()}</dd></div>
      <div><dt>{i18n.t('rail.cost.colors')}</dt><dd>{colors}</dd></div>
      {#if project.shopping}
        <div>
          <dt>{i18n.t('rail.cost.bags')}</dt>
          <dd>{project.shopping.totalBags}</dd>
        </div>
      {/if}
    </dl>
  </section>

  <!--
    Dos datos que son tuyos y no del patrón, así que se preguntan una vez y se
    quedan: cuántas placas tienes —de eso salen las tandas— y de cuántas
    cuentas vienen tus bolsas.
  -->
  <section>
    <h3>{i18n.t('rail.yours')}</h3>
    <div class="pair">
      <label>
        <span>{i18n.t('rail.yours.boards')}</span>
        <input
          type="number"
          min="1"
          max="99"
          value={project.ownedBoards}
          onchange={(e) => project.setOwnedBoards(e.currentTarget.valueAsNumber || 1)}
        />
      </label>
      <label>
        <span>{i18n.t('rail.yours.bag')}</span>
        <input
          type="number"
          min="1"
          max="10000"
          step="10"
          value={project.bagSize}
          onchange={(e) => project.setBagSize(e.currentTarget.valueAsNumber || 1)}
        />
      </label>
    </div>
  </section>
</aside>

<style>
  .rail {
    width: 262px;
    flex: 0 0 262px;
    background: var(--panel);
    border-right: 1px solid var(--edge);
    color: var(--ink);
    padding: 16px 16px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  h3 {
    font-family: var(--font-body);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin: 0 0 9px;
  }

  .seg {
    display: flex;
    gap: 2px;
    background: var(--panel-2);
    border: 1px solid var(--edge);
    border-radius: var(--radius-square);
    padding: 2px;
  }

  .seg button {
    flex: 1;
    background: transparent;
    border: 0;
    padding: 5px 8px;
    font-size: 13px;
    color: var(--ink-2);
  }

  .seg button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }

  .read {
    margin: 9px 0 0;
    font-size: 12.5px;
    color: var(--ink-2);
  }

  .read.dim {
    margin-top: 3px;
    color: var(--ink-3);
  }

  .pair {
    display: flex;
    gap: 8px;
  }

  .file {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--panel-2);
    border: 1px solid var(--edge);
    border-radius: var(--radius-square);
    padding: 8px 10px;
  }

  .file .nm {
    font-size: 12.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file .dm {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-3);
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--ink-2);
    cursor: pointer;
  }

  .toggle input {
    width: auto;
    accent-color: var(--accent);
  }

  button.quiet {
    width: 100%;
    margin-top: 10px;
    background: transparent;
    border: 1px solid var(--edge);
    color: var(--ink-2);
    padding: 6px 10px;
    font-size: 12.5px;
  }

  button.quiet:hover {
    background: var(--panel-2);
    color: var(--ink);
  }

  .warnline {
    margin: 9px 0 0;
    padding: 8px 10px;
    background: var(--warn-soft);
    border: 1px solid var(--warn);
    border-radius: var(--radius-square);
    font-size: 12px;
    color: var(--ink-2);
    line-height: 1.5;
  }

  .slider {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 12px;
  }

  .slider .top {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    color: var(--ink-2);
  }

  .slider .val {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--ink);
  }

  .slider input[type='range'] {
    padding: 0;
    border: 0;
    background: transparent;
    accent-color: var(--accent);
  }

  label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--ink-3);
  }

  input {
    font: inherit;
    font-size: 13px;
    color: var(--ink);
    background: var(--panel-2);
    border: 1px solid var(--edge);
    border-radius: var(--radius-square);
    padding: 5px 7px;
    width: 100%;
  }

  .notice {
    background: var(--panel-2);
    border: 1px solid var(--edge);
    border-radius: var(--radius-square);
    padding: 10px 12px;
  }

  .notice.warn {
    background: var(--warn-soft);
    border-color: var(--warn);
  }

  .nt {
    margin: 0 0 3px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }

  .nd {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
    line-height: 1.5;
  }

  dl {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid var(--edge);
    padding-bottom: 5px;
  }

  dt {
    font-size: 12.5px;
    color: var(--ink-3);
  }

  dd {
    margin: 0;
    font-family: var(--font-display);
    font-size: 16px;
    color: var(--ink);
  }

  @media (max-width: 900px) {
    .rail {
      width: auto;
      flex: none;
      border-right: 0;
      border-bottom: 1px solid var(--edge);
    }
  }
</style>
