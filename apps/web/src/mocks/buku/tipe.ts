import { formatAngka } from '@/domain/format/angka'
import type { IsiSusunan } from '@/domain/buku/penduduk'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import type { DbDemo } from '@sinfodes/demo/tipe-db'

export { waktuTerakhir } from '@/domain/buku/penduduk'

/** Isi satu buku: kolom format Permendagri 47/2016 dan barisnya, semuanya teks siap cetak. */
export type IsiPenyusun = IsiSusunan

/** Penyusun satu buku dari data modul sumbernya (SPEC §8). Fungsi murni, tanpa menulis basis data. */
export type PenyusunBuku = (db: DbDemo, desaId: string) => IsiPenyusun

/** Desa, dusun, dan istilah wilayahnya, untuk label alamat. */
export function konteksWilayah(db: DbDemo, desaId: string): { desa: Desa; dusun: Dusun[]; istilah: Desa['istilahWilayah'] } {
  const desa = db.desa.find((d) => d.id === desaId)
  if (!desa) throw new Error(`Desa ${desaId} tidak ada`)
  const dusun = db.dusun.filter((d) => d.desaId === desaId).sort((a, b) => a.nomor - b.nomor)
  return { desa, dusun, istilah: desa.istilahWilayah }
}

/** Selisih seperti buku keuangan: angka negatif ditulis dalam kurung, mis. (1.250.000). */
export const selisih = (n: number): string => (n < 0 ? `(${formatAngka(-n)})` : formatAngka(n))
