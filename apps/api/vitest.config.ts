import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Urutan penting: `@/domain` (paket kontrak) sebelum `@` (web). `@` hanya dipakai test/konformansi.
    alias: [
      { find: '@/domain', replacement: fileURLToPath(new URL('../../packages/kontrak/src', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('../web/src', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'skrip/**/*.test.ts', 'test/**/*.test.ts'],
    restoreMocks: true,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ['./test/siapkan-global.ts'],
  },
})
