import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * La app vive en una ruta y no en la raíz: GitHub Pages sirve los proyectos en
 * `usuario.github.io/<repo>/`. De aquí salen `base`, el ámbito del service
 * worker y el `start_url` del manifiesto, y los tres tienen que decir lo mismo
 * o la app instalada arranca en una página que no existe.
 */
const BASE = '/Pixela/'

export default defineConfig({
  base: BASE,
  plugins: [
    svelte(),
    VitePWA({
      // En las pruebas no hace falta un service worker, y genera ruido.
      disable: !!process.env.VITEST,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icono.svg'],
      manifest: {
        name: 'Pixela — de imagen a patrón',
        short_name: 'Pixela',
        description:
          'De imagen a patrón de hama beads. Sin servidor: la imagen nunca sale de tu equipo.',
        lang: 'es',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        /*
          La mesa es siempre lo más oscuro de la pantalla, y eso incluye el
          arranque: con un fondo claro, instalar la app daría un fogonazo
          blanco antes de la primera placa.
        */
        background_color: '#20282A',
        theme_color: '#20282A',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icono-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            // Android recorta el icono a la forma del sistema: este trae el
            // dibujo dentro del 80 % central para que no le corte una cuenta.
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // El worker del pipeline entra en la precarga: sin él la app abre pero
        // no convierte, que es peor que no abrir.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    /**
     * Al correr los tests, Svelte se resuelve por su versión de servidor y
     * `mount()` no existe. Esto lo devuelve a la del navegador, que es donde
     * vive la app.
     */
    conditions: process.env.VITEST ? ['browser'] : undefined,
  },
  test: {
    /*
      jsdom y no `node`: estos módulos son de Svelte, y en `node` el plugin los
      compila a su variante de servidor, donde `$effect` no hace nada en
      silencio. Con eso, las pruebas del estado no probaban el código que corre
      en el navegador — lo dijo el despacho al worker, que nunca se ejecutaba.
    */
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
