import { handlerBeranda } from './beranda'
import { handlerCari } from './cari'
import { handlerKeluarga } from './keluarga'
import { handlerPenduduk } from './penduduk'
import { handlerSesi } from './sesi'

export const handlers = [...handlerSesi, ...handlerBeranda, ...handlerCari, ...handlerPenduduk, ...handlerKeluarga]
