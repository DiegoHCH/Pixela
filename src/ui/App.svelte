<script lang="ts">
  import { LOCALES, i18n } from '../i18n/index.svelte'
  import { theme } from '../state/theme.svelte'

  const t = (key: Parameters<typeof i18n.t>[0]) => i18n.t(key)
</script>

<!--
  Pantalla de espera, no la app. El plan es explícito: el pipeline puro y sus
  tests van antes que la primera pantalla. Esto sólo demuestra que los tokens,
  los dos temas y los dos idiomas están enchufados de verdad desde el principio.
-->
<main>
  <header>
    <h1>{t('app.name')}</h1>
    <p class="tagline">{t('app.tagline')}</p>
  </header>

  <section class="panel">
    <h2>{t('app.state.title')}</h2>
    <p>{t('app.state.body')}</p>
  </section>

  <footer>
    <div class="group" role="group" aria-label={t('theme.day') + ' / ' + t('theme.night')}>
      <button
        type="button"
        aria-pressed={theme.current === 'day'}
        onclick={() => theme.set('day')}>{t('theme.day')}</button
      >
      <button
        type="button"
        aria-pressed={theme.current === 'night'}
        onclick={() => theme.set('night')}>{t('theme.night')}</button
      >
      {#if !theme.followsSystem}
        <button type="button" class="ghost" onclick={() => theme.clear()}>
          {t('theme.system')}
        </button>
      {/if}
    </div>

    <div class="group" role="group" aria-label={t('lang.label')}>
      {#each LOCALES as locale (locale)}
        <button
          type="button"
          aria-pressed={i18n.locale === locale}
          onclick={() => i18n.set(locale)}>{locale.toUpperCase()}</button
        >
      {/each}
    </div>
  </footer>
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 48px 28px;
    max-width: 640px;
    margin: 0 auto;
  }

  h1 {
    font-size: 30px;
    color: var(--on-dark);
  }

  .tagline {
    margin: 2px 0 0;
    color: var(--on-dark-2);
  }

  .panel {
    background: var(--panel);
    border: 1px solid var(--edge);
    border-radius: var(--radius-square);
    box-shadow: var(--shadow-app);
    padding: 20px 22px;
    color: var(--ink-2);
  }

  .panel h2 {
    font-size: 17px;
    color: var(--ink);
    margin-bottom: 6px;
  }

  .panel p {
    margin: 0;
  }

  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: auto;
  }

  .group {
    display: flex;
    gap: 6px;
  }

  button {
    background: var(--surface-3);
    color: var(--on-dark);
    border: 1px solid transparent;
    padding: 6px 14px;
  }

  button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-ink);
  }

  button.ghost {
    background: transparent;
    border-color: var(--surface-3);
    color: var(--on-dark-2);
  }
</style>
