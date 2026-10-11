import { handlerArsip } from './arsip'
import { handlerBeranda } from './beranda'
import { handlerCari } from './cari'
import { handlerImpor } from './impor'
import { handlerJenisSurat } from './jenis-surat'
import { handlerKeluarga } from './keluarga'
import { handlerKeluargaTulis } from './keluarga-tulis'
import { handlerLaporan } from './laporan'
import { handlerMutasi } from './mutasi'
import { handlerNotifikasi } from './notifikasi'
import { handlerPenduduk } from './penduduk'
import { handlerPendudukTulis } from './penduduk-tulis'
import { handlerSesi } from './sesi'
import { handlerStatistik } from './statistik'
import { handlerSurat } from './surat'
import { handlerSuratAksi } from './surat-aksi'
import { handlerSuratLoket } from './surat-loket'

export const handlers = [
  ...handlerArsip,
  ...handlerSesi, ...handlerBeranda, ...handlerCari, ...handlerPenduduk, ...handlerPendudukTulis, ...handlerKeluarga,
  ...handlerKeluargaTulis, ...handlerMutasi, ...handlerStatistik, ...handlerLaporan, ...handlerImpor, ...handlerJenisSurat,
  ...handlerSuratLoket, ...handlerSurat, ...handlerSuratAksi,
  ...handlerNotifikasi,
]
