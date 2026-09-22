<script lang="ts">
  import { i18n } from '../i18n/index.svelte'
  import { catalogPalette } from '../lib/palette'
  import { inventory } from '../state/inventory.svelte'
  import { project } from '../state/project.svelte'

  /**
   * El catálogo entero con lo que tienes marcado.
   *
   * La cantidad es opcional a propósito: nadie va a contar 3.000 cuentas
   * blancas, así que «lo tengo» sin número es un estado válido y no un
   * formulario a medio llenar. Con número, la lista de la compra resta; sin
   * número, sólo avisa de que lo mires.
   */
  const CATALOG = catalogPalette()

  type Filtro = 'todos' | 'tengo' | 'no'
  let filtro = $state<Filtro>('todos')
  let soloDelPatron = $state(false)

  /** Los códigos que el patrón abierto necesita. */
  const delPatron = $derived(
    new Set(project.counts.map((c) => project.palette[c.index]?.code).filter(Boolean)),
  )

  const visibles = $derived(
    CATALOG.filter((bead) => {
      if (soloDelPatron && !delPatron.has(bead.code)) return false
      if (filtro === 'tengo') return inventory.has(bead.code)
      if (filtro === 'no') return !inventory.has(bead.code)
      return true
    }),
  )

  /** Los que el patrón pide y no tienes: la lista con la que vas a la tienda. */
  const faltan = $derived([...delPatron].filter((code) => !inventory.has(code)))
</script>

<aside class="rail">
  <section>
    <h3>{i18n.t('inv.title')}</h3>
    <p class="big">
      {inventory.count}<span class="of"> / {CATALOG.length}</span>
    </p>
    <p class="sub">{i18n.t('inv.colors')}</p>
    <p class="sub">{i18n.t('inv.counted', { n: inventory.counted })}</p>
  </section>

  <section>
    <h3>{i18n.t('inv.filter')}</h3>
    <div class="seg" role="group" aria-label={i18n.t('inv.filter')}>
      {#each [['todos', 'inv.all'], ['tengo', 'inv.mine'], ['no', 'inv.not']] as const as [valor, clave] (valor)}
        <button
          type="button"
          aria-pressed={filtro === valor}
          onclick={() => (filtro = valor as Filtro)}
        >
          {i18n.t(clave as 'inv.all')}
        </button>
      {/each}
    </div>
  </section>

  {#if project.pattern}
    <section>
      <h3>{i18n.t('inv.forPattern')}</h3>
      <p class="sub">
        {i18n.t('inv.needs', { n: delPatron.size })}
        {faltan.length === 0 ? i18n.t('inv.haveAll') : i18n.t('inv.missing', { n: faltan.length })}
      </p>
      <label class="toggle">
        <input type="checkbox" checked={soloDelPatron} onchange={() => (soloDelPatron = !soloDelPatron)} />
        <span>{i18n.t('inv.onlyPattern')}</span>
      </label>
    </section>
  {/if}

  <section>
    <h3>{i18n.t('inv.reset')}</h3>
    <button type="button" class="quiet" onclick={() => inventory.reset()}>
      {i18n.t('inv.resetDrawer')}
    </button>
    <p class="sub">{i18n.t('inv.resetNote')}</p>
  </section>
</aside>

<div class="box">
  <div class="box-head">
    <span class="t">{i18n.t('inv.allColors')}</span>
    <span class="c">{visibles.length}</span>
  </div>

  <div class="grid">
    {#each visibles as bead (bead.code)}
      {@const tengo = inventory.has(bead.code)}
      <div class="item" class:off={!tengo}>
        <button
          type="button"
          class="pick"
          aria-pressed={tengo}
          onclick={() => inventory.toggle(bead.code)}
        >
          <span class="bd" style:background={bead.hex}></span>
          <span class="tx">
            <span class="cd">{bead.code}</span>
            <span class="nm">
              {bead.name === bead.code ? '' : bead.name}
              {#if bead.approximate}<span class="aprox" title={i18n.t('inv.approxNote')}>≈</span>{/if}
            </span>
          </span>
          <span class="ck" aria-hidden="true">{tengo ? '✓' : ''}</span>
        </button>

        {#if tengo}
          <input
            class="qty"
            type="number"
            min="0"
            step="10"
            placeholder={i18n.t('inv.uncounted')}
            value={inventory.stock(bead.code) ?? ''}
            aria-label={i18n.t('inv.qtyOf', { code: bead.code })}
            onchange={(e) => {
              const raw = e.currentTarget.value.trim()
              inventory.setStock(bead.code, raw === '' ? null : Math.max(0, Number(raw)))
            }}
          />
        {/if}
      </div>
    {/each}
  </div>

  <div class="box-foot">
    <p class="note">{i18n.t('inv.footNote')}</p>
  </div>
</div>

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

  .big {
    margin: 0;
    font-family: var(--font-display);
    font-size: 30px;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .big .of {
    font-size: 17px;
    color: var(--ink-3);
  }

  .sub {
    margin: 4px 0 0;
    font-size: 12.5px;
    color: var(--ink-3);
    line-height: 1.5;
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
    padding: 5px 6px;
    font-size: 12.5px;
    color: var(--ink-2);
  }

  .seg button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    font-size: 13px;
    color: var(--ink-2);
    cursor: pointer;
  }

  .toggle input {
    accent-color: var(--accent);
  }

  button.quiet {
    width: 100%;
    background: transparent;
    border: 1px solid var(--edge);
    color: var(--ink-2);
    padding: 6px 10px;
    font-size: 12.5px;
  }

  .box {
    flex: 1;
    min-width: 0;
    background: var(--panel-2);
    color: var(--ink);
    display: flex;
    flex-direction: column;
  }

  .box-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 12px 16px;
    background: var(--panel);
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

  .grid {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 16px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
    gap: 6px;
    align-content: start;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--panel);
    border: 1px solid var(--edge);
    border-radius: var(--radius-square);
    padding: 4px 6px;
  }

  .item.off {
    opacity: 0.55;
  }

  .pick {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 0;
    padding: 2px;
    text-align: left;
  }

  /* El compartimento gris neutro no cambia con el tema: la cuenta tampoco. */
  .bd {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    border-radius: var(--radius-bead);
    border: 1px solid var(--well-edge);
  }

  .tx {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }

  .cd {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-2);
  }

  .nm {
    font-size: 11.5px;
    color: var(--ink-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .aprox {
    color: var(--ink-3);
    cursor: help;
  }

  .ck {
    width: 14px;
    text-align: center;
    color: var(--accent);
    font-size: 13px;
    font-weight: 700;
  }

  .qty {
    width: 62px;
    flex: 0 0 62px;
    font: inherit;
    font-size: 12px;
    color: var(--ink);
    background: var(--panel-2);
    border: 1px solid var(--edge);
    border-radius: var(--radius-square);
    padding: 3px 5px;
  }

  .qty::placeholder {
    color: var(--ink-3);
    font-size: 11px;
  }

  .note {
    margin: 0;
    padding: 12px 16px;
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.55;
    background: var(--panel);
    border-top: 1px solid var(--edge);
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
