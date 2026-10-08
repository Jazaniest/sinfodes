import type {
  Agama, GolonganDarah, HubunganKeluarga, JenisKelamin, Pekerjaan, Pendidikan, StatusPerkawinan,
} from '@/domain/penduduk/enum'

export type AnggotaPersona = {
  id: string
  nama: string
  jenisKelamin: JenisKelamin
  tanggalLahir: string
  tempatLahir: string
  hubungan: HubunganKeluarga
  statusPerkawinan: StatusPerkawinan
  pendidikan: Pendidikan
  pekerjaan: Pekerjaan
  agama: Agama
  golonganDarah: GolonganDarah
  nomorUrutNik: number
  nomorAktaLahir: string | null
  namaAyah: string
  namaIbu: string
  telepon: string | null
}

export type KeluargaPersona = {
  id: string
  dusunNomor: number
  rw: string
  rt: string
  tanggalTerbitKk: string
  nomorUrutKk: number
  anggota: AnggotaPersona[]
}

/** Keluarga tetap untuk alur demo (SPEC §12.9, §13.5). NIK = 140509 + tanggal lahir + nomor urut 8xxx. */
export const PERSONA: KeluargaPersona[] = [
  {
    id: 'kk_syahrial', dusunNomor: 1, rw: '002', rt: '004', tanggalTerbitKk: '2023-11-20', nomorUrutKk: 8004,
    anggota: [
      { id: 'pdk_syahrial', nama: 'Syahrial', jenisKelamin: 'L', tanggalLahir: '1987-04-09', tempatLahir: 'Teluk Meranti',
        hubungan: 'Kepala Keluarga', statusPerkawinan: 'Kawin Tercatat', pendidikan: 'SLTA/Sederajat',
        pekerjaan: 'Nelayan/Perikanan', agama: 'Islam', golonganDarah: 'B', nomorUrutNik: 8003, nomorAktaLahir: null,
        namaAyah: 'Hasan Basri', namaIbu: 'Maimunah', telepon: '081371442918' },
      { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah', jenisKelamin: 'P', tanggalLahir: '1991-03-12', tempatLahir: 'Teluk Meranti',
        hubungan: 'Istri', statusPerkawinan: 'Kawin Tercatat', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Mengurus Rumah Tangga',
        agama: 'Islam', golonganDarah: 'O', nomorUrutNik: 8002, nomorAktaLahir: null, namaAyah: 'Abdul Rahman',
        namaIbu: 'Rosnah', telepon: '081277402231' },
      { id: 'pdk_nur_aini', nama: 'Nur Aini', jenisKelamin: 'P', tanggalLahir: '2015-08-21', tempatLahir: 'Teluk Meranti',
        hubungan: 'Anak', statusPerkawinan: 'Belum Kawin', pendidikan: 'Belum Tamat SD/Sederajat', pekerjaan: 'Pelajar/Mahasiswa',
        agama: 'Islam', golonganDarah: 'Tidak Tahu', nomorUrutNik: 8001, nomorAktaLahir: '1405-LT-02092015-0318',
        namaAyah: 'Syahrial', namaIbu: 'Siti Rahmah', telepon: null },
      { id: 'pdk_muhammad_alif', nama: 'Muhammad Alif', jenisKelamin: 'L', tanggalLahir: '2023-11-02',
        tempatLahir: 'Pangkalan Kerinci', hubungan: 'Anak', statusPerkawinan: 'Belum Kawin', pendidikan: 'Tidak/Belum Sekolah',
        pekerjaan: 'Belum/Tidak Bekerja', agama: 'Islam', golonganDarah: 'Tidak Tahu', nomorUrutNik: 8001,
        nomorAktaLahir: '1405-LT-20112023-0741', namaAyah: 'Syahrial', namaIbu: 'Siti Rahmah', telepon: null },
    ],
  },
  {
    id: 'kk_zulkifli', dusunNomor: 3, rw: '005', rt: '012', tanggalTerbitKk: '2019-03-18', nomorUrutKk: 8004,
    anggota: [
      { id: 'pdk_zulkifli', nama: 'Zulkifli', jenisKelamin: 'L', tanggalLahir: '1984-06-17', tempatLahir: 'Teluk Meranti',
        hubungan: 'Kepala Keluarga', statusPerkawinan: 'Kawin Tercatat', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Wiraswasta',
        agama: 'Islam', golonganDarah: 'A', nomorUrutNik: 8005, nomorAktaLahir: null, namaAyah: 'Ismail', namaIbu: 'Zubaidah',
        telepon: '081371185570' },
      { id: 'pdk_rosnani', nama: 'Rosnani', jenisKelamin: 'P', tanggalLahir: '1988-01-25', tempatLahir: 'Teluk Meranti',
        hubungan: 'Istri', statusPerkawinan: 'Kawin Tercatat', pendidikan: 'SLTP/Sederajat', pekerjaan: 'Pedagang',
        agama: 'Islam', golonganDarah: 'O', nomorUrutNik: 8001, nomorAktaLahir: null, namaAyah: 'Idris', namaIbu: 'Halimah',
        telepon: '082174390016' },
      { id: 'pdk_fauzan', nama: 'Fauzan', jenisKelamin: 'L', tanggalLahir: '2010-05-14', tempatLahir: 'Teluk Meranti',
        hubungan: 'Anak', statusPerkawinan: 'Belum Kawin', pendidikan: 'SLTP/Sederajat', pekerjaan: 'Pelajar/Mahasiswa',
        agama: 'Islam', golonganDarah: 'Tidak Tahu', nomorUrutNik: 8001, nomorAktaLahir: '1405-LT-28052010-0122',
        namaAyah: 'Zulkifli', namaIbu: 'Rosnani', telepon: null },
      { id: 'pdk_aulia_putri', nama: 'Aulia Putri', jenisKelamin: 'P', tanggalLahir: '2014-10-03', tempatLahir: 'Teluk Meranti',
        hubungan: 'Anak', statusPerkawinan: 'Belum Kawin', pendidikan: 'Belum Tamat SD/Sederajat', pekerjaan: 'Pelajar/Mahasiswa',
        agama: 'Islam', golonganDarah: 'Tidak Tahu', nomorUrutNik: 8001, nomorAktaLahir: '1405-LT-15102014-0287',
        namaAyah: 'Zulkifli', namaIbu: 'Rosnani', telepon: null },
    ],
  },
]
