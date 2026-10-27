import { formatTanggal } from '../format/tanggal'
import { alamatLengkap } from '../wilayah/alamat'
import type { Desa, Dusun } from '../wilayah/schema'
import type { BarisPenduduk } from './schema'

/**
 * Kolom Buku Induk Penduduk (Permendagri 47/2016, Buku Administrasi Penduduk). Dipakai juga sebagai kolom CSV
 * "Unduh", supaya keduanya selalu sama (SPEC §6.2).
 */
export const KOLOM_BUKU_INDUK = [
  'No', 'Nama lengkap', 'Jenis kelamin', 'Status perkawinan', 'Tempat lahir', 'Tanggal lahir', 'Agama',
  'Pendidikan terakhir', 'Pekerjaan', 'Dapat membaca huruf', 'Kewarganegaraan', 'Alamat lengkap',
  'Kedudukan dalam keluarga', 'NIK', 'Nomor KK', 'Keterangan',
] as const

type Konteks = { dusun: readonly Dusun[]; istilah: Desa['istilahWilayah'] }

function keterangan(p: BarisPenduduk): string {
  const isi: string[] = []
  if (p.nik === null) isi.push('Belum ada NIK')
  if (p.statusPenduduk === 'Sementara') isi.push('Penduduk sementara')
  if (p.statusDasar !== 'Hidup') isi.push(p.statusDasar)
  return isi.join('; ')
}

/** Satu baris Buku Induk. "Dapat membaca huruf" belum didata Sinfodes, jadi dibiarkan kosong. */
export function barisBukuInduk(p: BarisPenduduk, nomor: number, ctx: Konteks): string[] {
  return [
    String(nomor), p.nama, p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan', p.statusPerkawinan ?? '', p.tempatLahir,
    formatTanggal(p.tanggalLahir), p.agama, p.pendidikan ?? '', p.pekerjaan ?? '', '', p.kewarganegaraan,
    alamatLengkap(p, ctx.dusun, ctx.istilah), p.hubunganKeluarga, p.nik ?? '', p.nomorKk, keterangan(p),
  ]
}
