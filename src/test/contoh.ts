import type { Penduduk } from '@/domain/penduduk/schema'

/** Penduduk contoh yang valid; ubah field lewat `ubah`. Khusus untuk uji. */
export function contohPenduduk(ubah: Partial<Penduduk> = {}): Penduduk {
  return {
    id: 'pdk_contoh',
    desaId: 'desa_sungai_sialang',
    nik: '1405095203918002',
    nama: 'Siti Rahmah',
    jenisKelamin: 'P',
    golonganDarah: 'O',
    agama: 'Islam',
    kewarganegaraan: 'WNI',
    tempatLahir: 'Teluk Meranti',
    tanggalLahir: '1991-03-12',
    nomorAktaLahir: null,
    keluargaId: 'kk_contoh',
    hubunganKeluarga: 'Istri',
    namaAyah: 'Abdul Rahman',
    namaIbu: 'Rosnah',
    dusunId: 'dsn_ss_1',
    rw: '002',
    rt: '004',
    pendidikan: 'SLTA/Sederajat',
    pekerjaan: 'Mengurus Rumah Tangga',
    statusPerkawinan: 'Kawin Tercatat',
    statusDasar: 'Hidup',
    statusPenduduk: 'Tetap',
    ktpEl: 'Sudah rekam',
    telepon: '081277402231',
    catatan: null,
    dibuatPada: '2024-02-01T09:00:00+07:00',
    diubahPada: '2026-01-12T10:30:00+07:00',
    ...ubah,
  }
}
