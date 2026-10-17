import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Deterministic dates: every test runs in Europe/Paris unless it passes an explicit timezone.
process.env.TZ = 'Europe/Paris'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/app/**', 'src/**/*.test.{ts,tsx}'],
    },
  },
})
