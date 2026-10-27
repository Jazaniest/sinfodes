/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    // Urutan penting: `@/domain` (paket kontrak, SPEC-V0.3 §4) harus dicocokkan sebelum `@`.
    alias: [
      { find: '@/domain', replacement: fileURLToPath(new URL('../../packages/kontrak/src', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  // Mode nyata (`--mode nyata`, VITE_DEMO=false): /api diteruskan ke server API lokal. `Host` asli sengaja dibiarkan
  // (changeOrigin false) karena server menentukan desa dari Host. Mode demo tidak memakai proksi: MSW menjawab di peramban.
  server:
    mode === 'nyata'
      ? { proxy: { '/api': { target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3001', changeOrigin: false } } }
      : undefined,
  build: {
    // hub-demo.html: penyimpanan demo bersama untuk semua subdomain (SPEC-V0.2 §4.6).
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        hub: fileURLToPath(new URL('./hub-demo.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // Uji layar dengan pencarian dan klik bisa melewati 5 dtk bawaan saat seluruh suite berjalan paralel.
    testTimeout: 15_000,
  },
}))
