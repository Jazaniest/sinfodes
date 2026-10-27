import { formatTanggal } from '../format/tanggal'
import type { JenisKelamin } from './enum'
import type { NikValid } from './nik'

/**
 * Peringatan bila jenis kelamin atau tanggal lahir berbeda dengan isi NIK (SPEC §6.4).
 * Ini peringatan, bukan galat: data lapangan kadang memang begitu, jadi tetap bisa disimpan setelah konfirmasi.
 */
export function selisihDenganNik(
  hasil: NikValid,
  data: { jenisKelamin: JenisKelamin | ''; tanggalLahir: string },
): string[] {
  const pesan: string[] = []
  if (data.tanggalLahir !== '' && data.tanggalLahir !== hasil.tanggalLahir) {
    pesan.push(`Tanggal lahir berbeda dengan NIK (${formatTanggal(hasil.tanggalLahir, 'pendek')})`)
  }
  if (data.jenisKelamin !== '' && data.jenisKelamin !== hasil.jenisKelamin) {
    pesan.push(`Jenis kelamin berbeda dengan NIK (${hasil.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'})`)
  }
  return pesan
}
