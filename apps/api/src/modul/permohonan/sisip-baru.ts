import { tanggalIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { Pelaku } from '@sinfodes/kontrak/mutasi/schema'
import { dilayani, type JenisSurat } from '@sinfodes/kontrak/surat/jenis'
import type { KejadianSurat, Permohonan } from '@sinfodes/kontrak/surat/permohonan'
import { randomUUID } from 'node:crypto'
import { pelanggaranKunciAsing } from '../../basisdata/galat-pg'
import type { Db } from '../../basisdata/klien'
import { galatField } from '../../galat-isian'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { catatAktivitas } from '../../riwayat/catat'
import { bacaJenisSatu } from '../jenis-surat/repositori'
import { catatRiwayatSurat } from './riwayat-surat'
import { alokasiNoUrut, KENDALA_JENIS, sisipPermohonan } from './repositori-tulis'

export const PESAN_JENIS_TIDAK_ADA = 'Jenis surat tidak ditemukan.'
export const PESAN_JENIS_TIDAK_TERSEDIA = 'Jenis surat ini tidak tersedia.'

/**
 * Jenis yang akan dipakai permohonan baru, dikunci bersama (FOR SHARE) lalu diperiksa: arsip, penonaktifan, atau hapus jenis yang
 * serentak menunggu transaksi ini, atau sudah selesai lebih dulu dan terbaca di sini. Permohonan tidak pernah menunjuk jenis yang
 * sudah mati, dan tidak ada permohonan yatim. Jenis mati atau diarsipkan hanya menutup permohonan baru; yang sudah berjalan tetap
 * diproses. Kunci ini yang pertama diambil di setiap jalan pembuatan permohonan (loket maupun warga).
 */
export async function kunciJenisDilayani(db: Db, jenisId: string): Promise<JenisSurat> {
  const jenis = await bacaJenisSatu(db, jenisId, { bagi: true })
  if (!jenis) throw galatField('jenisId', PESAN_JENIS_TIDAK_ADA)
  if (!dilayani(jenis)) throw galatField('jenisId', PESAN_JENIS_TIDAK_TERSEDIA, 'CONFLICT')
  return jenis
}

export type KonteksSisipBaru = { db: Db; penyandi: Penyandi; desaId: string; sekarang: Date }

/** Bahan satu permohonan baru; semua pemeriksaan isi (pemohon, isian, syarat) sudah dilakukan pemanggil. */
export type PermohonanBaru = {
  jenis: Pick<JenisSurat, 'id' | 'kode'>
  pemohon: { id: string; nama: string; dusunId: string }
  subjekId: string | null
  mutasiId: string | null
  /** Isian yang sudah disaring menurut jenis. */
  isian: Record<string, string>
  kanal: Permohonan['kanal']
  status: 'menunggu' | 'diproses' | 'perlu-ttd'
  tahap: Permohonan['tahap']
  lampiran: Permohonan['lampiran']
  /** Kejadian awal riwayat, berurutan, semuanya atas nama `oleh` (loket: dibuat lalu ajukan-ttd; warga: diajukan). */
  riwayat: readonly KejadianSurat[]
  oleh: Pelaku
  ringkasanAktivitas: string
}

/**
 * Inti pembuatan permohonan untuk loket dan layanan warga (8F3 Ruling 5): nomor urut dari satu antrean per desa dan tahun
 * (kunci penasihat), sisip, riwayat, dan satu kejadian "permohonan-masuk" di Buku hari ini. Wajib dipanggil dalam transaksi
 * permintaan, sesudah `kunciJenisDilayani`; urutan kunci tetap: jenis, lalu kunci pengajuan warga bila ada, lalu nomor urut.
 */
export async function sisipkanPermohonanBaru(k: KonteksSisipBaru, s: PermohonanBaru): Promise<{ id: string; tahun: number; noUrut: number }> {
  const tahun = Number(tanggalIsoWib(k.sekarang).slice(0, 4))
  const noUrut = await alokasiNoUrut(k.db, k.desaId, tahun)
  const id = `srt_${randomUUID()}`
  try {
    await sisipPermohonan(k.db, {
      id,
      desaId: k.desaId,
      dusunId: s.pemohon.dusunId,
      tahun,
      noUrut,
      jenisId: s.jenis.id,
      kanal: s.kanal,
      pemohonId: s.pemohon.id,
      subjekId: s.subjekId,
      mutasiId: s.mutasiId,
      isianSandi: k.penyandi.sandikan(JSON.stringify(s.isian), ruang.permohonanIsian(k.desaId)),
      status: s.status,
      tahap: s.tahap,
      masukPada: k.sekarang,
      lampiran: s.lampiran,
    })
  } catch (e) {
    // Lapis kedua: kunci bersama di atas sudah mencegahnya, tetapi basis data tetap menolak permohonan ke jenis yang lenyap.
    if (pelanggaranKunciAsing(e, KENDALA_JENIS)) throw galatField('jenisId', PESAN_JENIS_TIDAK_TERSEDIA, 'CONFLICT')
    throw e
  }
  for (const kejadian of s.riwayat) await catatRiwayatSurat(k.db, { id, desaId: k.desaId }, kejadian, s.oleh, k.sekarang)
  await catatAktivitas(k.db, {
    desaId: k.desaId,
    dusunId: s.pemohon.dusunId,
    waktu: k.sekarang.toISOString(),
    jenis: 'permohonan-masuk',
    ringkasan: s.ringkasanAktivitas,
    oleh: s.oleh,
    rujukan: { jenis: 'permohonan', id },
  })
  return { id, tahun, noUrut }
}
