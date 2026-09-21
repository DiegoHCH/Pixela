<script lang="ts">
  import { i18n } from '../i18n/index.svelte'
  import { MAX_BOARDS_X, MAX_BOARDS_Y, project } from '../state/project.svelte'

  /**
   * Eliges la forma del montaje, y de ahí salen tanto la proporción del recorte
   * como el tamaño en cuentas. No es un selector de proporciones disfrazado:
   * es la pregunta real —«¿qué cabe en lo que tengo?»— hecha en placas.
   */
  const cells = $derived(
    Array.from({ length: MAX_BOARDS_Y }, (_, row) =>
      Array.from({ length: MAX_BOARDS_X }, (_, col) => ({ x: col + 1, y: row + 1 })),
    ).flat(),
  )
</script>

<div class="picker" style:--cols={MAX_BOARDS_X}>
  {#each cells as cell (`${cell.x}x${cell.y}`)}
    <button
      type="button"
      class:on={cell.x <= project.boardsX && cell.y <= project.boardsY}
      aria-pressed={cell.x === project.boardsX && cell.y === project.boardsY}
      aria-label={i18n.t('stage.shape', { x: cell.x, y: cell.y })}
      onclick={() => project.setShape(cell.x, cell.y)}
    ></button>
  {/each}
</div>

<style>
  .picker {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 3px;
  }

  button {
    aspect-ratio: 1;
    padding: 0;
    border: 1px solid var(--edge);
    /* Las placas son cuadradas: el radio de estructura y ningún otro. */
    border-radius: var(--radius-square);
    background: var(--panel-2);
  }

  button.on {
    background: var(--accent);
    border-color: var(--accent);
  }

  button:hover:not(.on) {
    background: var(--panel-3);
  }
</style>
