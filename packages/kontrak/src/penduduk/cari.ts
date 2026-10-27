import type { Penduduk } from './schema'

/** Huruf kecil, tanpa tanda diakritik, spasi tunggal. */
export function normalisasi(teks: string): string {
  return teks
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Kata cari yang isinya angka (boleh dipisah spasi, titik, atau strip) → digitnya; selain itu null. */
export function kataAngka(kata: string): string | null {
  const bersih = kata.replace(/[\s.-]/g, '')
  return /^\d+$/.test(bersih) ? bersih : null
}

/** Setiap potongan kata harus ada di nama: "rah siti" cocok dengan "Siti Rahmah". */
export function cocokNama(nama: string, kata: string): boolean {
  const n = normalisasi(nama)
  const potongan = normalisasi(kata).split(' ').filter(Boolean)
  return potongan.length > 0 && potongan.every((k) => n.includes(k))
}

/** Kata cari layak dikirim: nama ≥ 2 huruf, angka ≥ 4 digit. */
export function kataCukup(kata: string): boolean {
  const angka = kataAngka(kata)
  return angka !== null ? angka.length >= 4 : normalisasi(kata).length >= 2
}

/** Cocok lewat nama, atau potongan ≥ 4 digit dari NIK / nomor KK (SPEC §6.2). */
export function cocokPenduduk(p: Pick<Penduduk, 'nama' | 'nik'>, kata: string, nomorKk: string): boolean {
  if (!kataCukup(kata)) return false
  const angka = kataAngka(kata)
  if (angka !== null) return (p.nik?.includes(angka) ?? false) || nomorKk.includes(angka)
  return cocokNama(p.nama, kata)
}
