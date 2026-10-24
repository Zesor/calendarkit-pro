import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Deterministic dates: every test runs in Europe/Paris unless it passes an explicit timezone.
process.env.TZ = 'Europe/Paris'

export default defineConfig({
  plugins: [react()],
  // The React adapter imports the engine by its public name, like consumers do.
  resolve: { alias: { 'calendarkit-pro/core': fileURLToPath(new URL('./src/core/index.ts', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['src/test/fakeToday.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/app/**', 'src/**/*.test.{ts,tsx}'],
      // The pure core carries the date/recurrence logic: keep it thoroughly tested.
      thresholds: { 'src/core/**': { lines: 90 } },
    },
  },
})
