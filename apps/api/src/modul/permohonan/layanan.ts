import { peranMengizinkan, perluTindakan } from '@sinfodes/kontrak/surat/alur'
import {
  detailPermohonanSchema, STATUS_PERMOHONAN, type BarisPermohonan, type DetailPermohonan, type FilterPermohonan, type JumlahPermohonan, type Permohonan,
  type StatusPermohonan,
} from '@sinfodes/kontrak/surat/permohonan'
import { awalPeriode } from '@sinfodes/kontrak/surat/waktu'
import { kataCukup, cocokPenduduk } from '@sinfodes/kontrak/penduduk/cari'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { z } from 'zod'
import { bacaBerkas } from '../../berkas/layanan'
import { PESAN_BERKAS_TIDAK_TERSIMPAN } from '../../berkas/jawab'
import type { TipeBerkas } from '../../berkas/periksa'
import { GalatApp } from '../../galat'
import { ruang } from '../../kripto/ruang'
import { bacaMutasiSatu } from '../mutasi/repositori'
import { bentukMutasi } from '../mutasi/layanan'
import { bentukPenduduk, type KonteksLayanan } from '../penduduk/layanan'
import { bacaPendudukSatu } from '../penduduk/repositori'
import { bacaJenisDesa, bacaJenisSatu } from '../jenis-surat/repositori'
import { namaPejabat } from '../pengaturan-surat/pejabat'
import { bacaPengaturanSurat } from '../pengaturan-surat/repositori'
import { bentukBaris, bentukPermohonan, PESAN_DATA_TIDAK_UTUH } from './bentuk'
import {
  bacaBaris, bacaKelompokKeadaan, bacaMenungguTandaTangan, bacaPasangan, bacaPendudukIds, bacaPermohonanSatu, bacaRiwayatPermohonan, hitungBaris,
  hitungPerStatus, syaratDaftar, syaratIdPermohonan, syaratPerPenduduk, urutanDaftar, urutanPerPenduduk, type PasanganPermohonan, type RekamPermohonan,
} from './repositori'

export type KonteksPermohonan = KonteksLayanan
export type HasilDaftarPermohonan = { data: BarisPermohonan[]; meta: { page: number; pageSize: number; total: number } }

export const PESAN_PERMOHONAN_TIDAK_ADA = 'Permohonan tidak ditemukan.'
export const permohonanTidakAda = (): GalatApp => new GalatApp('NOT_FOUND', PESAN_PERMOHONAN_TIDAK_ADA, 404)
const dataTidakUtuh = (): GalatApp => new GalatApp('SERVER', PESAN_DATA_TIDAK_UTUH, 500)

/**
 * Seluruh yang dibutuhkan ruang kerja dan lembar surat: jenis, pemohon, subjek, mutasi, pengaturan, dan pejabat. Pemohon dan
 * subjek dibaca tanpa batas dusun (bayi atau almarhum bisa tercatat di dusun lain, ruling 6) karena permohonannya sendiri sudah
 * melewati cakupan pemanggil. Data yang tidak utuh gagal tertutup 500.
 */
export async function bentukDetail(k: Pick<KonteksLayanan, 'db' | 'penyandi'>, rekam: RekamPermohonan, riwayat?: Awaited<ReturnType<typeof bacaRiwayatPermohonan>>): Promise<DetailPermohonan> {
  const jenis = await bacaJenisSatu(k.db, rekam.jenisId)
  const pemohon = await bacaPendudukSatu(k.db, rekam.pemohonId, null)
  if (!jenis || !pemohon) throw dataTidakUtuh()
  const subjek = rekam.subjekId === null ? null : await bacaPendudukSatu(k.db, rekam.subjekId, null)
  const mutasi = rekam.mutasiId === null ? null : await bacaMutasiSatu(k.db, rekam.mutasiId)
  if (subjek === undefined || mutasi === undefined) throw dataTidakUtuh()
  const hasil = detailPermohonanSchema.safeParse({
    permohonan: bentukPermohonan(rekam, riwayat ?? (await bacaRiwayatPermohonan(k.db, rekam.id)), k.penyandi),
    jenis,
    pemohon: bentukPenduduk(pemohon, k.penyandi),
    subjek: subjek === null ? null : bentukPenduduk(subjek, k.penyandi),
    mutasi: mutasi === null ? null : bentukMutasi(mutasi.rekam, mutasi.pendudukIds),
    pengaturan: await bacaPengaturanSurat(k.db, rekam.desaId),
    pejabat: await namaPejabat(k.db, rekam.desaId),
  })
  if (!hasil.success) throw dataTidakUtuh()
  return hasil.data
}

/** Satu halaman daftar untuk satu tab status (SPEC §7.4). Periode hanya membatasi status tertutup. */
export async function daftarPermohonan(k: KonteksPermohonan, f: FilterPermohonan): Promise<HasilDaftarPermohonan> {
  const syarat = syaratDaftar({ dusunSaja: cakupanDusun(k.pelaku), jenisKode: f.jenis ?? null, status: f.status, tutupSejak: awalPeriode(f.periode, k.hariIni) })
  const total = await hitungBaris(k.db, syarat)
  const baris = await bacaBaris(k.db, syarat, urutanDaftar(f.status), { batas: f.pageSize, lewati: (f.page - 1) * f.pageSize })
  return { data: baris.map((b) => bentukBaris(b, k.penyandi)), meta: { page: f.page, pageSize: f.pageSize, total } }
}

/** Angka tab per status (periode dan jenis berlaku) dan angka menu "perlu tindakan" peran aktif (seluruh cakupan, tanpa periode). */
export async function jumlahPermohonan(k: Pick<KonteksPermohonan, 'db' | 'pelaku' | 'hariIni'>, f: Pick<FilterPermohonan, 'periode' | 'jenis'>): Promise<JumlahPermohonan> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const per = await hitungPerStatus(k.db, syaratDaftar({ dusunSaja, jenisKode: f.jenis ?? null, tutupSejak: awalPeriode(f.periode, k.hariIni) }))
  const status = Object.fromEntries(STATUS_PERMOHONAN.map((s) => [s, per.get(s) ?? 0])) as Record<StatusPermohonan, number>
  // Aturan "perlu tindakan" hanya ada di kontrak: kelompok (status, tahap, ada pengembalian) dihitung SQL, lalu dinilai fungsi kontrak.
  const kelompok = await bacaKelompokKeadaan(k.db, dusunSaja)
  const tindakan = kelompok.reduce((n, g) => {
    const contoh = { status: g.status as StatusPermohonan, tahap: g.tahap as Permohonan['tahap'], dikembalikan: g.dikembalikan ? ({} as NonNullable<Permohonan['dikembalikan']>) : null }
    return n + g.jumlah * perluTindakan(k.pelaku.peran, [contoh])
  }, 0)
  return { status, perluTindakan: tindakan }
}

export async function detailPermohonan(k: KonteksPermohonan, id: string): Promise<DetailPermohonan> {
  const rekam = await bacaPermohonanSatu(k.db, id, cakupanDusun(k.pelaku))
  if (!rekam) throw permohonanTidakAda()
  return bentukDetail(k, rekam)
}

/**
 * Surat yang menunggu tanda tangan dan boleh ditandatangani peran ini: Kepala Desa semuanya, Sekretaris Desa hanya jenis yang
 * boleh atas nama. Terlama dulu, lengkap dengan detail untuk lembar yang dibaca di tumpukan.
 */
export async function antreanTandaTangan(k: KonteksPermohonan): Promise<DetailPermohonan[]> {
  const rekam = await bacaMenungguTandaTangan(k.db, cakupanDusun(k.pelaku))
  const jenis = new Map((await bacaJenisDesa(k.db)).map((j) => [j.id, j]))
  const hasil: DetailPermohonan[] = []
  for (const r of rekam) {
    const j = jenis.get(r.jenisId)
    if (j && peranMengizinkan('tandatangani', k.pelaku.peran, j)) hasil.push(await bentukDetail(k, r))
  }
  return hasil
}

const MAKS_HASIL_CARI = 100

/**
 * Pencarian permohonan: kata bergaris miring dibaca nomor surat (huruf besar dan kecil sama); selain itu nama atau potongan NIK
 * pemohon maupun orang yang diterangkan, dengan pencocokan kontrak yang sama dengan daftar penduduk. Semua status, terbaru dulu,
 * paling banyak 100. NIK dibuka dari sandi hanya untuk orang yang terkait permohonan dalam cakupan, tidak untuk seluruh desa.
 */
export async function cariPermohonan(k: KonteksPermohonan, kata: string, jenis: string | null): Promise<HasilDaftarPermohonan> {
  const pasangan = await bacaPasangan(k.db, syaratDaftar({ dusunSaja: cakupanDusun(k.pelaku), jenisKode: jenis }))
  let cocok: PasanganPermohonan[]
  if (kata.includes('/')) {
    const nomor = kata.toUpperCase()
    cocok = pasangan.filter((p) => p.nomor?.includes(nomor) ?? false)
  } else if (!kataCukup(kata)) {
    cocok = []
  } else {
    const rekam = await bacaPendudukIds(k.db, [...new Set(pasangan.flatMap((p) => (p.subjekId === null ? [p.pemohonId] : [p.pemohonId, p.subjekId])))])
    const sama = new Set(
      rekam
        .filter((r) => cocokPenduduk({ nama: r.nama, nik: r.nikSandi === null ? null : k.penyandi.bukaSandi(r.nikSandi, ruang.nik(r.desaId)) }, kata, ''))
        .map((r) => r.id),
    )
    cocok = pasangan.filter((p) => sama.has(p.pemohonId) || (p.subjekId !== null && sama.has(p.subjekId)))
  }
  const halaman = cocok.slice(0, MAKS_HASIL_CARI)
  const baris = halaman.length === 0 ? [] : await bacaBaris(k.db, syaratIdPermohonan(halaman.map((p) => p.id)), urutanPerPenduduk())
  return { data: baris.map((b) => bentukBaris(b, k.penyandi)), meta: { page: 1, pageSize: MAKS_HASIL_CARI, total: cocok.length } }
}

/** Semua permohonan satu penduduk, sebagai pemohon atau yang diterangkan, terbaru dulu, dalam satu halaman. */
export async function permohonanPerPenduduk(k: KonteksPermohonan, pendudukId: string): Promise<HasilDaftarPermohonan> {
  const baris = await bacaBaris(k.db, syaratPerPenduduk(pendudukId, cakupanDusun(k.pelaku)), urutanPerPenduduk())
  const data = baris.map((b) => bentukBaris(b, k.penyandi))
  return { data, meta: { page: 1, pageSize: Math.max(data.length, 1), total: data.length } }
}

const lampiranTersimpanSchema = z.array(z.object({ id: z.string(), berkas: z.string() }))

export const PESAN_LAMPIRAN_TIDAK_ADA = 'Lampiran tidak ditemukan.'

/**
 * Isi satu lampiran permohonan untuk dibuka petugas. Permohonan dibaca dengan cakupan dusun lebih dulu (di luar cakupan = 404
 * seperti tidak ada), lampiran dicocokkan dengan daftar lampiran permohonan itu sendiri, baru isinya dibuka. Lampiran dari data
 * contoh hanya punya nama dan ukuran, tanpa isi: dijawab 404 "Berkas tidak tersimpan." (8F3 Ruling 10).
 */
export async function bukaLampiran(
  k: Pick<KonteksLayanan, 'db' | 'penyandi' | 'pelaku'>, permohonanId: string, lampiranId: string,
): Promise<{ tipe: TipeBerkas; nama: string; bita: Buffer }> {
  const rekam = await bacaPermohonanSatu(k.db, permohonanId, cakupanDusun(k.pelaku))
  if (!rekam) throw permohonanTidakAda()
  const daftar = lampiranTersimpanSchema.safeParse(rekam.lampiran)
  if (!daftar.success) throw dataTidakUtuh()
  const lampiran = daftar.data.find((l) => l.id === lampiranId)
  if (!lampiran) throw new GalatApp('NOT_FOUND', PESAN_LAMPIRAN_TIDAK_ADA, 404)
  const isi = await bacaBerkas(k.db, k.penyandi, { id: lampiran.id, permohonanId: rekam.id })
  if (!isi) throw new GalatApp('NOT_FOUND', PESAN_BERKAS_TIDAK_TERSIMPAN, 404)
  return { tipe: isi.tipe, nama: lampiran.berkas, bita: isi.bita }
}
