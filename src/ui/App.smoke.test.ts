// @vitest-environment jsdom

/**
 * Prueba de humo, no de interfaz.
 *
 * No comprueba cómo se ve nada: comprueba que la app monta sin reventar, que es
 * lo único que ni los tipos ni el build detectan. El resto de la interfaz se
 * mira con los ojos.
 */

import { flushSync, mount, unmount } from 'svelte'
import { beforeAll, expect, test } from 'vitest'

beforeAll(() => {
  // jsdom no trae matchMedia, y el tema lo consulta al arrancar.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia

  // Node 25 expone un `localStorage` propio a medio hacer que tapa al de jsdom.
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
  })

  // jsdom dice que el navegador está en inglés; aquí se prueba el idioma por defecto.
  localStorage.setItem('pixela:locale', 'es')
})

test('arranca y enseña la placa vacía', async () => {
  const { default: App } = await import('./App.svelte')

  const target = document.createElement('div')
  document.body.appendChild(target)

  const app = mount(App, { target })
  flushSync()

  expect(target.textContent).toContain('Pixela')
  expect(target.textContent).toContain('Arrastra una imagen aquí')
  // Sin imagen no hay recorte, ni previsualización, ni acento derivado.
  expect(target.textContent).not.toContain('Recorte')

  unmount(app)
  target.remove()
})
