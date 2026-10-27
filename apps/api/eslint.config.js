import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['node_modules']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    // Server tidak memakai UI, MSW, maupun alias web. Hanya test/konformansi yang boleh memanggil lapisan API web.
    files: ['src/**/*.ts', 'skrip/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-aria*', '@tanstack/*'], message: 'Server tidak boleh memakai React atau pustaka UI.' },
            { group: ['msw', 'msw/*'], message: 'Server tidak boleh memakai MSW.' },
            { group: ['@/*'], message: 'Server tidak boleh memakai alias web. Impor lewat @sinfodes/kontrak/...' },
          ],
        },
      ],
    },
  },
])
