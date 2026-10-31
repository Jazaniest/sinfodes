import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { peranMengizinkan, statusMengizinkan, tahapAwalTtd } from '@sinfodes/kontrak/surat/alur'
import { periksaIsian, samaIsian, saringIsian } from '@sinfodes/kontrak/surat/jenis'
import { periksaPemohon } from '@sinfodes/kontrak/surat/pemohon'
import {
  ajukanTtdSchema, alasanSchema, buatPermohonanSchema, catatanKembaliSchema, ubahPermohonanSchema, type AksiSurat, type DetailPermohonan, type Permohonan,
} from '@sinfodes/kontrak/surat/permohonan'
import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
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
import { batalkanSurat, kirimWhatsApp, tandaiDiambil } from './layanan-serah-terima'
import { terbitkanSurat } from './layanan-terbit'
import type { Pengirim } from './pengirim'
import type { Penandatangan } from './penandatangan'
import { catatRiwayatSurat } from './riwayat-surat'
import { kunciJenisDilayani, sisipkanPermohonanBaru } from './sisip-baru'
import { bacaPermohonanSatu } from './repositori'
import { ubahKolomPermohonan, type KolomUbahPermohonan } from './repositori-tulis'

export type KonteksTulisSurat = { db: Db; penyandi: Penyandi; pelaku: PelakuPanel; desa: Desa; sekarang: Date }

export { PESAN_JENIS_TIDAK_ADA, PESAN_JENIS_TIDAK_TERSEDIA } from './sisip-baru'
export const PESAN_ISIAN_BELUM_LENGKAP = 'Isian surat belum lengkap.'
export const PESAN_ISIAN_HANYA_DIPROSES = 'Isian hanya bisa diubah saat permohonan berstatus Diproses.'
const dataTidakUtuh = () => new GalatApp('SERVER', PESAN_DATA_TIDAK_UTUH, 500)

/** Isian yang gagal diperiksa menjadi 422 dengan satu pesan per field `isian.<kunci>` (SPEC §7.4 langkah 3). */
export const galatIsianSurat = (galat: Record<string, string>): GalatApp =>
  new GalatApp('VALIDATION', PESAN_ISIAN_BELUM_LENGKAP, 422, Object.fromEntries(Object.entries(galat).map(([kunci, pesan]) => [`isian.${kunci}`, pesan])))

/**
 * Membuat permohonan dari loket (SPEC §7.4 layar 2-3): disimpan sebagai draf (Diproses) atau langsung diajukan untuk tanda
 * tangan. Urutan kunci tetap: baris jenis dikunci bersama (FOR SHARE) lalu keadaannya diperiksa, kunci penasihat nomor urut,
 * baru sisip (inti bersama dengan pengajuan warga: `sisipkanPermohonanBaru`).
 */
export async function buatPermohonan(k: KonteksTulisSurat, mentah: unknown): Promise<DetailPermohonan> {
  const masukan = buatPermohonanSchema.safeParse(mentah)
  if (!masukan.success) throw galatIsian(masukan.error)
  const m = masukan.data

  const jenis = await kunciJenisDilayani(k.db, m.jenisId)

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

  const { id } = await sisipkanPermohonanBaru(
    { db: k.db, penyandi: k.penyandi, desaId: k.desa.id, sekarang: k.sekarang },
    {
      jenis,
      pemohon: { id: pemohon.id, nama: pemohon.nama, dusunId: pemohon.dusunId },
      subjekId: subjek?.id ?? null,
      mutasiId: mutasi?.id ?? null,
      isian,
      kanal: 'loket',
      status: m.ajukan ? 'perlu-ttd' : 'diproses',
      tahap: m.ajukan ? tahapAwalTtd(jenis) : null,
      lampiran: [],
      riwayat: m.ajukan ? ['dibuat', 'ajukan-ttd'] : ['dibuat'],
      oleh: pelakuKontrak(k.pelaku),
      ringkasanAktivitas: `Permohonan ${jenis.kode} · ${pemohon.nama} (loket)`,
    },
  )
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

/** Aksi yang sudah hidup: lima aksi alur (8F2a), tanda tangan, batal, serah terima, dan kirim WhatsApp (8F2b). */
const AKSI_AKTIF: readonly AksiSurat[] = ['proses', 'tolak', 'ajukan-ttd', 'paraf', 'kembalikan', 'tandatangani', 'batalkan', 'tandai-diambil', 'kirim-wa']
const TIDAK_BERHAK: Readonly<Record<string, string>> = {
  proses: 'Peran Anda tidak berhak memproses permohonan.',
  tolak: 'Peran Anda tidak berhak menolak permohonan.',
  'ajukan-ttd': 'Peran Anda tidak berhak mengajukan tanda tangan.',
  paraf: 'Hanya Sekretaris Desa yang memaraf surat.',
  kembalikan: 'Hanya Sekretaris Desa dan Kepala Desa yang bisa mengembalikan surat.',
  tandatangani: 'Surat ini harus ditandatangani Kepala Desa.',
  batalkan: 'Hanya Sekretaris Desa dan Kepala Desa yang bisa membatalkan surat.',
  'tandai-diambil': 'Peran Anda tidak berhak mengubah permohonan.',
  'kirim-wa': 'Peran Anda tidak berhak mengirim surat.',
}

export type KonteksAksi = KonteksTulisSurat & { efek: EfekSurat; penandatangan: Penandatangan; pengirim: Pengirim; acak: () => number }

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
    case 'tandatangani':
      await terbitkanSurat(k, rekam, jenis, pemohon, badan)
      break
    case 'batalkan':
      await batalkanSurat(k, rekam, jenis, badan)
      break
    case 'tandai-diambil':
      await tandaiDiambil(k, rekam)
      break
    case 'kirim-wa':
      await kirimWhatsApp(k, rekam, jenis, pemohon)
      break
    default:
      throw new GalatApp('NOT_FOUND', PESAN_AKSI_BELUM_ADA, 404)
  }
  const terbaru = await bacaPermohonanSatu(k.db, rekam.id, null)
  if (!terbaru) throw dataTidakUtuh()
  return bentukDetail(k, terbaru)
}
