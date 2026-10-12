import { handlerArsip } from './arsip'
import { handlerBansos } from './bansos'
import { handlerBeranda } from './beranda'
import { handlerBuku } from './buku'
import { handlerCari } from './cari'
import { handlerImpor } from './impor'
import { handlerJenisSurat } from './jenis-surat'
import { handlerKeluarga } from './keluarga'
import { handlerKesehatan } from './kesehatan'
import { handlerKeluargaTulis } from './keluarga-tulis'
import { handlerKeuangan } from './keuangan'
import { handlerLaporan } from './laporan'
import { handlerMutasi } from './mutasi'
import { handlerNotifikasi } from './notifikasi'
import { handlerPembangunan } from './pembangunan'
import { handlerPengaduan } from './pengaduan'
import { handlerPengaturan } from './pengaturan'
import { handlerPenggunaDesa } from './pengaturan-pengguna'
import { handlerPenduduk } from './penduduk'
import { handlerPendudukTulis } from './penduduk-tulis'
import { handlerSesi } from './sesi'
import { handlerStatistik } from './statistik'
import { handlerSurat } from './surat'
import { handlerSuratAksi } from './surat-aksi'
import { handlerSuratLoket } from './surat-loket'
import { handlerTataKelola } from './tata-kelola'
import { handlerWebsite } from './website'

export const handlers = [
  ...handlerArsip,
  ...handlerSesi, ...handlerBeranda, ...handlerCari, ...handlerPenduduk, ...handlerPendudukTulis, ...handlerKeluarga,
  ...handlerKeluargaTulis, ...handlerMutasi, ...handlerStatistik, ...handlerLaporan, ...handlerImpor, ...handlerJenisSurat,
  ...handlerSuratLoket, ...handlerSurat, ...handlerSuratAksi,
  ...handlerNotifikasi, ...handlerPengaduan, ...handlerBansos, ...handlerKesehatan,
  ...handlerKeuangan, ...handlerPembangunan, ...handlerTataKelola,
  ...handlerPengaturan, ...handlerPenggunaDesa, ...handlerWebsite, ...handlerBuku,
]
