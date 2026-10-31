import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import type { ModeTandaTangan } from '@sinfodes/kontrak/surat/pengaturan'
import type { Permohonan } from '@sinfodes/kontrak/surat/permohonan'
import { nomorTiket } from '@sinfodes/kontrak/warga/ajukan'
import {
  detailPermohonanWargaSchema, posisiPermohonan, riwayatUntukWarga, ringkasPermohonanWargaSchema,
  type DetailPermohonanWarga, type RingkasPermohonanWarga,
} from '@sinfodes/kontrak/warga/permohonan'
import { GalatApp } from '../../galat'
import type { RekamRingkasWarga } from '../permohonan/repositori'

export const PESAN_SURAT_WARGA_TIDAK_UTUH = 'Data permohonan tidak utuh.'
const tidakUtuh = () => new GalatApp('SERVER', PESAN_SURAT_WARGA_TIDAK_UTUH, 500)

/** Bahan satu ringkasan permohonan untuk warga, sama untuk daftar (dari baris gabungan) dan detail (dari permohonan lengkap). */
export type DasarRingkasWarga = {
  id: string
  noUrut: number
  status: string
  tahap: string | null
  dikembalikan: boolean
  diambil: boolean
  masukPada: string
  ditutupPada: string | null
  nomor: string | null
  mode: string | null
  jenis: { kode: string; nama: string }
  untuk: { id: string; nama: string }
}

/** Ringkasan diperiksa skema kontrak: data yang menyimpang gagal tertutup (500) dan tidak sampai ke warga. */
export function bentukRingkasWarga(d: DasarRingkasWarga): RingkasPermohonanWarga {
  const hasil = ringkasPermohonanWargaSchema.safeParse({
    id: d.id,
    status: d.status,
    tahap: d.tahap,
    dikembalikan: d.dikembalikan,
    masukPada: d.masukPada,
    ditutupPada: d.ditutupPada,
    jenis: d.jenis,
    untuk: d.untuk,
    posisi: posisiPermohonan({
      status: d.status as Permohonan['status'], tahap: d.tahap as Permohonan['tahap'], dikembalikan: d.dikembalikan, diambil: d.diambil,
      mode: d.mode as ModeTandaTangan | null,
    }),
    nomor: d.nomor,
    tiket: nomorTiket({ masukPada: d.masukPada, noUrut: d.noUrut }),
  })
  if (!hasil.success) throw tidakUtuh()
  return hasil.data
}

/** Baris gabungan daftar menjadi bahan ringkasan. Nama orang yang hilang diganti seperti API tiruan. */
export const dasarDariBaris = (r: RekamRingkasWarga): DasarRingkasWarga => ({
  id: r.id,
  noUrut: r.noUrut,
  status: r.status,
  tahap: r.tahap,
  dikembalikan: r.dikembalikan,
  diambil: r.diambil,
  masukPada: waktuIsoWib(r.masukPada),
  ditutupPada: r.ditutupPada === null ? null : waktuIsoWib(r.ditutupPada),
  nomor: r.nomor,
  mode: r.mode,
  jenis: { kode: r.jenisKode, nama: r.jenisNama },
  untuk: { id: r.untukId, nama: r.untukNama ?? 'Penduduk tidak ditemukan' },
})

/**
 * Detail permohonan untuk pemiliknya. Catatan antarpetugas dihapus dari riwayat, alasan penolakan dikirim hanya bila ditolak,
 * dan surat (lembar beku) hanya bila Selesai. Pemanggil sudah memastikan permohonan ini milik warga yang meminta.
 */
export function bentukDetailWarga(p: Permohonan, jenis: Pick<JenisSurat, 'kode' | 'nama' | 'isian'>, untuk: { id: string; nama: string }): DetailPermohonanWarga {
  const ringkas = bentukRingkasWarga({
    id: p.id,
    noUrut: p.noUrut,
    status: p.status,
    tahap: p.tahap,
    dikembalikan: p.dikembalikan !== null,
    diambil: p.diambil !== null,
    masukPada: p.masukPada,
    ditutupPada: p.ditutupPada,
    nomor: p.terbit?.nomor ?? null,
    mode: p.terbit?.mode ?? null,
    jenis: { kode: jenis.kode, nama: jenis.nama },
    untuk,
  })
  const hasil = detailPermohonanWargaSchema.safeParse({
    permohonan: {
      ...ringkas,
      isian: p.isian,
      riwayat: riwayatUntukWarga(p.riwayat),
      alasanDitolak: p.status === 'ditolak' ? (p.penolakan?.catatan ?? null) : null,
      diambilPada: p.diambil?.pada ?? null,
    },
    jenis: { kode: jenis.kode, nama: jenis.nama, isian: jenis.isian },
    terbit: p.status === 'selesai' ? p.terbit : null,
  })
  if (!hasil.success) throw tidakUtuh()
  return hasil.data
}
