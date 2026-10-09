import { handlerBeranda } from './beranda'
import { handlerCari } from './cari'
import { handlerImpor } from './impor'
import { handlerKeluarga } from './keluarga'
import { handlerKeluargaTulis } from './keluarga-tulis'
import { handlerLaporan } from './laporan'
import { handlerMutasi } from './mutasi'
import { handlerPenduduk } from './penduduk'
import { handlerPendudukTulis } from './penduduk-tulis'
import { handlerSesi } from './sesi'
import { handlerStatistik } from './statistik'
import { handlerSurat } from './surat'
import { handlerSuratAksi } from './surat-aksi'

export const handlers = [
  ...handlerSesi, ...handlerBeranda, ...handlerCari, ...handlerPenduduk, ...handlerPendudukTulis, ...handlerKeluarga,
  ...handlerKeluargaTulis, ...handlerMutasi, ...handlerStatistik, ...handlerLaporan, ...handlerImpor, ...handlerSurat, ...handlerSuratAksi,
]
