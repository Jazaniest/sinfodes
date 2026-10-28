// Membuat berkas contoh impor untuk pengujian manual: `test/contoh/impor-3-baris.csv` dan `.xlsx` (isi sama). Tiga penduduk satu KK
// baru di Dusun III RW 005 RT 011 desa demo, NIK sah yang belum terdaftar. Dijalankan: `pnpm --filter @sinfodes/api tsx skrip/buat-contoh-impor.ts`.
import { buatNik } from '@sinfodes/kontrak/penduduk/nik'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buatCsvUji, buatXlsxUji } from '../test/helpers/berkas-uji'

const nik = (tanggalLahir: string, jenisKelamin: 'L' | 'P', nomorUrut: number) => buatNik({ kodeWilayah: '140509', tanggalLahir, jenisKelamin, nomorUrut })
const KK = '1405090305259990'
const KEPALA = ['NIK', 'Nama Lengkap', 'JK', 'Tmp Lahir', 'Tgl. Lahir', 'Agama', 'Pendidikan', 'Pekerjaan', 'Status Kawin', 'SHDK', 'No. KK', 'Dusun', 'RW', 'RT', 'Gol. Darah', 'No. HP']
const BARIS = [
  [nik('1984-02-14', 'L', 5001), 'Bambang Hartono', 'L', 'Teluk Rengas', '14-02-1984', 'Islam', 'SLTA/Sederajat', 'Wiraswasta', 'Kawin Tercatat', 'Kepala Keluarga', KK, 'III', '005', '011', 'O', '081377710001'],
  [nik('1986-09-03', 'P', 5002), 'Wahyuni', 'P', 'Teluk Rengas', '03-09-1986', 'Islam', 'SLTP/Sederajat', '', 'Kawin Tercatat', 'Istri', KK, 'III', '005', '011', 'A', ''],
  [nik('2012-11-25', 'L', 5003), 'Rizky Pratama', 'L', 'Teluk Rengas', '25-11-2012', 'Islam', '', '', 'Belum Kawin', 'Anak', KK, 'III', '005', '011', '', ''],
]

const folder = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'contoh')
mkdirSync(folder, { recursive: true })
writeFileSync(join(folder, 'impor-3-baris.csv'), buatCsvUji([KEPALA, ...BARIS], { pemisah: ';', bom: true, akhirBaris: '\r\n' }))
writeFileSync(join(folder, 'impor-3-baris.xlsx'), buatXlsxUji([KEPALA, ...BARIS]))
console.log(`Berkas contoh ditulis ke ${folder}`)
