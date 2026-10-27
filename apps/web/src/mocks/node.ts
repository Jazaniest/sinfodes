import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** Server MSW untuk uji di Node. Jangan diimpor dari kode aplikasi. */
export const serverUji = setupServer(...handlers)
