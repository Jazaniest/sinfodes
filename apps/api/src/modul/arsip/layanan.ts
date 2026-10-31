import { tanggalIsoWib, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import {
  barisSuratKeluarSchema, BERKAS_SCAN, isianSuratMasukSchema, MAKS_SCAN_MB, namaScanAman, suratMasukSchema,
  type BarisSuratKeluar, type FilterSuratKeluar, type FilterSuratMasuk, type SuratMasuk,
} from '@sinfodes/kontrak/surat/arsip'
import { ukuranKb } from '@sinfodes/kontrak/warga/foto'
import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
import { randomUUID } from 'node:crypto'
import { bersihkanMetadata } from '../../berkas/bersihkan'
import { PESAN_BERKAS_TIDAK_TERSIMPAN } from '../../berkas/jawab'
import { bacaBerkas, simpanBerkas } from '../../berkas/layanan'
import { GalatBerkas, periksaBerkas, type TipeBerkas } from '../../berkas/periksa'
import { pelanggaranUnik } from '../../basisdata/galat-pg'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { galatField, galatIsian } from '../../galat-isian'
import type { Penyandi } from '../../kripto/penyandi'
import type { PelakuPanel } from '../../lapisan/konteks'
import { pelakuKontrak } from '../../riwayat/catat'
import {
  bacaSuratKeluar, bacaSuratMasukBulan, bacaSuratMasukSatu, hitungSuratKeluar, hitungSuratMasukBulan, INDEKS_NO_AGENDA, noAgendaBerikut, sisipSuratMasuk,
  type RekamSuratMasuk,
} from './repositori'

export type KonteksArsip = { db: Db; penyandi: Penyandi; pelaku: PelakuPanel; desa: Desa; sekarang: Date }
export type HasilDaftarArsip<T> = { data: T[]; meta: { page: number; pageSize: number; total: number } }

export const PESAN_ARSIP_TIDAK_UTUH = 'Data arsip tidak utuh.'
export const PESAN_SURAT_MASUK_TIDAK_ADA = 'Surat masuk tidak ditemukan.'
export const PESAN_TANPA_PINDAIAN = 'Surat masuk ini tidak punya pindaian.'
const tidakUtuh = () => new GalatApp('SERVER', PESAN_ARSIP_TIDAK_UTUH, 500)

const bulanBerjalan = (sekarang: Date): string => tanggalIsoWib(sekarang).slice(0, 7)

/**
 * Surat keluar = permohonan yang sudah terbit (Selesai, atau Dibatalkan sesudah terbit), disaring bulan terbit menurut WIB (bawaan
 * bulan berjalan), jenis, dan jabatan penanda tangan. Kepala Dusun hanya dusunnya. `semua` mengembalikan seluruh bulan tanpa halaman
 * (bahan Buku Agenda CSV).
 */
export async function daftarSuratKeluar(k: KonteksArsip, filter: FilterSuratKeluar, semua: boolean): Promise<HasilDaftarArsip<BarisSuratKeluar>> {
  const s = { dusunSaja: cakupanDusun(k.pelaku), awalBulan: `${filter.bulan ?? bulanBerjalan(k.sekarang)}-01`, jenisKode: filter.jenis, peran: filter.penandatangan }
  const total = await hitungSuratKeluar(k.db, s)
  const baris = await bacaSuratKeluar(k.db, s, semua ? undefined : { batas: filter.pageSize, lewati: (filter.page - 1) * filter.pageSize })
  const data = baris.map((b) => {
    const hasil = barisSuratKeluarSchema.safeParse({
      id: b.id,
      nomor: b.nomor,
      urut: b.urut,
      tanggal: b.terbitPada === null ? null : tanggalIsoWib(b.terbitPada),
      jenis: { kode: b.jenisKode, nama: b.jenisNama },
      untuk: b.untukNama ?? 'Penduduk tidak ditemukan',
      penandatangan: b.penandatangan,
      kanal: b.kanal,
      status: b.status === 'dibatalkan' ? 'dibatalkan' : 'selesai',
    })
    if (!hasil.success) throw tidakUtuh()
    return hasil.data
  })
  return { data, meta: semua ? { page: 1, pageSize: Math.max(total, 1), total } : { page: filter.page, pageSize: filter.pageSize, total } }
}

export function bentukSuratMasuk(r: RekamSuratMasuk): SuratMasuk {
  const hasil = suratMasukSchema.safeParse({
    id: r.id,
    desaId: r.desaId,
    noAgenda: r.noAgenda,
    diterima: r.diterima,
    nomor: r.nomor,
    tanggalSurat: r.tanggalSurat,
    pengirim: r.pengirim,
    perihal: r.perihal,
    scan: r.scanNama === null || r.scanUkuranKb === null ? null : { berkas: r.scanNama, ukuranKb: r.scanUkuranKb },
    disposisi: r.disposisiKepada === null ? null : { kepada: r.disposisiKepada, instruksi: r.disposisiInstruksi },
    dicatat: { oleh: r.dicatatOleh, pada: waktuIsoWib(r.dicatatPada) },
  })
  if (!hasil.success) throw tidakUtuh()
  return hasil.data
}

/** Register surat masuk bulan terima itu. Surat masuk ditujukan ke desa, tidak terikat dusun: Kepala Dusun melihat seluruh register. */
export async function daftarSuratMasuk(k: Pick<KonteksArsip, 'db' | 'sekarang'>, filter: FilterSuratMasuk): Promise<HasilDaftarArsip<SuratMasuk>> {
  const awalBulan = `${filter.bulan ?? bulanBerjalan(k.sekarang)}-01`
  const total = await hitungSuratMasukBulan(k.db, awalBulan)
  const baris = await bacaSuratMasukBulan(k.db, awalBulan, { batas: filter.pageSize, lewati: (filter.page - 1) * filter.pageSize })
  return { data: baris.map(bentukSuratMasuk), meta: { page: filter.page, pageSize: filter.pageSize, total } }
}

const teksForm = (form: FormData, kunci: string): string => {
  const nilai = form.get(kunci)
  return typeof nilai === 'string' ? nilai : ''
}

/** Pindaian diperiksa dari byte (bukan dari tipe atau ekstensi kiriman), metadata gambarnya dibuang; selesai sebelum ada tulis. */
async function siapkanPindaian(scan: File): Promise<{ tipe: TipeBerkas; bita: Buffer; nama: string }> {
  if (!BERKAS_SCAN.some((e) => scan.name.toLowerCase().endsWith(e))) throw galatField('scan', 'Scan harus berkas PDF, JPG, atau PNG')
  if (scan.size > MAKS_SCAN_MB * 1024 * 1024) throw galatField('scan', `Ukuran scan maksimal ${MAKS_SCAN_MB} MB`)
  const mentah = Buffer.from(await scan.arrayBuffer())
  try {
    const { tipe } = periksaBerkas(mentah, 'scan')
    return { tipe, bita: bersihkanMetadata(mentah, tipe), nama: namaScanAman(scan.name) }
  } catch (e) {
    if (e instanceof GalatBerkas) throw galatField('scan', e.message)
    throw e
  }
}

/** Satu surat masuk punya paling banyak satu pindaian; id berkasnya diturunkan dari id surat sehingga tidak perlu kolom rujukan. */
export const idBerkasScan = (suratMasukId: string): string => `scn_${suratMasukId}`

/**
 * Mencatat surat masuk (SPEC §7.4 layar 5): isian dari bidang teks FormData, pindaian opsional bernama `scan`. Nomor agenda
 * berjalan per desa dan tahun terima di bawah kunci penasihat. Wajib dalam transaksi permintaan: pindaian yang ditolak atau galat
 * di tengah tidak meninggalkan baris apa pun.
 */
export async function catatSuratMasuk(k: KonteksArsip, form: FormData | null): Promise<SuratMasuk> {
  if (!form) throw new GalatApp('VALIDATION', 'Isi pencatatan tidak bisa dibaca.', 422)
  const isian = isianSuratMasukSchema.safeParse({
    diterima: teksForm(form, 'diterima'),
    nomor: teksForm(form, 'nomor'),
    tanggalSurat: teksForm(form, 'tanggalSurat'),
    pengirim: teksForm(form, 'pengirim'),
    perihal: teksForm(form, 'perihal'),
    disposisiKepada: teksForm(form, 'disposisiKepada') || null,
    disposisiInstruksi: teksForm(form, 'disposisiInstruksi'),
  })
  if (!isian.success) throw galatIsian(isian.error)
  const x = isian.data
  if (x.diterima > tanggalIsoWib(k.sekarang)) throw galatField('diterima', 'Tanggal terima tidak boleh sesudah hari ini')
  const scan = form.get('scan')
  const pindaian = scan instanceof File ? await siapkanPindaian(scan) : null

  const id = `sm_${randomUUID()}`
  const tahun = Number(x.diterima.slice(0, 4))
  const noAgenda = await noAgendaBerikut(k.db, k.desa.id, tahun)
  try {
    await sisipSuratMasuk(k.db, {
      id,
      desaId: k.desa.id,
      tahun,
      noAgenda,
      diterima: x.diterima,
      nomor: x.nomor,
      tanggalSurat: x.tanggalSurat,
      pengirim: x.pengirim,
      perihal: x.perihal,
      disposisiKepada: x.disposisiKepada,
      disposisiInstruksi: x.disposisiKepada ? x.disposisiInstruksi : '',
      scanNama: pindaian?.nama ?? null,
      scanUkuranKb: pindaian ? ukuranKb(pindaian.bita.length) : null,
      dicatatOleh: pelakuKontrak(k.pelaku),
      dicatatPada: k.sekarang,
    })
  } catch (e) {
    // Mustahil bila kunci agenda bekerja; bila terjadi, kalah balapan menjadi 409 (coba lagi), bukan 500.
    if (pelanggaranUnik(e, INDEKS_NO_AGENDA)) throw new GalatApp('CONFLICT', 'Nomor agenda bentrok. Coba catat lagi.', 409)
    throw e
  }
  if (pindaian) {
    await simpanBerkas(k.db, k.penyandi, {
      desaId: k.desa.id, jenis: 'scan', suratMasukId: id, tipe: pindaian.tipe, bita: pindaian.bita, sekarang: k.sekarang, id: idBerkasScan(id),
    })
  }
  const rekam = await bacaSuratMasukSatu(k.db, id)
  if (!rekam) throw tidakUtuh()
  return bentukSuratMasuk(rekam)
}

/**
 * Isi pindaian satu surat masuk. Surat dari data contoh hanya punya nama dan ukuran pindaian, tanpa isi: dijawab 404 "Berkas tidak
 * tersimpan." (8F3 Ruling 10).
 */
export async function bukaScan(k: Pick<KonteksArsip, 'db' | 'penyandi'>, id: string): Promise<{ tipe: TipeBerkas; nama: string; bita: Buffer }> {
  const rekam = await bacaSuratMasukSatu(k.db, id)
  if (!rekam) throw new GalatApp('NOT_FOUND', PESAN_SURAT_MASUK_TIDAK_ADA, 404)
  if (rekam.scanNama === null) throw new GalatApp('NOT_FOUND', PESAN_TANPA_PINDAIAN, 404)
  const isi = await bacaBerkas(k.db, k.penyandi, { id: idBerkasScan(rekam.id), suratMasukId: rekam.id })
  if (!isi) throw new GalatApp('NOT_FOUND', PESAN_BERKAS_TIDAK_TERSIMPAN, 404)
  return { tipe: isi.tipe, nama: rekam.scanNama, bita: isi.bita }
}
