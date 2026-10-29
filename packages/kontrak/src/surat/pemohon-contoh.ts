import { waktuIsoWib } from '../format/tanggal'
import type { Penduduk } from '../penduduk/schema'

/**
 * Pemohon tiruan untuk pratinjau jenis surat (tahap 6C). Tanpa NIK dan tanpa data siapa pun, jadi pratinjau tidak pernah
 * menampilkan data pribadi. Dipakai tiruan (desa yang belum punya penduduk) dan server (selalu, tahap 8F1 Ruling 4).
 */
export function pemohonContoh(desaId: string, sekarang: Date): Penduduk {
  const waktu = waktuIsoWib(sekarang)
  return {
    id: 'pemohon-contoh', desaId, nik: null, nama: 'Nama Pemohon', jenisKelamin: 'L', golonganDarah: 'Tidak Tahu', agama: 'Islam',
    kewarganegaraan: 'WNI', tempatLahir: 'Tempat Lahir', tanggalLahir: '1990-01-01', nomorAktaLahir: null, keluargaId: '',
    hubunganKeluarga: 'Kepala Keluarga', namaAyah: '', namaIbu: '', dusunId: '', rw: '001', rt: '001', pendidikan: null,
    pekerjaan: null, statusPerkawinan: null, statusDasar: 'Hidup', statusPenduduk: 'Tetap', ktpEl: 'Belum rekam', telepon: null,
    catatan: null, dibuatPada: waktu, diubahPada: waktu,
  }
}
