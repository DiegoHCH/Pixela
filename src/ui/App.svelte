<script lang="ts">
  import { LOCALES, i18n, type MessageKey } from '../i18n/index.svelte'
  import { accentFromHex } from '../lib/accent'
  import { formatSize } from '../lib/measure'
  import { ProjectFileError, looksLikeProject } from '../lib/project-file'
  import { exportPatternPng } from '../state/export-png'
  import { buildProjectFile, readProjectFile, saveProjectFile } from '../state/save-project'
  import { ImageLoadError, loadImageFile, pickImageFile, type LoadFailure } from '../state/load-image'
  import { project } from '../state/project.svelte'
  import { applyAccent, theme } from '../state/theme.svelte'
  import BeadBox from './BeadBox.svelte'
  import BoardStrip from './BoardStrip.svelte'
  import CropStage from './CropStage.svelte'
  import DropZone from './DropZone.svelte'
  import Inventory from './Inventory.svelte'
  import PatternPreview from './PatternPreview.svelte'
  import PatternStage from './PatternStage.svelte'
  import PrintView from './PrintView.svelte'
  import Rail from './Rail.svelte'

  type Failure = LoadFailure | 'export' | 'project'

  /** Título y explicación de cada fallo, para no construir claves a mano. */
  const ERROR_KEYS = {
    type: ['error.type.title', 'error.type.body'],
    decode: ['error.decode.title', 'error.decode.body'],
    export: ['error.export.title', 'error.export.body'],
    project: ['error.project.title', 'error.project.body'],
  } as const satisfies Record<Failure, readonly [MessageKey, MessageKey]>

  let input = $state<HTMLInputElement | null>(null)
  let dragging = $state(false)
  let failure = $state<Failure | null>(null)
  /** El motivo exacto cuando un proyecto no se puede abrir. */
  let projectError = $state<string | null>(null)
  let exporting = $state(false)
  let saving = $state(false)
  let dragDepth = 0

  /** Cuánto aguanta armado el botón de cerrar antes de volver a su sitio. */
  const CLOSE_CONFIRM_MS = 4000
  /** El botón de cerrar, ya preguntado una vez. */
  let closing = $state(false)
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Volver a la pantalla vacía. Hasta ahora sólo se llegaba recargando la
   * página, que es pedirle al usuario que haga de botón.
   *
   * Cerrar tira el patrón, así que el botón pregunta: el primer clic cambia la
   * etiqueta y el segundo cierra. Un clic de más es barato; perder media hora
   * de ajustes por un clic mal dado, no. Y si no contestas, el botón se
   * desarma solo en lugar de quedarse acechando.
   */
  function requestClose() {
    if (!closing) {
      closing = true
      closeTimer = setTimeout(() => (closing = false), CLOSE_CONFIRM_MS)
      return
    }
    cancelClose()
    project.close()
  }

  function cancelClose() {
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = null
    closing = false
  }

  /**
   * Una sola puerta de entrada: si lo que llega es un proyecto se abre como
   * proyecto, y si es una imagen, como imagen. Vale igual arrastrando,
   * pegando o desde el botón.
   */
  async function open(file: File | null) {
    if (!file) return
    failure = null

    if (looksLikeProject(file)) {
      try {
        const { project: saved, image } = await readProjectFile(file)
        project.restore(image, saved)
        projectError = null
      } catch (error) {
        projectError = error instanceof ProjectFileError ? error.message : null
        failure = 'project'
      }
      return
    }

    try {
      project.open(await loadImageFile(file))
    } catch (error) {
      failure = error instanceof ImageLoadError ? error.reason : 'decode'
    }
  }

  /** Guarda la imagen de trabajo y las decisiones, no el patrón ya calculado. */
  async function saveProject() {
    if (!project.image || saving) return
    failure = null
    saving = true
    try {
      await saveProjectFile(buildProjectFile(project.image, project.name, project.settings))
    } catch {
      projectError = null
      failure = 'project'
    } finally {
      saving = false
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    dragDepth = 0
    dragging = false
    void open(pickImageFile(event.dataTransfer))
  }

  function onDragEnter(event: DragEvent) {
    event.preventDefault()
    dragDepth++
    dragging = true
  }

  function onDragLeave() {
    // Contado por profundidad: entrar en un hijo dispara un «leave» del padre.
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0) dragging = false
  }

  /**
   * Exporta lo que estás mirando: el patrón completo, o la placa señalada como
   * hoja suelta. Si hay un color aislado, sale la hoja de ese color.
   */
  async function exportPng() {
    const pattern = project.selectedBoardPattern ?? project.pattern
    if (!pattern || !project.image || exporting) return

    exporting = true
    failure = null
    try {
      const single = project.selectedBoard != null
      const origin = project.selectedBoardOrigin
      await exportPatternPng(pattern, project.palette, {
        source: project.name,
        board: single ? undefined : project.board,
        boardNumber: single ? project.selectedBoard! + 1 : undefined,
        only: project.isolated,
        mode: project.renderMode,
        // La hoja de una placa sale numerada como en el montaje; el patrón
        // completo no, que a ese tamaño de celda los números no se leen.
        coords: single && origin ? { colOffset: origin.col, rowOffset: origin.row } : undefined,
      })
    } catch {
      failure = 'export'
    } finally {
      exporting = false
    }
  }

  function onPaste(event: ClipboardEvent) {
    const file = pickImageFile(event.clipboardData)
    if (file) void open(file)
  }

  /**
   * La app no tiene color de marca: el acento sale del patrón abierto. Sin
   * patrón vuelve al de reserva.
   *
   * Lee el color ya fijado y no el patrón: así no parpadea mientras arrastras
   * un deslizante. La banda de luminosidad sí depende del tema, por eso el
   * efecto sigue dependiendo de él.
   */
  $effect(() => {
    const current = theme.current
    applyAccent(accentFromHex(project.accentSource, current), current)
  })
</script>

<svelte:window onpaste={onPaste} />

<div
  class="app"
  ondrop={onDrop}
  ondragover={(e) => e.preventDefault()}
  ondragenter={onDragEnter}
  ondragleave={onDragLeave}
  role="application"
  aria-label={i18n.t('app.name')}
>
  <header class="bar">
    <div class="brand">
      <span class="name">{i18n.t('app.name')}</span>
      {#if project.image}
        <!--
          El nombre del patrón se escribe aquí, donde antes sólo se leía el del
          archivo: es lo que va a llamarse el PNG que exportes y el proyecto que
          guardes, así que se cambia donde se ve.
        -->
        <input
          class="file title"
          type="text"
          value={project.name}
          aria-label={i18n.t('bar.name')}
          placeholder={i18n.t('bar.name')}
          onchange={(e) => project.setName(e.currentTarget.value)}
          onblur={(e) => (e.currentTarget.value = project.name)}
        />
      {:else}
        <span class="file">{i18n.t('bar.noFile')}</span>
      {/if}
    </div>

    <div class="actions">
      <div class="toggle" role="group" aria-label={i18n.t('lang.label')}>
        {#each LOCALES as locale (locale)}
          <button
            type="button"
            aria-pressed={i18n.locale === locale}
            onclick={() => i18n.set(locale)}>{locale.toUpperCase()}</button
          >
        {/each}
      </div>

      <div class="toggle" role="group" aria-label={i18n.t('theme.day')}>
        <button
          type="button"
          aria-pressed={theme.current === 'day'}
          onclick={() => theme.set('day')}>{i18n.t('theme.day')}</button
        >
        <button
          type="button"
          aria-pressed={theme.current === 'night'}
          onclick={() => theme.set('night')}>{i18n.t('theme.night')}</button
        >
      </div>

      <!--
        El inventario se abre siempre, también con la app vacía: tus cuentas
        existen aunque no haya ningún patrón abierto. Estaba metido dentro de la
        rama del patrón, y eso lo dejaba inalcanzable hasta convertir una imagen.
      -->
      {#if project.phase !== 'inventory' && project.phase !== 'print'}
        <button type="button" class="ghost" onclick={() => project.openInventory()}>
          {i18n.t('bar.inventory')}
        </button>
      {/if}

      {#if project.image && project.phase !== 'inventory' && project.phase !== 'print'}
        <button type="button" class="ghost" onclick={saveProject} disabled={saving}>
          {i18n.t('bar.save')}
        </button>
      {/if}

      {#if project.phase === 'inventory'}
        <button type="button" class="primary" onclick={() => project.closeInventory()}>
          {i18n.t('bar.done')}
        </button>
      {:else if project.phase === 'print'}
        <button type="button" class="ghost" onclick={() => project.closePrint()}>
          {i18n.t('bar.done')}
        </button>
        <button type="button" class="primary" onclick={() => window.print()}>
          {i18n.t('bar.printNow')}
        </button>
      {:else if project.phase === 'pattern'}
        <button type="button" class="ghost" onclick={() => project.backToCrop()}>
          {i18n.t('bar.back')}
        </button>
        <button type="button" class="ghost" class:armed={closing} onclick={requestClose}>
          {closing ? i18n.t('bar.closeConfirm') : i18n.t('bar.close')}
        </button>
        <button type="button" class="ghost" onclick={() => project.openPrint()}>
          {i18n.t('bar.print')}
        </button>
        <button type="button" class="primary" disabled={exporting} onclick={exportPng}>
          {exporting
            ? i18n.t('bar.exporting')
            : project.selectedBoard != null
              ? i18n.t('bar.exportBoard', { n: project.selectedBoard + 1 })
              : i18n.t('bar.export')}
        </button>
      {:else if project.image}
        <button type="button" class="ghost" class:armed={closing} onclick={requestClose}>
          {closing ? i18n.t('bar.closeConfirm') : i18n.t('bar.cancel')}
        </button>
        <button type="button" class="primary" onclick={() => project.convert()}>
          {i18n.t('bar.convert')}
        </button>
      {:else}
        <button type="button" class="primary" onclick={() => input?.click()}>
          {i18n.t('bar.open')}
        </button>
      {/if}
    </div>
  </header>

  {#if failure}
    <div class="error" role="alert">
      <div>
        <p class="et">{i18n.t(ERROR_KEYS[failure][0])}</p>
        <p class="ed">{projectError ?? i18n.t(ERROR_KEYS[failure][1])}</p>
      </div>
      <button
        type="button"
        class="ghost"
        onclick={() => {
          failure = null
          projectError = null
        }}
      >
        {i18n.t('error.dismiss')}
      </button>
    </div>
  {/if}

  <div class="body">
    {#if project.phase === 'inventory'}
      <Inventory />
    {:else if project.phase === 'print'}
      <PrintView />
    {:else}
      {#if project.image}
        <Rail />
      {/if}

    <main class="stage">
      <div class="stage-top">
        {#if project.phase === 'pattern' && project.pattern}
          <span>
            {project.isolated != null ? i18n.t('stage.isolated') : i18n.t('stage.pattern')}
          </span>
          {#if project.selectedBoard != null}
            <span class="k">{i18n.t('stage.board', { n: project.selectedBoard + 1 })}</span>
          {:else}
            <span class="k">
              {i18n.t('stage.size', {
                cols: project.pattern.cols,
                rows: project.pattern.rows,
              })}
            </span>
          {/if}
          {#if project.layout}
            <span aria-hidden="true">·</span>
            <span class="k">
              {i18n.t('stage.boardsMeta', {
                n: project.layout.total,
                x: project.layout.cols,
                y: project.layout.rows,
              })}
            </span>
          {/if}
          <span aria-hidden="true">·</span>
          <span class="k">{i18n.t('stage.colors', { n: project.counts.length })}</span>
          <!-- Lo que mide colgado, que es lo que pregunta quien lo enmarca. -->
          <span aria-hidden="true">·</span>
          <span class="k">{formatSize(project.size)}</span>
        {:else if project.image}
          <span>{i18n.t('stage.crop')}</span>
          <span class="k">{i18n.t('stage.shape', { x: project.boardsX, y: project.boardsY })}</span>
          <span aria-hidden="true">·</span>
          <span class="k">{i18n.t('stage.handles')}</span>
        {:else}
          <span>{dragging ? i18n.t('drop.hint') : i18n.t('bar.noFile')}</span>
        {/if}
      </div>

      {#if project.phase === 'pattern'}
        <PatternStage />
        <BoardStrip />
      {:else if project.image}
        <CropStage />
      {:else}
        <DropZone {dragging} onopen={() => input?.click()} />
      {/if}
    </main>

      {#if project.phase === 'pattern' && project.pattern}
        <BeadBox />
      {:else if project.pattern}
      <aside class="box">
        <div class="box-head">
          <span class="t">{i18n.t('preview.title')}</span>
          <span class="c">{i18n.t('preview.live')}</span>
        </div>
        <div class="preview"><PatternPreview /></div>
        <p class="note">{i18n.t('preview.note')}</p>
        <div class="box-foot">
          <span class="n">{project.total.toLocaleString()}</span>
          <span class="u">{i18n.t('preview.total')}</span>
        </div>
        </aside>
      {/if}
    {/if}
  </div>

  <input
    bind:this={input}
    type="file"
    accept="image/png,image/jpeg,image/gif,image/webp,application/json,.json"
    hidden
    onchange={(e) => {
      void open(e.currentTarget.files?.[0] ?? null)
      e.currentTarget.value = ''
    }}
  />
</div>

<style>
  /*
    La app ocupa la ventana y ni un píxel más: lo que sobra se desplaza *dentro*
    de cada panel. Con `min-height` el contenedor crecía con su contenido —la
    columna de ajustes es larga—, el lienzo medía ese alto inflado y se dibujaba
    enorme por debajo del pliegue. `dvh` además descuenta la barra del navegador
    en el móvil, que con `vh` deja cien píxeles fuera de la pantalla.
  */
  .app {
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--surface);
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 16px;
    background: var(--surface-2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }

  .name {
    font-family: var(--font-display);
    font-size: 16px;
    color: var(--on-dark);
  }

  .file {
    font-size: 12.5px;
    color: var(--on-dark-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /*
    Se lee como el texto que era y se edita como un campo: el recuadro aparece
    al pasar por encima, para no meter una caja de formulario en la cabecera.
  */
  input.title {
    width: 22ch;
    max-width: 34vw;
    padding: 3px 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-square);
    font: inherit;
    font-size: 12.5px;
  }

  input.title:hover {
    border-color: rgba(255, 255, 255, 0.12);
  }

  input.title:focus {
    outline: none;
    background: var(--surface-3);
    border-color: var(--accent);
    color: var(--on-dark);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle {
    display: flex;
    gap: 2px;
    background: var(--surface-3);
    border-radius: var(--radius-square);
    padding: 2px;
  }

  .toggle button {
    background: transparent;
    border: 0;
    color: var(--on-dark-2);
    font-size: 12px;
    padding: 4px 9px;
  }

  .toggle button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-ink);
  }

  button.primary {
    background: var(--accent);
    color: var(--accent-ink);
    border: 0;
    padding: 7px 15px;
    font-size: 13px;
    font-weight: 600;
  }

  button:disabled {
    opacity: 0.55;
    cursor: default;
  }

  /*
    Armado: el botón se ilumina para que se vea que el siguiente clic va en
    serio, sin sacar un diálogo por una pregunta de seis palabras.
  */
  button.ghost.armed {
    border-color: var(--accent);
    color: var(--on-dark);
  }

  button.ghost {
    background: transparent;
    border: 1px solid var(--surface-3);
    color: var(--on-dark-2);
    padding: 6px 13px;
    font-size: 13px;
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 16px;
    background: var(--warn-soft);
    border-bottom: 1px solid var(--warn);
    color: var(--on-dark);
  }

  .et {
    margin: 0;
    font-weight: 600;
    font-size: 13.5px;
  }

  .ed {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--on-dark-2);
  }

  .body {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    /* Sin esto, un lienzo alto no deja encoger a la mesa y desborda. */
    min-height: 0;
    background: var(--surface);
  }

  .stage-top {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 12px;
    color: var(--on-dark-2);
    background: var(--surface-2);
  }

  .stage-top .k {
    color: var(--on-dark);
  }

  .box {
    width: 300px;
    flex: 0 0 300px;
    background: var(--panel);
    border-left: 1px solid var(--edge);
    color: var(--ink);
    display: flex;
    flex-direction: column;
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

  .preview {
    padding: 14px;
    background: var(--surface);
    display: flex;
    justify-content: center;
  }

  .note {
    margin: 0;
    padding: 13px 15px;
    font-size: 12.5px;
    color: var(--ink-2);
    line-height: 1.6;
  }

  .box-foot {
    margin-top: auto;
    padding: 12px 15px;
    border-top: 1px solid var(--edge);
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .box-foot .n {
    font-family: var(--font-display);
    font-size: 22px;
  }

  .box-foot .u {
    font-size: 12.5px;
    color: var(--ink-3);
  }

  /*
    El escritorio son tres columnas y el móvil son tres pestañas con el mismo
    contenido. Las pestañas llegan con la hoja inferior; por ahora se apilan,
    que es lo honesto mientras esa pieza no exista.
  */
  @media (max-width: 900px) {
    .body {
      flex-direction: column;
    }

    .box {
      width: auto;
      flex: none;
      border-left: 0;
      border-top: 1px solid var(--edge);
    }
  }
</style>
