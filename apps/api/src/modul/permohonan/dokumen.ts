import { createHash, randomInt } from 'node:crypto'
import type { Terbit } from '@sinfodes/kontrak/surat/permohonan'

/** JSON kanonik: kunci objek diurutkan rekursif, urutan array tetap, tanpa spasi. Kunci bernilai undefined dibuang seperti `JSON.stringify`. */
export function jsonKanonik(nilai: unknown): string {
  if (Array.isArray(nilai)) return `[${nilai.map((x) => jsonKanonik(x === undefined ? null : x)).join(',')}]`
  if (nilai !== null && typeof nilai === 'object') {
    const kunci = Object.keys(nilai).filter((k) => (nilai as Record<string, unknown>)[k] !== undefined).sort()
    return `{${kunci.map((k) => `${JSON.stringify(k)}:${jsonKanonik((nilai as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(nilai) ?? 'null'
}

/**
 * SHA-256 (heksadesimal) atas JSON kanonik seluruh objek `Terbit`: nomor, kode, waktu, penanda tangan, mode, masa berlaku,
 * lembar, tata letak, dan kop (rencana 8F2b Ruling 9). Disimpan di `hash_dokumen` dan menjadi masukan tanda tangan.
 */
export const hashDokumen = (terbit: Terbit): string => createHash('sha256').update(jsonKanonik(terbit)).digest('hex')

/** Angka acak aman di [0, 1) untuk kode verifikasi; tiruan memakai Math.random, server tidak boleh. */
export const acakAman = (): number => randomInt(0, 2 ** 32) / 2 ** 32
