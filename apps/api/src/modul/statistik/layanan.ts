import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { hitungStatistik, statistikPendudukSchema, type StatistikPenduduk } from '@sinfodes/kontrak/statistik/penduduk'
import { daftarDusunDesa, bacaIstilahWilayah } from '../../basisdata/desa'
import { GalatApp } from '../../galat'
import type { KonteksLayanan } from '../penduduk/layanan'
import { bacaPendudukStatistik } from './repositori'

export type KonteksStatistik = Pick<KonteksLayanan, 'db' | 'pelaku' | 'hariIni'> & { desaId: string }

/**
 * Statistik penduduk Hidup (SPEC-V0.2 §6.7) dengan `hitungStatistik` kontrak, fungsi yang sama dengan API tiruan. Kepala Dusun
 * selalu mendapat dusunnya sendiri dan permintaan dusun lain diabaikan; `dusunDiminta` yang bukan angka diabaikan (seluruh
 * desa), angka yang tak dikenal 422. KK dihitung dari KK berbeda di antara penduduk Hidup, jadi KK yang semua anggotanya sudah
 * keluar tidak ikut.
 */
export async function statistikPenduduk(k: KonteksStatistik, dusunDiminta: string | null): Promise<StatistikPenduduk> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const [dusun, istilah] = await Promise.all([daftarDusunDesa(k.db), bacaIstilahWilayah(k.db, k.desaId)])
  const dusunSendiri = dusunSaja === null ? null : (dusun.find((d) => d.id === dusunSaja)?.nomor ?? null)
  const nomor = dusunSendiri ?? (dusunDiminta !== null && /^\d+$/.test(dusunDiminta) ? Number(dusunDiminta) : null)
  const terpilih = nomor === null ? undefined : dusun.find((d) => d.nomor === nomor)
  if (nomor !== null && !terpilih) throw new GalatApp('VALIDATION', 'Dusun tidak dikenal.', 422)
  const baris = await bacaPendudukStatistik(k.db, terpilih?.id ?? dusunSaja)
  const kk = new Set(baris.map((b) => b.keluargaId)).size
  return statistikPendudukSchema.parse(hitungStatistik(baris, { hariIni: k.hariIni, dusun, istilah, dusunTerpilih: nomor, kk }))
}
