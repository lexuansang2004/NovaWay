import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts: unit tests need the '@' alias but not the
// tailwindcss/react plugins, and must stay out of Playwright's e2e/ dir
// (e2e/*.spec.ts uses @playwright/test's `test`, not vitest's).
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
