import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    /**
     * Al correr los tests, Svelte se resuelve por su versión de servidor y
     * `mount()` no existe. Esto lo devuelve a la del navegador, que es donde
     * vive la app.
     */
    conditions: process.env.VITEST ? ['browser'] : undefined,
  },
  test: {
    // El pipeline es aritmética pura: no hace falta DOM para probarlo. La
    // prueba de humo de la interfaz pide su entorno en su propio archivo.
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
