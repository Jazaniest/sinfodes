import { stringifySearchWith } from '@tanstack/react-router'

/**
 * Nilai parameter URL dibaca sebagai JSON hanya bila berupa objek, larik, atau teks berkutip (tautan lama). Angka, kode
 * wilayah (14.10), dan nomor RT (001) tetap teks apa adanya: URL tidak berkutip dan nol tidak hilang (tahap 6D).
 * Teks biasa sengaja melempar galat: `stringifySearchWith` hanya mengutip teks yang berhasil dibaca parser.
 */
export function bacaNilaiUrl(teks: string): unknown {
  if (!/^[[{"]/.test(teks)) throw new SyntaxError('Bukan JSON')
  return JSON.parse(teks)
}

function nilaiDariUrl(teks: string): unknown {
  try {
    return bacaNilaiUrl(teks)
  } catch {
    return teks
  }
}

/**
 * Pengganti `parseSearchWith`: `decode` bawaan TanStack mengubah "14" dan "14.05" menjadi angka sebelum parser dipanggil
 * (sementara "14.10" tetap teks), sehingga filter kode wilayah tanpa kutip gagal. Di sini setiap nilai dibaca dari teks
 * aslinya. Kunci yang berulang menjadi larik, sama dengan bawaan.
 */
export function parseSearch(cari: string): Record<string, unknown> {
  const hasil: Record<string, unknown> = {}
  for (const [kunci, teks] of new URLSearchParams(cari)) {
    const nilai = nilaiDariUrl(teks)
    const lama = hasil[kunci]
    hasil[kunci] = lama === undefined ? nilai : Array.isArray(lama) ? [...lama, nilai] : [lama, nilai]
  }
  return hasil
}

export const stringifySearch = stringifySearchWith(JSON.stringify, bacaNilaiUrl)
