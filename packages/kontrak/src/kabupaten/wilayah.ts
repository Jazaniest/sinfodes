import { labelKabupaten } from '../alamat/alamat'
import { bertitik, KABUPATEN } from '../wilayah/kode-wilayah'

/** "kab-pelalawan" → { kode: "14.05", nama: "Pelalawan" }; label yang tidak ada di tabel kode wilayah → null. */
export function kabupatenDariLabel(label: string): { kode: string; nama: string } | null {
  const temu = Object.entries(KABUPATEN).find(([, nama]) => labelKabupaten(nama) === label)
  return temu ? { kode: bertitik(temu[0]), nama: temu[1] } : null
}
