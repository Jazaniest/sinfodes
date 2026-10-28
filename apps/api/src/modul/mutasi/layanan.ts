import { tanggalIsoWib, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { barisMutasiSchema, ringkasanMutasiSchema, type BarisMutasi, type FilterMutasi, type RingkasanMutasi } from '@sinfodes/kontrak/mutasi/buku'
import { mutasiSchema, type Mutasi } from '@sinfodes/kontrak/mutasi/schema'
import { cakupanDusun } from '@sinfodes/kontrak/pengguna/hak-akses'
import type { Db } from '../../basisdata/klien'
import type { Pelaku } from '../../lapisan/konteks'
import { bacaMutasiHalaman, bacaPendudukMutasi, hitungMutasiPerJenis, type RekamMutasi } from './repositori'

export type KonteksMutasi = { db: Db; pelaku: Pelaku; hariIni: Date }
export type HasilDaftarMutasi = { data: BarisMutasi[]; meta: { page: number; pageSize: number; total: number } }

/**
 * Baris basis data menjadi `Mutasi` kontrak. `rincian` dipercaya dari basis data lalu diperiksa skema (gagal tertutup: bentuk
 * yang menyimpang tidak sampai ke klien). Daftar penduduk dipasang pemanggil dari `mutasi_penduduk`.
 */
export const bentukMutasi = (b: RekamMutasi, pendudukIds: readonly string[]): Mutasi =>
  mutasiSchema.parse({
    id: b.id,
    desaId: b.desaId,
    jenis: b.jenis,
    tanggal: b.tanggal,
    pendudukIds: [...pendudukIds],
    dicatatOleh: { id: b.dicatatOlehId, nama: b.dicatatOlehNama },
    dicatatPada: waktuIsoWib(b.dicatatPada),
    rincian: b.rincian,
  })

/** Satu halaman Buku Mutasi dengan nama penduduknya; nama penduduk di luar dusun Kepala Dusun tidak ikut (seperti tiruan). */
export async function daftarMutasi(k: KonteksMutasi, filter: FilterMutasi): Promise<HasilDaftarMutasi> {
  const dusunSaja = cakupanDusun(k.pelaku)
  const { baris, total } = await bacaMutasiHalaman(k.db, { jenis: filter.jenis, bulan: filter.bulan }, dusunSaja, filter)
  const penduduk = await bacaPendudukMutasi(k.db, baris.map((b) => b.id), dusunSaja)
  const data = baris.map((b) => {
    const orang = penduduk.get(b.id) ?? []
    return {
      mutasi: bentukMutasi(b, orang.map((p) => p.id)),
      penduduk: orang.flatMap((p) => (p.nama === null ? [] : [{ id: p.id, nama: p.nama }])),
    }
  })
  return { data: barisMutasiSchema.array().parse(data), meta: { page: filter.page, pageSize: filter.pageSize, total } }
}

/** Jumlah kejadian per jenis pada satu bulan; tanpa `bulan`, bulan berjalan menurut WIB. */
export async function ringkasanMutasi(k: KonteksMutasi, bulan: string | undefined): Promise<RingkasanMutasi> {
  const pakai = bulan ?? tanggalIsoWib(k.hariIni).slice(0, 7)
  const per = await hitungMutasiPerJenis(k.db, pakai, cakupanDusun(k.pelaku))
  return ringkasanMutasiSchema.parse({ bulan: pakai, lahir: per.get('lahir') ?? 0, meninggal: per.get('meninggal') ?? 0, pindah: per.get('pindah') ?? 0, datang: per.get('datang') ?? 0 })
}
