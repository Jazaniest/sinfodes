import { handlerBeranda } from './beranda'
import { handlerCari } from './cari'
import { handlerKeluarga } from './keluarga'
import { handlerKeluargaTulis } from './keluarga-tulis'
import { handlerMutasi } from './mutasi'
import { handlerPenduduk } from './penduduk'
import { handlerPendudukTulis } from './penduduk-tulis'
import { handlerSesi } from './sesi'

export const handlers = [
  ...handlerSesi, ...handlerBeranda, ...handlerCari, ...handlerPenduduk, ...handlerPendudukTulis, ...handlerKeluarga,
  ...handlerKeluargaTulis, ...handlerMutasi,
]
