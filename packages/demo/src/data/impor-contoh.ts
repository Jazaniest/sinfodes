import { angkaRomawi } from '@sinfodes/kontrak/format/romawi'
import { buatNik } from '@sinfodes/kontrak/penduduk/nik'
import type { Desa, Dusun } from '@sinfodes/kontrak/wilayah/schema'

/**
 * Berkas contoh untuk impor (SPEC §6.8). API tiruan tidak membaca isi berkas yang diunggah; laporannya selalu berisi
 * data ini: 17 baris dalam 4 KK, dengan lima baris yang sengaja bermasalah dan satu peringatan. Wilayahnya mengikuti desa
 * yang mengimpor (tahap 6C); untuk Sungai Sialang hasilnya Dusun III, RW 005, RT 011-013.
 */
export const NAMA_BERKAS_CONTOH = 'pendataan-rt-teluk-rengas.xlsx'

const KOLOM = [
  'NIK', 'Nama Lengkap', 'L/P', 'Tempat Lahir', 'Tgl. Lahir', 'Agama', 'Pendidikan', 'Pekerjaan', 'Status Kawin', 'SHDK',
  'No. KK', 'Dusun', 'RW', 'RT', 'Gol. Drh', 'Keterangan',
]

const KK_A = '1405091506249971'
const KK_B = '1405090203209974'
const KK_C = '1405091107219977'
const KK_D = '1405092508229980'
/** Siti Rahmah sudah terdaftar: baris yang memakainya harus tertolak sebagai NIK ganda. */
const NIK_TERDAFTAR = '1405095203918002'

const nik = (kode: string, lahir: string, jk: 'L' | 'P', urut: number) =>
  buatNik({ kodeWilayah: kode, tanggalLahir: lahir, jenisKelamin: jk, nomorUrut: urut })
const NIK_LASMA = nik('121201', '1978-06-15', 'P', 9979)

type Baris = {
  nik: string; nama: string; jk: 'L' | 'P'; tempat: string; tgl: string; agama?: string; pendidikan: string; pekerjaan: string
  kawin: string; shdk: string; kk: string; dusun: string; rw?: string; rt: string; gol?: string; ket?: string
}
/** Wilayah baris contoh di berkas aslinya: Dusun III Teluk Rengas, RW 005, RT 011-013 (data Sungai Sialang). */
const RW_CONTOH = '005'
const RT_CONTOH = ['011', '012', '013']
const sel = (b: Baris): string[] => [
  b.nik, b.nama, b.jk, b.tempat, b.tgl, b.agama ?? 'Islam', b.pendidikan, b.pekerjaan, b.kawin, b.shdk, b.kk, b.dusun, b.rw ?? RW_CONTOH, b.rt,
  b.gol ?? '', b.ket ?? '',
]

const BARIS: Baris[] = [
  { nik: nik('140509', '1986-02-14', 'L', 9971), nama: 'Rahmat Hidayat', jk: 'L', tempat: 'Teluk Meranti', tgl: '14/02/1986', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Petani/Pekebun', kawin: 'Kawin Tercatat', shdk: 'Kepala Keluarga', kk: KK_A, dusun: 'III', rt: '12', gol: 'A' },
  { nik: nik('140509', '1989-07-03', 'P', 9972), nama: 'Nurhasanah', jk: 'P', tempat: 'Teluk Meranti', tgl: '03/07/1989', pendidikan: 'SLTP/Sederajat', pekerjaan: 'Mengurus Rumah Tangga', kawin: 'Kawin Tercatat', shdk: 'Istri', kk: KK_A, dusun: 'III', rt: '12', gol: 'O' },
  { nik: nik('140509', '2012-11-20', 'L', 9973), nama: 'Dimas Hidayat', jk: 'L', tempat: 'Pangkalan Kerinci', tgl: '20/11/2012', pendidikan: 'Belum Tamat SD/Sederajat', pekerjaan: 'Pelajar/Mahasiswa', kawin: 'Belum Kawin', shdk: 'Anak', kk: KK_A, dusun: 'III', rt: '12' },
  { nik: nik('140509', '2017-05-09', 'P', 9974).slice(0, 15), nama: 'Putri Ramadhani', jk: 'P', tempat: 'Pangkalan Kerinci', tgl: '09/05/2017', pendidikan: 'Tidak/Belum Sekolah', pekerjaan: 'Belum/Tidak Bekerja', kawin: 'Belum Kawin', shdk: 'Anak', kk: KK_A, dusun: 'III', rt: '12', ket: 'NIK di KK lama terpotong' },
  { nik: nik('331001', '1979-09-30', 'L', 9975), nama: 'Sukirman', jk: 'L', tempat: 'Klaten', tgl: '30/09/1979', pendidikan: 'Tamat SD/Sederajat', pekerjaan: 'Buruh Harian Lepas', kawin: 'Kawin Tercatat', shdk: 'Kepala Keluarga', kk: KK_B, dusun: 'Dusun III', rt: '012', gol: 'B', ket: 'Pindahan dari Klaten 2020' },
  { nik: nik('331001', '1982-01-18', 'P', 9976), nama: 'Sumiati', jk: 'P', tempat: 'Klaten', tgl: '17/01/1982', pendidikan: 'Tamat SD/Sederajat', pekerjaan: 'Pedagang', kawin: 'Kawin Tercatat', shdk: 'Istri', kk: KK_B, dusun: 'Dusun III', rt: '012', gol: 'B' },
  { nik: NIK_TERDAFTAR, nama: 'Siti Rahmah', jk: 'P', tempat: 'Teluk Meranti', tgl: '12/03/1991', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Mengurus Rumah Tangga', kawin: 'Kawin Tercatat', shdk: 'Famili Lain', kk: KK_B, dusun: 'Dusun III', rt: '012', gol: 'O', ket: 'Menumpang sementara' },
  { nik: nik('140509', '2008-04-22', 'L', 9977), nama: 'Bagus Saputra', jk: 'L', tempat: 'Teluk Meranti', tgl: '22/04/2008', pendidikan: 'SLTP/Sederajat', pekerjaan: 'Pelajar/Mahasiswa', kawin: 'Belum Kawin', shdk: 'Anak', kk: KK_B, dusun: 'Dusun III', rt: '012' },
  { nik: nik('120201', '1975-12-01', 'L', 9978), nama: 'Hendra Gunawan Siregar', jk: 'L', tempat: 'Tarutung', tgl: '01/12/1975', agama: 'Kristen', pendidikan: 'Diploma IV / Strata I', pekerjaan: 'Guru', kawin: 'Kawin Tercatat', shdk: 'Kepala Keluarga', kk: KK_C, dusun: '3', rt: '011', gol: 'AB' },
  { nik: NIK_LASMA, nama: 'Lasma br. Sitorus', jk: 'P', tempat: 'Balige', tgl: '15/06/1978', agama: 'Kristen', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Mengurus Rumah Tangga', kawin: 'Kawin Tercatat', shdk: 'Istri', kk: KK_C, dusun: '3', rt: '011', gol: 'O' },
  { nik: NIK_LASMA, nama: 'Grace Siregar', jk: 'P', tempat: 'Teluk Meranti', tgl: '28/03/2005', agama: 'Kristen', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Pelajar/Mahasiswa', kawin: 'Belum Kawin', shdk: 'Anak', kk: KK_C, dusun: '3', rt: '011', ket: 'NIK tertukar dengan ibunya' },
  { nik: nik('140509', '2009-02-28', 'L', 9981), nama: 'Daniel Siregar', jk: 'L', tempat: 'Teluk Meranti', tgl: '31/02/2009', agama: 'Kristen', pendidikan: 'SLTP/Sederajat', pekerjaan: 'Pelajar/Mahasiswa', kawin: 'Belum Kawin', shdk: 'Anak', kk: KK_C, dusun: '3', rt: '011' },
  { nik: nik('140509', '1968-08-08', 'L', 9982), nama: 'Wan Azmi', jk: 'L', tempat: 'Teluk Meranti', tgl: '08/08/1968', pendidikan: 'Tamat SD/Sederajat', pekerjaan: 'Nelayan/Perikanan', kawin: 'Kawin Tercatat', shdk: 'Kepala Keluarga', kk: KK_D, dusun: 'Teluk Rengas', rt: '013', gol: 'A' },
  { nik: nik('140509', '1970-02-11', 'P', 9983), nama: 'Wan Habsah', jk: 'P', tempat: 'Teluk Meranti', tgl: '11/02/1970', pendidikan: 'Tidak/Belum Sekolah', pekerjaan: 'Mengurus Rumah Tangga', kawin: 'Kawin Tercatat', shdk: 'Istri', kk: KK_D, dusun: 'Teluk Rengas', rt: '013' },
  { nik: nik('140509', '1996-10-05', 'L', 9984), nama: 'Raja Muhammad', jk: 'L', tempat: 'Teluk Meranti', tgl: '05/10/1996', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Karyawan Swasta', kawin: 'Belum Kawin', shdk: 'Anak', kk: KK_D, dusun: 'Teluk Rengas', rt: '013' },
  { nik: nik('140509', '2001-01-19', 'L', 9985), nama: 'Tengku Fadli', jk: 'L', tempat: 'Teluk Meranti', tgl: '19/01/2001', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Wiraswasta', kawin: 'Belum Kawin', shdk: 'Keponakan', kk: KK_D, dusun: 'Teluk Rengas', rt: '013', ket: 'Anak kakak Wan Azmi' },
  { nik: nik('140509', '1945-04-02', 'P', 9986), nama: 'Wan Syarifah', jk: 'P', tempat: 'Teluk Meranti', tgl: '02/04/1945', pendidikan: 'Tidak/Belum Sekolah', pekerjaan: 'Belum/Tidak Bekerja', kawin: 'Cerai Mati', shdk: 'Orang Tua', kk: KK_D, dusun: 'Teluk Rengas', rt: '013' },
]

/**
 * Pindahkan wilayah satu baris contoh ke dusun sasaran, RW pertamanya, dan RT-RT di RW itu. Cara tulisnya dipertahankan
 * ("III", "Dusun III", "3", nama dusun; RT "12" atau "012"), jadi pemeriksaan wilayah tetap diuji.
 */
function pindahkanWilayah(b: Baris, d: Dusun, istilah: Desa['istilahWilayah']): Baris {
  const rw = d.rw[0]
  const rt = rw.rt[RT_CONTOH.indexOf(b.rt.padStart(3, '0')) % rw.rt.length].nomor
  const romawi = angkaRomawi(d.nomor)
  const caraTulis: Record<string, string> = { III: romawi, 'Dusun III': `${istilah.dusun} ${romawi}`, '3': String(d.nomor), 'Teluk Rengas': d.nama }
  return { ...b, dusun: caraTulis[b.dusun] ?? b.dusun, rw: rw.nomor, rt: b.rt.length < 3 ? String(Number(rt)) : rt }
}

/**
 * Salinan baru setiap kali dipanggil, supaya laporan impor yang tersimpan tidak saling berbagi larik. Wilayahnya dusun
 * ketiga desa (dusun terakhir bila desa punya kurang dari tiga); desa tanpa dusun ditolak lebih dulu oleh API impor.
 */
export function berkasContoh(
  dusun: readonly Dusun[],
  istilah: Desa['istilahWilayah'],
): { kolom: string[]; baris: { nomor: number; sel: string[] }[] } {
  const urut = [...dusun].sort((a, b) => a.nomor - b.nomor)
  const sasaran = urut[Math.min(2, urut.length - 1)]
  if (!sasaran) throw new Error('Desa belum punya dusun')
  return { kolom: [...KOLOM], baris: BARIS.map((b, i) => ({ nomor: i + 2, sel: sel(pindahkanWilayah(b, sasaran, istilah)) })) }
}
