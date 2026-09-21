<script lang="ts">
  import { i18n } from '../i18n/index.svelte'
  import { project } from '../state/project.svelte'

  /**
   * La paleta se ve como tu caja de cuentas real, con un compartimento por
   * color. Los que el patrón no usa quedan apagados; pulsar uno aísla ese color
   * en el lienzo.
   *
   * Cada muestra lleva su anillo gris neutro, que no cambia con el tema: si una
   * cuenta roja cambiara de aspecto al caer la noche, la herramienta mentiría
   * sobre lo único que le estás preguntando.
   */
  const counts = $derived(project.counts)
  const used = $derived(new Map(counts.map((c) => [c.index, c.count])))
  const isolatedCount = $derived(
    project.isolated != null ? (used.get(project.isolated) ?? 0) : null,
  )
</script>

<aside class="box">
  <div class="box-head">
    <span class="t">
      {project.isolated != null
        ? `${project.palette[project.isolated].code} ${project.palette[project.isolated].name}`
        : i18n.t('box.title')}
    </span>
    <span class="c">{i18n.t('box.colors', { n: counts.length })}</span>
  </div>

  <div class="wells">
    {#each project.palette as bead, index (bead.code)}
      <button
        type="button"
        class="well"
        class:off={!used.has(index)}
        class:sel={project.isolated === index}
        disabled={!used.has(index)}
        aria-pressed={project.isolated === index}
        title={`${bead.code} ${bead.name}`}
        onclick={() => project.toggleIsolate(index)}
      >
        <i style:background={bead.hex}></i>
      </button>
    {/each}
  </div>

  <div class="list">
    {#each counts as count (count.index)}
      <button
        type="button"
        class="row"
        class:sel={project.isolated === count.index}
        class:dim={project.isolated != null && project.isolated !== count.index}
        onclick={() => project.toggleIsolate(count.index)}
      >
        <span class="bd" style:background={project.palette[count.index].hex}></span>
        <span class="cd">{project.palette[count.index].code}</span>
        <span class="nm">{project.palette[count.index].name}</span>
        <span class="ct">{count.count.toLocaleString()}</span>
      </button>
    {/each}
  </div>

  <div class="box-foot">
    <div class="total">
      <span class="n">{(isolatedCount ?? project.total).toLocaleString()}</span>
      <span class="u">
        {project.isolated != null ? i18n.t('box.isolatedUnit') : i18n.t('box.total')}
      </span>
    </div>
    <p class="hint">
      {project.isolated != null ? i18n.t('box.hint.again') : i18n.t('box.hint')}
    </p>
  </div>
</aside>

<style>
  .box {
    width: 300px;
    flex: 0 0 300px;
    background: var(--panel);
    border-left: 1px solid var(--edge);
    color: var(--ink);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .box-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 12px 15px;
    border-bottom: 1px solid var(--edge);
  }

  .box-head .t {
    font-size: 13px;
    font-weight: 600;
  }

  .box-head .c {
    font-size: 11.5px;
    color: var(--ink-3);
  }

  .wells {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    padding: 12px 15px;
    border-bottom: 1px solid var(--edge);
  }

  /* El compartimento: gris neutro, igual de día y de noche. */
  .well {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    background: var(--well);
    border: 1px solid var(--well-edge);
    border-radius: var(--radius-square);
  }

  .well i {
    display: block;
    width: 100%;
    height: 100%;
    /* Todo lo redondo representa una cuenta. */
    border-radius: var(--radius-bead);
  }

  .well.off {
    opacity: 0.38;
    cursor: default;
  }

  .well.sel {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 6px 0;
  }

  .row {
    width: 100%;
    display: grid;
    grid-template-columns: 16px 34px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 5px 15px;
    background: transparent;
    border: 0;
    border-radius: 0;
    text-align: left;
  }

  .row:hover {
    background: var(--panel-2);
  }

  .row.sel {
    background: var(--accent-soft);
  }

  .row.dim {
    opacity: 0.45;
  }

  .bd {
    width: 14px;
    height: 14px;
    border-radius: var(--radius-bead);
    border: 1px solid var(--well-edge);
  }

  .cd {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-3);
  }

  .nm {
    font-size: 12.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ct {
    font-family: var(--font-display);
    font-size: 13px;
    color: var(--ink);
  }

  .box-foot {
    padding: 12px 15px;
    border-top: 1px solid var(--edge);
  }

  .total {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .total .n {
    font-family: var(--font-display);
    font-size: 22px;
  }

  .total .u {
    font-size: 12.5px;
    color: var(--ink-3);
  }

  .hint {
    margin: 4px 0 0;
    font-size: 11.5px;
    color: var(--ink-3);
    line-height: 1.5;
  }

  @media (max-width: 900px) {
    .box {
      width: auto;
      flex: none;
      border-left: 0;
      border-top: 1px solid var(--edge);
    }
  }
</style>
