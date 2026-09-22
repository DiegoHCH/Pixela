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

  // El inventario se alcanza desde el primer momento: tus cuentas existen
  // aunque no haya patrón. Estuvo escondido tras «convertir una imagen», y
  // esto es lo que lo habría dicho.
  expect(target.textContent).toContain('Mis cuentas')

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
  // El patrón se calcula fuera del hilo —o en local, aquí— así que hay que
  // esperarlo: `flushSync` despacha el encargo y `ready` espera la respuesta.
  flushSync()
  await project.ready()
  flushSync()

  expect(target.textContent).toContain('Recorte')
  expect(target.textContent).toContain('Convertir a patrón')
  // El nombre ya no es una etiqueta: es el campo que nombra lo que exportas.
  const title = target.querySelector<HTMLInputElement>('input.title')
  expect(title?.value).toBe('prueba')

  project.convert()
  flushSync()

  expect(target.textContent).toContain('Caja de cuentas')
  expect(target.textContent).toContain('Placas')
  expect(target.textContent).toContain('Lista de la compra')
  expect(target.textContent).toMatch(/\d+ bolsas de \d+ cuentas/)
  // El patrón tiene cuentas de verdad contadas, no un cero de relleno.
  expect(project.total).toBe(58 * 29)
  expect(target.textContent).toContain(project.total.toLocaleString())

  // La vista de imprimir saca una hoja por placa, con su leyenda.
  const boton = (re: RegExp) =>
    [...target.querySelectorAll('button')].find((b) => re.test(b.textContent ?? ''))
  boton(/^Imprimir$/)!.click()
  flushSync()
  expect(project.phase).toBe('print')
  expect(target.textContent).toContain('Placa 1 de 2')
  expect(target.textContent).toContain('Placa 2 de 2')
  expect(target.textContent).toContain('Leyenda')
  // Las columnas de la segunda placa son las del montaje, no las suyas.
  expect(target.textContent).toContain('Columnas 30–58')

  boton(/^Listo$/)!.click()
  flushSync()
  expect(project.phase).toBe('pattern')

  // Desde el patrón se vuelve al inicio con el botón, que es lo que faltaba:
  // antes había que recargar la página para quitarse la imagen de encima.
  const cerrar = () =>
    [...target.querySelectorAll('button')].find((b) => /^(Cerrar|¿Cerrar)/.test(b.textContent ?? ''))
  cerrar()!.click()
  flushSync()
  // Un solo clic pregunta y no cierra: el patrón sigue ahí.
  expect(project.image).not.toBeNull()
  expect(cerrar()!.textContent?.trim()).toBe('¿Cerrar sin guardar?')

  cerrar()!.click()
  flushSync()
  expect(project.image).toBeNull()
  expect(target.textContent).toContain('Arrastra una imagen aquí')

  unmount(app)
  target.remove()
})

test('el inventario se abre y se cierra desde la app vacía', async () => {
  const { default: App } = await import('./App.svelte')
  const { project } = await import('../state/project.svelte')

  const target = document.createElement('div')
  document.body.appendChild(target)
  const app = mount(App, { target })
  flushSync()

  project.openInventory()
  flushSync()
  expect(project.phase).toBe('inventory')
  expect(target.textContent).toContain('Catálogo Artkal S')
  expect(target.textContent).toContain('colores marcados')
  // La rejilla trae el catálogo entero, no sólo lo del cajón.
  expect(target.textContent).toContain('S100')

  project.closeInventory()
  flushSync()
  expect(project.phase).toBe('crop')
  expect(target.textContent).toContain('Arrastra una imagen aquí')

  unmount(app)
  target.remove()
})
