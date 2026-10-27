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
    // Batas paket (SPEC-V0.3 §4): kontrak hanya mengimpor berkasnya sendiri, zod, dan css-tree.
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-aria*', '@tanstack/*'], message: 'Paket kontrak tidak boleh memakai React atau pustaka UI.' },
            { group: ['msw', 'msw/*'], message: 'Paket kontrak tidak boleh memakai MSW.' },
            { group: ['@/*'], message: 'Paket kontrak tidak boleh memakai alias web. Pakai jalur relatif.' },
            { group: ['@sinfodes/demo', '@sinfodes/demo/*'], message: 'Kontrak tidak boleh bergantung pada paket demo.' },
            { group: ['node:*'], message: 'Paket kontrak tidak boleh memakai API Node.' },
          ],
        },
      ],
    },
  },
])
