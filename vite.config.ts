import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte()],
  test: {
    // El pipeline es aritmética pura: no hace falta DOM para probarlo.
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
