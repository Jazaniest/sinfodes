import type postgres from 'postgres'

/** Pesan galat yang aman dicetak ke terminal pemilik. */
export class GalatBukaKunci extends Error {
  constructor(pesan: string) {
    super(pesan)
    this.name = 'GalatBukaKunci'
  }
}

export const JENIS_KUNCI = ['konsol', 'kabupaten', 'warga', 'panel', 'semua'] as const

/**
 * Menghapus kunci percobaan masuk yang sedang berlaku (lewat peran migrasi, pemilik skema). Jalan keluar bila akun yang
 * sah, terutama satu-satunya akun Konsol, terkunci oleh orang yang sengaja salah memasukkan kata sandi berulang kali.
 * Mengembalikan jumlah baris yang dihapus.
 */
export async function bukaKunci(sql: postgres.Sql, jenis: string): Promise<number> {
  if (!(JENIS_KUNCI as readonly string[]).includes(jenis)) throw new GalatBukaKunci(`Jenis kunci tidak dikenal. Pilihan: ${JENIS_KUNCI.join(', ')}.`)
  let dihapus = 0
  if (jenis === 'konsol' || jenis === 'kabupaten' || jenis === 'semua') {
    const baris = jenis === 'semua' ? await sql`delete from kunci_masuk_platform returning 1` : await sql`delete from kunci_masuk_platform where jenis = ${jenis} returning 1`
    dihapus += baris.length
  }
  if (jenis === 'warga' || jenis === 'panel' || jenis === 'semua') {
    const baris = jenis === 'semua' ? await sql`delete from kunci_masuk_desa returning 1` : await sql`delete from kunci_masuk_desa where jenis = ${jenis} returning 1`
    dihapus += baris.length
  }
  return dihapus
}
