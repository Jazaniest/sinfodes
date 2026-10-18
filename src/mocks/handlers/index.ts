import { handlerAksesSinfodes } from './akses-sinfodes'
import { handlerAlamat } from './alamat'
import { handlerArsip } from './arsip'
import { handlerBansos } from './bansos'
import { handlerBeranda } from './beranda'
import { handlerBuku } from './buku'
import { handlerCari } from './cari'
import { handlerImpor } from './impor'
import { handlerInduk } from './induk'
import { handlerKabupaten } from './kabupaten'
import { handlerKabupatenSesi } from './kabupaten-sesi'
import { handlerPenggunaKabupaten } from './kabupaten-pengguna'
import { handlerJenisSurat } from './jenis-surat'
import { handlerKeluarga } from './keluarga'
import { handlerKesehatan } from './kesehatan'
import { handlerKeluargaTulis } from './keluarga-tulis'
import { handlerKonsol } from './konsol'
import { handlerKeuangan } from './keuangan'
import { handlerLaporan } from './laporan'
import { handlerMutasi } from './mutasi'
import { handlerNotifikasi } from './notifikasi'
import { handlerPembangunan } from './pembangunan'
import { handlerPengaduan } from './pengaduan'
import { handlerPengaturan } from './pengaturan'
import { handlerPenggunaDesa } from './pengaturan-pengguna'
import { handlerPenduduk } from './penduduk'
import { handlerPublik } from './publik'
import { handlerPublikHalaman } from './publik-halaman'
import { handlerPendudukTulis } from './penduduk-tulis'
import { handlerSesi } from './sesi'
import { handlerStatistik } from './statistik'
import { handlerSurat } from './surat'
import { handlerSuratAksi } from './surat-aksi'
import { handlerSuratLoket } from './surat-loket'
import { handlerTataKelola } from './tata-kelola'
import { handlerWarga } from './warga'
import { handlerWargaAjukan } from './warga-ajukan'
import { handlerWargaKeluarga } from './warga-keluarga'
import { handlerWargaPengaduan } from './warga-pengaduan'
import { handlerWargaSesi } from './warga-sesi'
import { handlerWebsite } from './website'

export const handlers = [
  ...handlerAlamat, ...handlerInduk, ...handlerArsip,
  ...handlerSesi, ...handlerBeranda, ...handlerCari, ...handlerPenduduk, ...handlerPendudukTulis, ...handlerKeluarga,
  ...handlerKeluargaTulis, ...handlerMutasi, ...handlerStatistik, ...handlerLaporan, ...handlerImpor, ...handlerJenisSurat,
  ...handlerSuratLoket, ...handlerSurat, ...handlerSuratAksi,
  ...handlerNotifikasi, ...handlerPengaduan, ...handlerBansos, ...handlerKesehatan,
  ...handlerKeuangan, ...handlerPembangunan, ...handlerTataKelola,
  ...handlerPengaturan, ...handlerPenggunaDesa, ...handlerAksesSinfodes, ...handlerWebsite, ...handlerBuku,
  ...handlerWargaSesi, ...handlerWarga, ...handlerWargaAjukan, ...handlerWargaKeluarga, ...handlerWargaPengaduan,
  ...handlerPublik, ...handlerPublikHalaman, ...handlerKonsol, ...handlerKabupatenSesi, ...handlerKabupaten, ...handlerPenggunaKabupaten,
]
