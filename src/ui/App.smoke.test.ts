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

  // Tampoco trae ResizeObserver, que es lo que usa `bind:clientWidth`.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

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

test('con una imagen abierta llega hasta el patrón', async () => {
  const { default: App } = await import('./App.svelte')
  const { project } = await import('../state/project.svelte')

  const target = document.createElement('div')
  document.body.appendChild(target)
  const app = mount(App, { target })

  // Una imagen de mentira: lo que se comprueba es el cableado de las pantallas.
  const width = 240
  const height = 120
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = (i % width) + 10
    data[i * 4 + 1] = 80
    data[i * 4 + 2] = 200
    data[i * 4 + 3] = 255
  }
  project.open({
    name: 'prueba.png',
    width,
    height,
    sourceWidth: width,
    sourceHeight: height,
    pixels: { width, height, data },
    source: document.createElement('canvas'),
  })
  flushSync()

  expect(target.textContent).toContain('Recorte')
  expect(target.textContent).toContain('Convertir a patrón')
  expect(target.textContent).toContain('prueba.png')

  project.convert()
  flushSync()

  expect(target.textContent).toContain('Caja de cuentas')
  expect(target.textContent).toContain('Placas')
  expect(target.textContent).toContain('Lista de la compra')
  expect(target.textContent).toMatch(/\d+ bolsas de \d+ cuentas/)
  // El patrón tiene cuentas de verdad contadas, no un cero de relleno.
  expect(project.total).toBe(58 * 29)
  expect(target.textContent).toContain(project.total.toLocaleString())

  project.close()
  unmount(app)
  target.remove()
})
