import { formatAngka } from '@/domain/format/angka'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import type { DbDemo } from '../tipe-db'

/** Isi satu buku: kolom format Permendagri 47/2016 dan barisnya, semuanya teks siap cetak. */
export type IsiPenyusun = { kolom: readonly string[]; baris: string[][]; diperbarui: string | null }

/** Penyusun satu buku dari data modul sumbernya (SPEC §8). Fungsi murni, tanpa menulis basis data. */
export type PenyusunBuku = (db: DbDemo, desaId: string) => IsiPenyusun

/** Waktu ISO paling akhir; tanggal saja dianggap pukul 00.00 WIB. Null bila daftar kosong. */
export function waktuTerakhir(daftar: readonly string[]): string | null {
  const waktu = daftar.map((w) => (w.length === 10 ? `${w}T00:00:00+07:00` : w))
  return waktu.length === 0 ? null : waktu.reduce((a, b) => (b > a ? b : a))
}

/** Desa, dusun, dan istilah wilayahnya, untuk label alamat. */
export function konteksWilayah(db: DbDemo, desaId: string): { desa: Desa; dusun: Dusun[]; istilah: Desa['istilahWilayah'] } {
  const desa = db.desa.find((d) => d.id === desaId)
  if (!desa) throw new Error(`Desa ${desaId} tidak ada`)
  const dusun = db.dusun.filter((d) => d.desaId === desaId).sort((a, b) => a.nomor - b.nomor)
  return { desa, dusun, istilah: desa.istilahWilayah }
}

/** Selisih seperti buku keuangan: angka negatif ditulis dalam kurung, mis. (1.250.000). */
export const selisih = (n: number): string => (n < 0 ? `(${formatAngka(-n)})` : formatAngka(n))
