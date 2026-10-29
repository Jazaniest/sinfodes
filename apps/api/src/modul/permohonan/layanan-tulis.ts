import { tanggalIsoWib, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { Pelaku } from '@sinfodes/kontrak/mutasi/schema'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { peranMengizinkan, statusMengizinkan, tahapAwalTtd } from '@sinfodes/kontrak/surat/alur'
import { dilayani, periksaIsian, samaIsian, saringIsian } from '@sinfodes/kontrak/surat/jenis'
import { periksaPemohon } from '@sinfodes/kontrak/surat/pemohon'
import {
  ajukanTtdSchema, alasanSchema, buatPermohonanSchema, catatanKembaliSchema, ubahPermohonanSchema, type AksiSurat, type DetailPermohonan, type KejadianSurat, type Permohonan,
} from '@sinfodes/kontrak/surat/permohonan'
import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
import { randomUUID } from 'node:crypto'
import { pelanggaranKunciAsing } from '../../basisdata/galat-pg'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { galatField, galatIsian } from '../../galat-isian'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import type { PelakuPanel } from '../../lapisan/konteks'
import { catatAktivitas, pelakuKontrak } from '../../riwayat/catat'
import { bacaJenisSatu } from '../jenis-surat/repositori'
import { bentukMutasi } from '../mutasi/layanan'
import { bacaMutasiSatu } from '../mutasi/repositori'
import { bentukPenduduk } from '../penduduk/layanan'
import { bacaPendudukSatu } from '../penduduk/repositori'
import type { EfekSurat } from './efek-surat'
import { PESAN_DATA_TIDAK_UTUH } from './bentuk'
import { bentukDetail, permohonanTidakAda } from './layanan'
import { bacaPermohonanSatu } from './repositori'
import { alokasiNoUrut, KENDALA_JENIS, sisipPermohonan, sisipRiwayatSurat, ubahKolomPermohonan, type KolomUbahPermohonan } from './repositori-tulis'

export type KonteksTulisSurat = { db: Db; penyandi: Penyandi; pelaku: PelakuPanel; desa: Desa; sekarang: Date }

export const PESAN_JENIS_TIDAK_ADA = 'Jenis surat tidak ditemukan.'
export const PESAN_JENIS_TIDAK_TERSEDIA = 'Jenis surat ini tidak tersedia.'
export const PESAN_ISIAN_BELUM_LENGKAP = 'Isian surat belum lengkap.'
export const PESAN_ISIAN_HANYA_DIPROSES = 'Isian hanya bisa diubah saat permohonan berstatus Diproses.'
const dataTidakUtuh = () => new GalatApp('SERVER', PESAN_DATA_TIDAK_UTUH, 500)

/** Satu baris riwayat permohonan. Dipanggil dalam transaksi permintaan yang sama dengan perubahan statusnya. */
export async function catatRiwayatSurat(
  db: Db,
  p: { id: string; desaId: string },
  kejadian: KejadianSurat,
  oleh: Pelaku,
  waktu: Date,
  catatan: string | null = null,
): Promise<void> {
  await sisipRiwayatSurat(db, { id: `rws_${randomUUID()}`, desaId: p.desaId, permohonanId: p.id, kejadian, waktu, oleh, catatan })
}

/** Isian yang gagal diperiksa menjadi 422 dengan satu pesan per field `isian.<kunci>` (SPEC §7.4 langkah 3). */
export const galatIsianSurat = (galat: Record<string, string>): GalatApp =>
  new GalatApp('VALIDATION', PESAN_ISIAN_BELUM_LENGKAP, 422, Object.fromEntries(Object.entries(galat).map(([kunci, pesan]) => [`isian.${kunci}`, pesan])))

/**
 * Membuat permohonan dari loket (SPEC §7.4 layar 2-3): disimpan sebagai draf (Diproses) atau langsung diajukan untuk tanda
 * tangan. Urutan kunci tetap: baris jenis dikunci bersama (FOR SHARE) lalu keadaannya diperiksa, kunci penasihat nomor urut,
 * baru sisip. Arsip, penonaktifan, atau hapus jenis yang serentak jadi menunggu transaksi ini, atau sudah selesai lebih dulu
 * dan terbaca di sini; permohonan tidak pernah menunjuk jenis yang sudah mati dan tidak ada permohonan yatim.
 */
export async function buatPermohonan(k: KonteksTulisSurat, mentah: unknown): Promise<DetailPermohonan> {
  const masukan = buatPermohonanSchema.safeParse(mentah)
  if (!masukan.success) throw galatIsian(masukan.error)
  const m = masukan.data

  const jenis = await bacaJenisSatu(k.db, m.jenisId, { bagi: true })
  if (!jenis) throw galatField('jenisId', PESAN_JENIS_TIDAK_ADA)
  // Jenis mati atau diarsipkan hanya menutup permohonan baru; yang sudah berjalan tetap diproses (fokus review 1 tiruan).
  if (!dilayani(jenis)) throw galatField('jenisId', PESAN_JENIS_TIDAK_TERSEDIA, 'CONFLICT')

  const pemohon = await bacaPendudukSatu(k.db, m.pemohonId, null)
  if (!pemohon) throw galatField('pemohonId', 'Pemohon tidak ditemukan.')
  const subjek = m.subjekId === null ? null : await bacaPendudukSatu(k.db, m.subjekId, null)
  if (m.subjekId !== null && !subjek) throw galatField('subjekId', 'Penduduk yang diterangkan tidak ditemukan.')
  // Mutasi yang tidak dikenal (atau milik desa lain) diabaikan, sama dengan API tiruan.
  const mutasiLengkap = m.mutasiId === null ? undefined : await bacaMutasiSatu(k.db, m.mutasiId)
  const mutasi = mutasiLengkap ? bentukMutasi(mutasiLengkap.rekam, mutasiLengkap.pendudukIds) : null
  const orangPemohon = bentukPenduduk(pemohon, k.penyandi)
  const cek = periksaPemohon(jenis, orangPemohon, subjek ? bentukPenduduk(subjek, k.penyandi) : null, mutasi)
  if (cek.blokir) throw galatField(cek.blokir.kolom === 'pemohon' ? 'pemohonId' : 'subjekId', cek.blokir.pesan)

  const isian = saringIsian(jenis, m.isian)
  if (m.ajukan) {
    const galat = periksaIsian(jenis, isian)
    if (Object.keys(galat).length > 0) throw galatIsianSurat(galat)
  }

  const tahun = Number(tanggalIsoWib(k.sekarang).slice(0, 4))
  const noUrut = await alokasiNoUrut(k.db, k.desa.id, tahun)
  const id = `srt_${randomUUID()}`
  try {
    await sisipPermohonan(k.db, {
      id,
      desaId: k.desa.id,
      dusunId: pemohon.dusunId,
      tahun,
      noUrut,
      jenisId: jenis.id,
      kanal: 'loket',
      pemohonId: pemohon.id,
      subjekId: subjek?.id ?? null,
      mutasiId: mutasi?.id ?? null,
      isianSandi: k.penyandi.sandikan(JSON.stringify(isian), ruang.permohonanIsian(k.desa.id)),
      status: m.ajukan ? 'perlu-ttd' : 'diproses',
      tahap: m.ajukan ? tahapAwalTtd(jenis) : null,
      masukPada: k.sekarang,
      lampiran: [],
    })
  } catch (e) {
    // Lapis kedua: kunci bersama di atas sudah mencegahnya, tetapi basis data tetap menolak permohonan ke jenis yang lenyap.
    if (pelanggaranKunciAsing(e, KENDALA_JENIS)) throw galatField('jenisId', PESAN_JENIS_TIDAK_TERSEDIA, 'CONFLICT')
    throw e
  }
  const oleh = pelakuKontrak(k.pelaku)
  await catatRiwayatSurat(k.db, { id, desaId: k.desa.id }, 'dibuat', oleh, k.sekarang)
  if (m.ajukan) await catatRiwayatSurat(k.db, { id, desaId: k.desa.id }, 'ajukan-ttd', oleh, k.sekarang)
  await catatAktivitas(k.db, {
    desaId: k.desa.id,
    dusunId: pemohon.dusunId,
    waktu: k.sekarang.toISOString(),
    jenis: 'permohonan-masuk',
    ringkasan: `Permohonan ${jenis.kode} · ${pemohon.nama} (loket)`,
    oleh,
    rujukan: { jenis: 'permohonan', id },
  })
  const rekam = await bacaPermohonanSatu(k.db, id, null)
  if (!rekam) throw dataTidakUtuh()
  return bentukDetail(k, rekam)
}

/**
 * Menyunting isian (hanya saat Diproses) dan catatan internal (kapan saja, termasuk pada surat yang sudah tertutup). Barisnya
 * dikunci lebih dulu (FOR UPDATE) lalu keadaannya dibaca ulang, jadi aksi status serentak saling melihat keadaan terbaru.
 * Riwayat `disimpan` hanya dicatat bila isian benar-benar berubah; `''` pada catatan internal menjadi kosong.
 */
export async function ubahPermohonan(k: KonteksTulisSurat, id: string, mentah: unknown): Promise<DetailPermohonan> {
  const masukan = ubahPermohonanSchema.safeParse(mentah)
  if (!masukan.success) throw galatIsian(masukan.error)
  const rekam = await bacaPermohonanSatu(k.db, id, cakupanDusun(k.pelaku), { kunci: true })
  if (!rekam) throw permohonanTidakAda()
  const { isian, catatanInternal } = masukan.data
  if (isian !== undefined && rekam.status !== 'diproses') throw new GalatApp('CONFLICT', PESAN_ISIAN_HANYA_DIPROSES, 409)

  const kolom: KolomUbahPermohonan = {}
  if (isian !== undefined) {
    const jenis = await bacaJenisSatu(k.db, rekam.jenisId)
    if (!jenis) throw dataTidakUtuh()
    const baru = saringIsian(jenis, isian)
    const lama = JSON.parse(k.penyandi.bukaSandi(rekam.isianSandi, ruang.permohonanIsian(rekam.desaId))) as Record<string, string>
    if (!samaIsian(baru, lama)) {
      kolom.isianSandi = k.penyandi.sandikan(JSON.stringify(baru), ruang.permohonanIsian(rekam.desaId))
      await catatRiwayatSurat(k.db, rekam, 'disimpan', pelakuKontrak(k.pelaku), k.sekarang)
    }
  }
  if (catatanInternal !== undefined) kolom.catatanInternal = catatanInternal === null || catatanInternal === '' ? null : catatanInternal
  await ubahKolomPermohonan(k.db, rekam.id, kolom)
  const terbaru = await bacaPermohonanSatu(k.db, rekam.id, null)
  if (!terbaru) throw dataTidakUtuh()
  return bentukDetail(k, terbaru)
}

export const PESAN_SUDAH_BERUBAH = 'Status permohonan ini sudah berubah. Muat ulang halaman untuk melihat keadaan terbarunya.'
export const PESAN_AKSI_BELUM_ADA = 'Aksi ini belum tersedia di server nyata.'
export const PESAN_AKSI_TIDAK_DIKENAL = 'Aksi tidak dikenal.'

/** Aksi yang sudah hidup di 8F2a; tanda tangan, batal, serah terima, dan kirim WhatsApp datang di 8F2b. */
const AKSI_AKTIF: readonly AksiSurat[] = ['proses', 'tolak', 'ajukan-ttd', 'paraf', 'kembalikan']
const TIDAK_BERHAK: Readonly<Record<string, string>> = {
  proses: 'Peran Anda tidak berhak memproses permohonan.',
  tolak: 'Peran Anda tidak berhak menolak permohonan.',
  'ajukan-ttd': 'Peran Anda tidak berhak mengajukan tanda tangan.',
  paraf: 'Hanya Sekretaris Desa yang memaraf surat.',
  kembalikan: 'Hanya Sekretaris Desa dan Kepala Desa yang bisa mengembalikan surat.',
}

export type KonteksAksi = KonteksTulisSurat & { efek: EfekSurat }

/**
 * Menjalankan satu aksi status (SPEC §7.1). Urutan pemeriksaan sama dengan API tiruan: permohonan dalam cakupan (404), hak per aksi
 * (403), baris dikunci (FOR UPDATE) dan dibaca ulang, status yang sah (409), lalu isi (422). Dua orang yang menekan aksi serentak
 * tidak sama-sama lolos: yang kedua menunggu kunci lalu melihat status baru dan mendapat 409. Aksi yang belum hidup menjawab 404.
 * Wajib dipanggil dalam transaksi permintaan; galat dari efek membatalkan seluruh aksi.
 */
export async function jalankanAksi(k: KonteksAksi, id: string, aksi: AksiSurat, badan: unknown): Promise<DetailPermohonan> {
  if (!AKSI_AKTIF.includes(aksi)) throw new GalatApp('NOT_FOUND', PESAN_AKSI_BELUM_ADA, 404)
  const dusunSaja = cakupanDusun(k.pelaku)
  const awal = await bacaPermohonanSatu(k.db, id, dusunSaja)
  if (!awal) throw permohonanTidakAda()
  const jenis = await bacaJenisSatu(k.db, awal.jenisId)
  const pemohon = await bacaPendudukSatu(k.db, awal.pemohonId, null)
  if (!jenis || !pemohon) throw dataTidakUtuh()
  if (!peranMengizinkan(aksi, k.pelaku.peran, jenis)) throw new GalatApp('FORBIDDEN', TIDAK_BERHAK[aksi], 403)

  const rekam = await bacaPermohonanSatu(k.db, id, dusunSaja, { kunci: true })
  if (!rekam) throw permohonanTidakAda()
  if (!statusMengizinkan(aksi, { status: rekam.status as Permohonan['status'], tahap: rekam.tahap as Permohonan['tahap'], diambil: rekam.diambil as Permohonan['diambil'] })) {
    throw new GalatApp('CONFLICT', PESAN_SUDAH_BERUBAH, 409)
  }

  const oleh = pelakuKontrak(k.pelaku)
  const pada = waktuIsoWib(k.sekarang)
  const rujukan = { jenis: 'permohonan' as const, id: rekam.id }
  const bukaIsian = () => JSON.parse(k.penyandi.bukaSandi(rekam.isianSandi, ruang.permohonanIsian(rekam.desaId))) as Record<string, string>

  switch (aksi) {
    case 'proses':
      await ubahKolomPermohonan(k.db, rekam.id, { status: 'diproses' })
      await catatRiwayatSurat(k.db, rekam, 'proses', oleh, k.sekarang)
      break
    case 'tolak': {
      const isian = alasanSchema.safeParse(badan)
      if (!isian.success) throw galatIsian(isian.error)
      await ubahKolomPermohonan(k.db, rekam.id, { status: 'ditolak', tahap: null, ditutupPada: k.sekarang, penolakan: { oleh, pada, catatan: isian.data.alasan } })
      await catatRiwayatSurat(k.db, rekam, 'tolak', oleh, k.sekarang, isian.data.alasan)
      await catatAktivitas(k.db, {
        desaId: rekam.desaId, dusunId: rekam.dusunId, waktu: pada, jenis: 'surat-ditolak', ringkasan: `Permohonan ditolak · ${jenis.kode} · ${pemohon.nama}`, oleh, rujukan,
      })
      break
    }
    case 'ajukan-ttd': {
      const isian = ajukanTtdSchema.safeParse(badan)
      if (!isian.success) throw galatIsian(isian.error)
      const lama = bukaIsian()
      const nilai = isian.data.isian === undefined ? lama : saringIsian(jenis, isian.data.isian)
      const galat = periksaIsian(jenis, nilai)
      if (Object.keys(galat).length > 0) throw galatIsianSurat(galat)
      await ubahKolomPermohonan(k.db, rekam.id, {
        status: 'perlu-ttd',
        tahap: tahapAwalTtd(jenis),
        dikembalikan: null,
        ...(samaIsian(nilai, lama) ? {} : { isianSandi: k.penyandi.sandikan(JSON.stringify(nilai), ruang.permohonanIsian(rekam.desaId)) }),
      })
      await catatRiwayatSurat(k.db, rekam, 'ajukan-ttd', oleh, k.sekarang)
      break
    }
    case 'paraf':
      await ubahKolomPermohonan(k.db, rekam.id, { tahap: 'tanda-tangan' })
      await catatRiwayatSurat(k.db, rekam, 'paraf', oleh, k.sekarang)
      break
    case 'kembalikan': {
      const isian = catatanKembaliSchema.safeParse(badan)
      if (!isian.success) throw galatIsian(isian.error)
      await ubahKolomPermohonan(k.db, rekam.id, { status: 'diproses', tahap: null, dikembalikan: { oleh, pada, catatan: isian.data.catatan } })
      await catatRiwayatSurat(k.db, rekam, 'kembalikan', oleh, k.sekarang, isian.data.catatan)
      await k.efek.suratDikembalikan(k.db, rekam, jenis, { id: pemohon.id, nama: pemohon.nama }, isian.data.catatan, oleh)
      break
    }
    default:
      throw new GalatApp('NOT_FOUND', PESAN_AKSI_BELUM_ADA, 404)
  }
  const terbaru = await bacaPermohonanSatu(k.db, rekam.id, null)
  if (!terbaru) throw dataTidakUtuh()
  return bentukDetail(k, terbaru)
}
