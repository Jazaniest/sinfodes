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
    // Batas paket (SPEC-V0.3 §4): demo hanya mengimpor berkasnya sendiri dan @sinfodes/kontrak.
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-aria*', '@tanstack/*'], message: 'Paket demo tidak boleh memakai React atau pustaka UI.' },
            { group: ['msw', 'msw/*'], message: 'Paket demo tidak boleh memakai MSW.' },
            { group: ['@/*'], message: 'Paket demo tidak boleh memakai alias web. Impor domain lewat @sinfodes/kontrak/...' },
            { group: ['node:*'], message: 'Paket demo tidak boleh memakai API Node.' },
          ],
        },
      ],
    },
  },
])
