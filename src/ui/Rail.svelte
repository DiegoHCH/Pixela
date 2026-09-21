<script lang="ts">
  import { i18n } from '../i18n/index.svelte'
  import { project } from '../state/project.svelte'
  import BoardPicker from './BoardPicker.svelte'

  const grid = $derived(project.grid)
  const layout = $derived(project.layout)
  const batches = $derived(project.batches)
  const colors = $derived(project.counts.length)
</script>

<aside class="rail">
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
    </dl>
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
