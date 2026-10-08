import { handlerPenduduk } from './penduduk'
import { handlerSesi } from './sesi'

export const handlers = [...handlerSesi, ...handlerPenduduk]
