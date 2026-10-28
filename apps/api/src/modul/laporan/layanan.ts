import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import {
  hasilTerapkanSchema, laporanDataSchema, tolakLaporanSchema, type FilterLaporan, type IsiLaporan, type LaporanData,
} from '@sinfodes/kontrak/laporan/schema'
import { ubahPendudukSchema } from '@sinfodes/kontrak/penduduk/masukan'
import { LABEL_FIELD } from '@sinfodes/kontrak/penduduk/riwayat'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { galatIsian } from '../../galat-isian'
import type { Penyandi } from '../../kripto/penyandi'
import type { Pelaku } from '../../lapisan/konteks'
import { catatAktivitas, pelakuKontrak } from '../../riwayat/catat'
import { type KonteksTulis, terapkanPerubahan } from '../penduduk/layanan-tulis'
import { bacaPendudukSatu } from '../penduduk/repositori'
import { bacaLaporanDaftar, bacaLaporanSatu, kunciLaporan, tandaiLaporan, type RekamLaporan } from './repositori'
import { bukaIsiLaporan } from './sandi'

export type KonteksLaporan = { db: Db; penyandi: Penyandi; pelaku: Pelaku }

export const PESAN_LAPORAN_TIDAK_ADA = 'Laporan tidak ditemukan.'
const SUDAH_DITANGANI = 'Laporan ini sudah ditangani.'

/** Baris basis data menjadi `LaporanData` kontrak: nilai telepon dibuka dari sandi, bentuk diperiksa skema (gagal tertutup). */
export const bentukLaporan = (b: RekamLaporan, penyandi: Penyandi): LaporanData =>
  laporanDataSchema.parse({
    id: b.id,
    desaId: b.desaId,
    dusunId: b.dusunId,
    dibuatPada: waktuIsoWib(b.dibuatPada),
    pelapor: { pendudukId: b.pelaporPendudukId, nama: b.pelaporNama },
    status: b.status,
    ditangani:
      b.ditanganiPada === null || b.ditanganiOlehId === null || b.ditanganiOlehNama === null
        ? null
        : { oleh: { id: b.ditanganiOlehId, nama: b.ditanganiOlehNama }, pada: waktuIsoWib(b.ditanganiPada), alasan: b.ditanganiAlasan },
    lampiran: b.lampiranBerkas === null || b.lampiranUkuranKb === null ? null : { berkas: b.lampiranBerkas, ukuranKb: b.lampiranUkuranKb },
    isi: bukaIsiLaporan(penyandi, b.desaId, b.isi as IsiLaporan),
  })

/** Laporan cakupan tanpa halaman, terlama dulu (seperti API tiruan: `meta.pageSize` = jumlah, sekurang-kurangnya 1). */
export async function daftarLaporan(k: KonteksLaporan, filter: FilterLaporan) {
  const baris = await bacaLaporanDaftar(k.db, filter, cakupanDusun(k.pelaku))
  const data = baris.map((b) => bentukLaporan(b, k.penyandi))
  return { data, meta: { page: 1, pageSize: Math.max(data.length, 1), total: data.length } }
}

export async function detailLaporan(k: KonteksLaporan, id: string): Promise<LaporanData> {
  const b = await bacaLaporanSatu(k.db, id, cakupanDusun(k.pelaku))
  if (!b) throw new GalatApp('NOT_FOUND', PESAN_LAPORAN_TIDAK_ADA, 404)
  return bentukLaporan(b, k.penyandi)
}

/**
 * Menerapkan laporan perbaikan: nilai yang dilaporkan menjadi data penduduk lewat jalur ubah yang sama dengan `PATCH
 * /penduduk/:id` (sandi, keunikan, Riwayat), lalu laporan selesai. Laporan dikunci lebih dulu. Laporan kelahiran dicatat lewat
 * alur Catat kelahiran, bukan di sini.
 */
export async function terapkanLaporan(k: KonteksTulis, id: string) {
  const dusunSaja = cakupanDusun(k.pelaku)
  const l = await kunciLaporan(k.db, id, dusunSaja)
  if (!l) throw new GalatApp('NOT_FOUND', PESAN_LAPORAN_TIDAK_ADA, 404)
  if (l.status !== 'baru') throw new GalatApp('CONFLICT', SUDAH_DITANGANI, 409)
  const isi = bukaIsiLaporan(k.penyandi, l.desaId, l.isi as IsiLaporan)
  if (isi.jenis !== 'perbaikan') throw new GalatApp('VALIDATION', 'Laporan kelahiran dicatat lewat alur Catat kelahiran.', 422)
  const rekam = await bacaPendudukSatu(k.db, isi.pendudukId, dusunSaja)
  if (!rekam) throw new GalatApp('NOT_FOUND', 'Data penduduk tidak ditemukan.', 404)
  const ubah = ubahPendudukSchema.safeParse({ [isi.field]: isi.nilaiBaru })
  if (!ubah.success) {
    throw new GalatApp(
      'VALIDATION',
      `Nilai yang dilaporkan tidak valid untuk ${LABEL_FIELD[isi.field].toLowerCase()}. Tolak laporan ini, atau ubah datanya lewat Ubah.`,
      422,
    )
  }
  const { penduduk } = await terapkanPerubahan(k, rekam, ubah.data)
  const oleh = pelakuKontrak(k.pelaku)
  const baru = await tandaiLaporan(k.db, l.id, { status: 'diterapkan', olehId: oleh.id, olehNama: oleh.nama, pada: k.sekarang, alasan: null })
  await catatAktivitas(k.db, {
    desaId: penduduk.desaId, dusunId: penduduk.dusunId, waktu: waktuIsoWib(k.sekarang), jenis: 'laporan-diterapkan',
    ringkasan: `Laporan warga diterapkan · ${penduduk.nama} (${LABEL_FIELD[isi.field]})`, oleh, rujukan: { jenis: 'penduduk', id: penduduk.id },
  })
  return hasilTerapkanSchema.parse({ laporan: bentukLaporan(baru, k.penyandi), penduduk })
}

/** Menolak laporan dengan alasan opsional; data penduduk tidak disentuh. */
export async function tolakLaporan(k: KonteksTulis, id: string, mentah: unknown): Promise<{ laporan: LaporanData }> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const l = await kunciLaporan(k.db, id, dusunSaja)
  if (!l) throw new GalatApp('NOT_FOUND', PESAN_LAPORAN_TIDAK_ADA, 404)
  if (l.status !== 'baru') throw new GalatApp('CONFLICT', SUDAH_DITANGANI, 409)
  const isian = tolakLaporanSchema.safeParse(mentah)
  if (!isian.success) throw galatIsian(isian.error)
  const isi = bukaIsiLaporan(k.penyandi, l.desaId, l.isi as IsiLaporan)
  const pendudukId = isi.jenis === 'perbaikan' ? isi.pendudukId : null
  const subjek = isi.jenis === 'perbaikan' ? ((await bacaPendudukSatu(k.db, isi.pendudukId, dusunSaja))?.nama ?? 'penduduk') : `kelahiran ${isi.nama}`
  const oleh = pelakuKontrak(k.pelaku)
  const baru = await tandaiLaporan(k.db, l.id, { status: 'ditolak', olehId: oleh.id, olehNama: oleh.nama, pada: k.sekarang, alasan: isian.data.alasan || null })
  await catatAktivitas(k.db, {
    desaId: l.desaId, dusunId: l.dusunId, waktu: waktuIsoWib(k.sekarang), jenis: 'laporan-ditolak', ringkasan: `Laporan warga ditolak · ${subjek}`, oleh,
    rujukan: pendudukId ? { jenis: 'penduduk', id: pendudukId } : null,
  })
  return { laporan: bentukLaporan(baru, k.penyandi) }
}
