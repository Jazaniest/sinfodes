import { waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { barisKeluargaSchema, detailKeluargaSchema, type BarisKeluarga, type DetailKeluarga, type FilterKeluarga, type Keluarga } from '@sinfodes/kontrak/keluarga/schema'
import { cocokNama, kataAngka, kataCukup } from '@sinfodes/kontrak/penduduk/cari'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import { daftarDusunDesa } from '../../basisdata/desa'
import { GalatApp } from '../../galat'
import type { Penyandi } from '../../kripto/penyandi'
import { ruang } from '../../kripto/ruang'
import { bentukPenduduk, type KonteksLayanan } from '../penduduk/layanan'
import { bacaKeluargaDesa, bacaRingkasPendudukDesa, type RekamKeluarga, type RingkasPenduduk } from '../penduduk/repositori'
import { bacaAnggotaHidup, bacaKeluargaSatu } from './repositori'

export type KonteksKeluarga = Pick<KonteksLayanan, 'db' | 'penyandi' | 'pelaku'>
export type HasilDaftarKeluarga = { data: BarisKeluarga[]; meta: { page: number; pageSize: number; total: number } }

export const PESAN_KELUARGA_TIDAK_ADA = 'Data keluarga tidak ditemukan.'

/** Baris KK menjadi `Keluarga` kontrak: nomor KK dibuka dari sandi, anggota = id penduduk Hidup berurutan. */
export function bentukKeluarga(b: RekamKeluarga, penyandi: Penyandi, anggotaIds: string[]): Keluarga {
  return {
    id: b.id,
    desaId: b.desaId,
    nomorKk: penyandi.bukaSandi(b.nomorKkSandi, ruang.nomorKk(b.desaId)),
    kepalaKeluargaId: b.kepalaKeluargaId,
    dusunId: b.dusunId,
    rw: b.rw,
    rt: b.rt,
    tanggalTerbit: b.tanggalTerbit,
    anggotaIds,
  }
}

/** Nomor KK (potongan 4 angka atau lebih) atau nama kepala keluarga. */
function cocokKeluarga(nomorKk: string, namaKepala: string, kata: string): boolean {
  if (!kataCukup(kata)) return false
  const angka = kataAngka(kata)
  return angka !== null ? nomorKk.includes(angka) : cocokNama(namaKepala, kata)
}

/** Penduduk Hidup per KK, berurutan menurut `urutan_kk` lalu id. */
function anggotaPerKk(ringkas: readonly RingkasPenduduk[]): Map<string, RingkasPenduduk[]> {
  const peta = new Map<string, RingkasPenduduk[]>()
  for (const p of ringkas) {
    if (p.statusDasar !== 'Hidup') continue
    peta.set(p.keluargaId, [...(peta.get(p.keluargaId) ?? []), p])
  }
  for (const daftar of peta.values()) daftar.sort((a, b) => a.urutanKk - b.urutanKk || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return peta
}

/**
 * Daftar KK yang masih punya anggota Hidup, urut nama kepala lalu nomor KK. Nomor KK terenkripsi, jadi penyaringan nomor
 * dilakukan di aplikasi setelah dibuka (SPEC-V0.3 §7.6). KK tanpa anggota Hidup tidak tampil (SPEC-V0.2 §6.6).
 */
export async function daftarKeluarga(k: KonteksKeluarga, filter: FilterKeluarga, kata: string | null): Promise<HasilDaftarKeluarga> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const [rekam, ringkas, dusun] = await Promise.all([bacaKeluargaDesa(k.db, dusunSaja), bacaRingkasPendudukDesa(k.db, dusunSaja), daftarDusunDesa(k.db)])
  const perId = new Map(ringkas.map((p) => [p.id, p] as const))
  const anggota = anggotaPerKk(ringkas)
  const dusunId = filter.dusun === undefined ? undefined : (dusun.find((d) => d.nomor === filter.dusun)?.id ?? '-tidak ada-')

  const baris = rekam
    .filter((kk) => (anggota.get(kk.id)?.length ?? 0) > 0 && (dusunId === undefined || kk.dusunId === dusunId))
    .map((kk) => {
      const isi = anggota.get(kk.id) ?? []
      const keluarga = bentukKeluarga(kk, k.penyandi, isi.map((p) => p.id))
      const diperbarui = isi.reduce((maks, p) => (p.diubahPada > maks ? p.diubahPada : maks), isi[0].diubahPada)
      return { keluarga, namaKepala: perId.get(kk.kepalaKeluargaId)?.nama ?? '', jumlahAnggota: isi.length, diperbaruiPada: waktuIsoWib(diperbarui) }
    })
    .filter((b) => kata === null || cocokKeluarga(b.keluarga.nomorKk, b.namaKepala, kata))
    .sort((a, b) => a.namaKepala.localeCompare(b.namaKepala, 'id') || a.keluarga.nomorKk.localeCompare(b.keluarga.nomorKk))

  const mulai = (filter.page - 1) * filter.pageSize
  const halaman = baris.slice(mulai, mulai + filter.pageSize).map((b) => ({ ...b.keluarga, namaKepala: b.namaKepala, jumlahAnggota: b.jumlahAnggota, diperbaruiPada: b.diperbaruiPada }))
  return { data: barisKeluargaSchema.array().parse(halaman), meta: { page: filter.page, pageSize: filter.pageSize, total: baris.length } }
}

/** Detail KK beserta anggotanya. KK tanpa anggota Hidup tetap terbaca (nomor KK mantan anggota), dengan `anggota: []`. */
export async function detailKeluarga(k: KonteksKeluarga, id: string): Promise<DetailKeluarga> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const kk = await bacaKeluargaSatu(k.db, id, dusunSaja)
  if (!kk) throw new GalatApp('NOT_FOUND', PESAN_KELUARGA_TIDAK_ADA, 404)
  const anggota = await bacaAnggotaHidup(k.db, kk.id, dusunSaja)
  return detailKeluargaSchema.parse({
    keluarga: bentukKeluarga(kk, k.penyandi, anggota.map((p) => p.id)),
    anggota: anggota.map((p) => bentukPenduduk(p, k.penyandi)),
  })
}
