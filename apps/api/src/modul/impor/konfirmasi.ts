import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { cocokkanKolom, periksaPemetaan } from '@sinfodes/kontrak/impor/kolom'
import { periksaImpor, type BarisSiap } from '@sinfodes/kontrak/impor/periksa'
import { hasilImporSchema, konfirmasiImporSchema, type HasilImpor, type LaporanImpor } from '@sinfodes/kontrak/impor/schema'
import { tanggalTerbitDariNomorKk } from '@sinfodes/kontrak/impor/terbit'
import { randomUUID } from 'node:crypto'
import { bacaIstilahWilayah, daftarDusunDesa } from '../../basisdata/desa'
import { pelanggaranUnik } from '../../basisdata/galat-pg'
import { GalatApp } from '../../galat'
import { galatIsian } from '../../galat-isian'
import { ruang } from '../../kripto/ruang'
import { catatAktivitas, pelakuKontrak } from '../../riwayat/catat'
import type { KonteksTulis } from '../penduduk/layanan-tulis'
import {
  INDEKS_KK, INDEKS_NIK, sisipKeluargaBanyak, sisipPendudukBanyak, type BarisKeluargaBaru, type BarisPendudukBaru,
} from '../penduduk/repositori-tulis'
import { MASA_SESI_IMPOR_MS, angkaTerdaftar } from './layanan'
import { kunciSesiImpor, tandaiSesiSelesai } from './repositori'
import { bukaIsiImpor } from './sandi'

const PESAN_SESI_TIDAK_ADA = 'Data impor tidak ditemukan. Unggah ulang berkasnya.'
const PESAN_BENTROK = 'Data berubah saat impor berjalan. Periksa ulang berkasnya.'

/**
 * Menjalankan impor yang sudah diperiksa (SPEC-V0.2 §6.8): semua KK dan penduduk, satu aktivitas, dan penandaan sesi selesai
 * dalam satu transaksi permintaan (rencana 8E3 Ruling 7). Sesi dikunci `FOR UPDATE` lebih dulu lalu `selesai_pada` dibaca
 * ulang, jadi dua konfirmasi serentak berurutan dan yang kedua dijawab 409. Berkas diperiksa ulang dengan data terkini:
 * NIK atau nomor KK bisa saja terdaftar sejak berkas diunggah. Impor hanya membuat KK baru, tidak pernah mengunci KK yang ada.
 */
export async function konfirmasiImpor(k: KonteksTulis, id: string, mentah: unknown): Promise<HasilImpor> {
  const sesi = await kunciSesiImpor(k.db, id)
  if (!sesi || sesi.dibuatPada.getTime() < k.sekarang.getTime() - MASA_SESI_IMPOR_MS) throw new GalatApp('NOT_FOUND', PESAN_SESI_TIDAK_ADA, 404)
  if (sesi.selesaiPada !== null || sesi.isi === null) throw new GalatApp('CONFLICT', 'Impor ini sudah dijalankan.', 409)
  const isian = konfirmasiImporSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const { pemetaan, perbaikan, lewati } = isian.data

  const tabel = bukaIsiImpor(k.penyandi, k.desa.id, sesi.isi)
  const salahPemetaan = periksaPemetaan(pemetaan)
  if (pemetaan.length !== tabel.kolom.length || salahPemetaan.kurang.length > 0 || salahPemetaan.ganda.length > 0) {
    throw new GalatApp('VALIDATION', 'Pemetaan kolom belum lengkap.', 422)
  }

  const [dusun, istilah] = await Promise.all([daftarDusunDesa(k.db), bacaIstilahWilayah(k.db, k.desa.id)])
  const ctx = { hariIni: k.sekarang, dusun, istilah }
  const laporan: LaporanImpor = {
    id: sesi.id,
    namaBerkas: sesi.namaBerkas,
    dibuatPada: waktuIsoWib(sesi.dibuatPada),
    kolom: tabel.kolom.map((judul) => ({ judul, field: cocokkanKolom(judul) })),
    baris: tabel.baris,
    ...(await angkaTerdaftar(k.db, k.penyandi, k.desa.id, tabel.baris)),
  }
  const hasil = periksaImpor(laporan, { pemetaan, perbaikan, lewati }, ctx)
  const salah = hasil.baris.filter((b) => !b.dilewati && b.masalah.length > 0)
  if (salah.length > 0) {
    throw new GalatApp('VALIDATION', `${salah.length} baris masih bermasalah.`, 422, Object.fromEntries(salah.map((b) => [`baris.${b.nomor}`, b.masalah[0].pesan])))
  }
  const siap = hasil.baris.flatMap((b) => (b.siap ? [b.siap] : []))
  if (siap.length === 0) throw new GalatApp('VALIDATION', 'Tidak ada baris yang siap diimpor.', 422)

  const perKk = new Map<string, BarisSiap[]>()
  for (const b of siap) perKk.set(b.nomorKk, [...(perKk.get(b.nomorKk) ?? []), b])
  const barisKk: BarisKeluargaBaru[] = []
  const barisPenduduk: BarisPendudukBaru[] = []
  for (const [nomorKk, anggota] of perKk) {
    // Kepala keluarga lebih dulu; urutan berkas dipertahankan di antara anggota lain (pengurutan stabil).
    const urut = [...anggota].sort((a, b) => Number(b.biodata.hubunganKeluarga === 'Kepala Keluarga') - Number(a.biodata.hubunganKeluarga === 'Kepala Keluarga'))
    const { wilayah } = urut[0]
    const kkId = `kk_${randomUUID()}`
    const pendudukId = urut.map(() => `pdk_${randomUUID()}`)
    barisKk.push({
      id: kkId,
      desaId: k.desa.id,
      nomorKkSandi: k.penyandi.sandikan(nomorKk, ruang.nomorKk(k.desa.id)),
      nomorKkIndeks: k.penyandi.indeks(nomorKk, ruang.nomorKk(k.desa.id)),
      kepalaKeluargaId: pendudukId[0],
      dusunId: wilayah.dusunId,
      rw: wilayah.rw,
      rt: wilayah.rt,
      tanggalTerbit: tanggalTerbitDariNomorKk(nomorKk, k.sekarang),
    })
    urut.forEach((b, i) => {
      const { nik, telepon, ...bio } = b.biodata
      barisPenduduk.push({
        ...bio,
        id: pendudukId[i],
        desaId: k.desa.id,
        nikSandi: nik === null ? null : k.penyandi.sandikan(nik, ruang.nik(k.desa.id)),
        nikIndeks: nik === null ? null : k.penyandi.indeks(nik, ruang.nik(k.desa.id)),
        teleponSandi: telepon === null ? null : k.penyandi.sandikan(telepon, ruang.telepon(k.desa.id)),
        keluargaId: kkId,
        dusunId: wilayah.dusunId,
        rw: wilayah.rw,
        rt: wilayah.rt,
        statusDasar: 'Hidup',
        urutanKk: i,
        dibuatPada: k.sekarang,
        diubahPada: k.sekarang,
      })
    })
  }

  try {
    // Kunci asing kepala keluarga ditunda sampai transaksi selesai, jadi KK boleh lebih dulu daripada kepalanya.
    await sisipKeluargaBanyak(k.db, barisKk)
    await sisipPendudukBanyak(k.db, barisPenduduk)
  } catch (e) {
    // Operator lain mendaftarkan NIK atau nomor KK yang sama di antara pemeriksaan dan sisip: seluruh impor batal.
    if (pelanggaranUnik(e, INDEKS_NIK) || pelanggaranUnik(e, INDEKS_KK)) throw new GalatApp('CONFLICT', PESAN_BENTROK, 409)
    throw e
  }
  await catatAktivitas(k.db, {
    desaId: k.desa.id, dusunId: null, waktu: waktuIsoWib(k.sekarang), jenis: 'penduduk-impor',
    ringkasan: `Impor penduduk · ${siap.length} penduduk, ${perKk.size} KK (${sesi.namaBerkas})`, oleh: pelakuKontrak(k.pelaku), rujukan: null,
  })
  await tandaiSesiSelesai(k.db, sesi.id, k.sekarang)

  // Alasan baris yang dilewati diambil dari pemeriksaan tanpa daftar lewati, untuk "Unduh laporan".
  const tanpaLewati = periksaImpor(laporan, { pemetaan, perbaikan, lewati: [] }, ctx)
  const alasan = (nomor: number): string => tanpaLewati.baris.find((b) => b.nomor === nomor)?.masalah[0]?.pesan ?? 'Dilewati pengguna'
  return hasilImporSchema.parse({
    penduduk: siap.length,
    keluarga: perKk.size,
    dilewati: hasil.dilewati,
    laporan: hasil.baris.map((b) =>
      b.siap
        ? { nomor: b.nomor, status: 'ditambahkan' as const, keterangan: b.siap.biodata.nama }
        : { nomor: b.nomor, status: 'dilewati' as const, keterangan: alasan(b.nomor) },
    ),
  })
}
