import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '@/test/contoh'
import { contohJenis } from '@/test/contoh-surat'
import { contohSesi } from '@/test/sesi'
import type { Mutasi } from '../mutasi/schema'
import type { IsiLembar } from './isi-lembar'
import { KOSONG, susunLembar, type KonteksLembar } from './lembar'

const { desa, dusun } = contohSesi()
const siti = contohPenduduk()
const susun = (kode: string, isian: Record<string, string>, ubah: Partial<KonteksLembar> = {}) =>
  susunLembar({ jenis: contohJenis(kode), isian, pemohon: siti, subjek: null, mutasi: null, desa, dusun, tanggal: '2026-09-24', ...ubah })
const paragraf = (isi: IsiLembar) => isi.blok.flatMap((b) => (b.jenis === 'paragraf' ? [b.teks] : []))
const tabel = (isi: IsiLembar, ke: number) => {
  const b = isi.blok.filter((x) => x.jenis === 'tabel')[ke]
  return b?.jenis === 'tabel' ? b.baris.map((r) => [r.label, r.nilai]) : []
}

describe('susunLembar (SPEC §7.3, §7.5)', () => {
  it('Domisili: judul, pembuka, tabel pemohon, isi dengan sisipan, serta tempat dan tanggal', () => {
    const isi = susun('SKD', { keperluan: 'pendaftaran sekolah anak' })
    expect(isi.judul).toBe('SURAT KETERANGAN DOMISILI')
    expect(isi.pembuka).toBe(
      'Yang bertanda tangan di bawah ini, Kepala Desa Sungai Sialang, Kecamatan Teluk Meranti, Kabupaten Pelalawan, menerangkan bahwa:',
    )
    expect(isi.blok[0]).toEqual({
      jenis: 'tabel',
      baris: [
        { label: 'Nama', nilai: 'SITI RAHMAH', tebal: true },
        { label: 'NIK', nilai: '1405095203918002', tebal: false },
        { label: 'Tempat, tanggal lahir', nilai: 'Teluk Meranti, 12 Maret 1991', tebal: false },
        { label: 'Jenis kelamin', nilai: 'Perempuan', tebal: false },
        { label: 'Agama', nilai: 'Islam', tebal: false },
        { label: 'Status perkawinan', nilai: 'Kawin Tercatat', tebal: false },
        { label: 'Pekerjaan', nilai: 'Mengurus Rumah Tangga', tebal: false },
        { label: 'Kewarganegaraan', nilai: 'WNI', tebal: false },
        { label: 'Alamat', nilai: 'RT 004/RW 002, Dusun I Kampung Tengah, Desa Sungai Sialang', tebal: false },
      ],
    })
    expect(paragraf(isi)).toEqual([
      'Nama tersebut di atas adalah benar penduduk Desa Sungai Sialang dan berdomisili di RT 004/RW 002, Dusun I Kampung Tengah, Desa Sungai Sialang.',
      'Surat keterangan ini dibuat untuk keperluan pendaftaran sekolah anak dan berlaku sampai 24 Desember 2026.',
      'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
    ])
    expect(isi.tempatTanggal).toBe('Sungai Sialang, 24 September 2026')
  })
  it('isian kosong di pratinjau draf → tanda titik-titik', () => {
    expect(paragraf(susun('SKD', { keperluan: '' }))[1]).toBe(`Surat keterangan ini dibuat untuk keperluan ${KOSONG} dan berlaku sampai 24 Desember 2026.`)
    expect(tabel(susun('SKD', {}, { pemohon: contohPenduduk({ pekerjaan: null }) }), 0)).toContainEqual(['Pekerjaan', KOSONG])
  })
  it('Usaha: tabel rincian di posisi [tabelRincian]; tahun tanpa titik ribuan', () => {
    const isi = susun('SKU', { namaUsaha: 'Toko Bangunan Rengas Jaya', jenisUsaha: 'Perdagangan bahan bangunan', alamatUsaha: 'RT 012/RW 005', mulaiUsaha: '2016' })
    expect(isi.blok.map((b) => b.jenis)).toEqual(['tabel', 'paragraf', 'tabel', 'paragraf', 'paragraf'])
    expect(tabel(isi, 1)).toEqual([
      ['Nama usaha', 'Toko Bangunan Rengas Jaya'],
      ['Jenis usaha', 'Perdagangan bahan bangunan'],
      ['Alamat usaha', 'RT 012/RW 005'],
      ['Mulai usaha (tahun)', '2016'],
    ])
  })
  it('SKTM: pilihan ditulis huruf kecil di kalimat; isian tidak wajib yang kosong tidak dicetak', () => {
    const tanpa = susun('SKTM', { keperluan: 'Pendidikan', instansiTujuan: 'SMA Negeri 1 Teluk Meranti', anggotaDibantu: '' })
    expect(tanpa.blok.map((b) => b.jenis)).toEqual(['tabel', 'paragraf', 'paragraf', 'paragraf'])
    expect(paragraf(tanpa)[1]).toBe(
      'Surat keterangan ini diberikan untuk keperluan pendidikan pada SMA Negeri 1 Teluk Meranti dan berlaku sampai 24 Desember 2026.',
    )
    const dengan = susun('SKTM', { keperluan: 'Pendidikan', instansiTujuan: 'SMA Negeri 1 Teluk Meranti', anggotaDibantu: 'Nur Aini' })
    expect(tabel(dengan, 1)).toEqual([['Anggota keluarga yang dibantu', 'Nur Aini']])
  })
  it('Penghasilan: rupiah beserta terbilang; pekerjaan huruf kecil', () => {
    const isi = susun('SKP', { penghasilan: '1250000', keperluan: 'pengajuan beasiswa anak' }, { pemohon: contohPenduduk({ pekerjaan: 'Petani/Pekebun' }) })
    expect(paragraf(isi)[0]).toBe(
      'Nama tersebut di atas adalah benar penduduk Desa Sungai Sialang yang bekerja sebagai petani/pekebun dengan penghasilan rata-rata Rp1.250.000 (satu juta dua ratus lima puluh ribu rupiah) per bulan.',
    )
  })
  it('Kelahiran: tabel berisi data bayi dari subjek dan mutasinya; pemohon sebagai pelapor', () => {
    const bayi = contohPenduduk({
      id: 'pdk_bayi', nama: 'Nayla Safitri', nik: null, tanggalLahir: '2026-09-21', tempatLahir: 'Pelalawan',
      namaAyah: 'Zulkifli', namaIbu: 'Rosnani', pekerjaan: null, statusPerkawinan: null,
    })
    const lahir: Mutasi = {
      id: 'mts_contoh', desaId: 'desa_sungai_sialang', jenis: 'lahir', tanggal: '2026-09-21', pendudukIds: ['pdk_bayi'],
      dicatatOleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, dicatatPada: '2026-09-24T08:00:00+07:00',
      rincian: {
        jam: '05:20', tempatDilahirkan: 'Puskesmas', tempatLahir: 'Pelalawan', jenisKelahiran: 'Tunggal', anakKe: 3,
        penolong: 'Bidan/Perawat', beratGram: 3050, panjangCm: 49, ibuId: 'pdk_rosnani', ayahId: 'pdk_zulkifli', pelapor: 'Zulkifli',
      },
    }
    const isi = susun('SKL', { pelapor: 'Zulkifli' }, { subjek: bayi, mutasi: lahir })
    expect(tabel(isi, 0)).toEqual([
      ['Nama', 'NAYLA SAFITRI'],
      ['Jenis kelamin', 'Perempuan'],
      ['Tempat lahir', 'Pelalawan'],
      ['Hari, tanggal lahir', 'Senin, 21 September 2026'],
      ['Pukul', '05.20 WIB'],
      ['Anak ke', '3'],
      ['Nama ayah', 'Zulkifli'],
      ['Nama ibu', 'Rosnani'],
      ['Alamat', 'RT 004/RW 002, Dusun I Kampung Tengah, Desa Sungai Sialang'],
    ])
    expect(paragraf(isi)[0]).toContain('Kelahiran ini dilaporkan oleh Zulkifli.')
  })
  it('sisipan yang tidak dikenal dibiarkan, supaya kelihatan saat templat diubah', () => {
    const jenis = { ...contohJenis('SKD'), teks: 'Halo [entahApa].' }
    expect(paragraf(susun('SKD', {}, { jenis }))).toEqual(['Halo [entahApa].'])
  })
})
