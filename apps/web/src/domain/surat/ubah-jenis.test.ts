import { describe, expect, it } from 'vitest'
import { contohJenis } from '@/test/contoh-surat'
import { formDariJenis, kunciDariLabel, periksaJenisSurat, sisipanTersedia, ubahJenisSuratSchema, type FormJenisSurat } from './ubah-jenis'

const sktm = (): FormJenisSurat => formDariJenis(contohJenis('SKTM'))

describe('periksa jenis surat sebelum disimpan (SPEC §7.4 layar 6, fokus review 3)', () => {
  it('semua jenis bawaan sah', () => {
    for (const kode of ['SKD', 'SKTM', 'SKU', 'SPCK', 'SKL', 'SKM', 'SPP', 'SKP', 'SPN', 'SKBN', 'SKBM', 'SKH']) {
      expect(periksaJenisSurat(formDariJenis(contohJenis(kode))), kode).toEqual({})
    }
  })
  it('isian dihapus padahal sisipannya masih dipakai; sisipan salah ketik', () => {
    const tanpaInstansi = { ...sktm(), isian: sktm().isian.filter((d) => d.kunci !== 'instansiTujuan') }
    expect(periksaJenisSurat(tanpaInstansi).teks).toBe('Sisipan [instansiTujuan] tidak dikenal. Hapus, atau tambahkan isiannya lebih dulu.')
    expect(periksaJenisSurat({ ...sktm(), teks: 'Benar penduduk [nama] di [alamt].' }).teks).toMatch(/^Sisipan \[alamt\] tidak dikenal/)
  })
  it('pilihan kurang dari dua, label kosong atau kembar', () => {
    const f = sktm()
    const isian = [
      { ...f.isian[0], pilihan: ['Pendidikan', ' '] },
      { ...f.isian[1], label: '  ' },
      { ...f.isian[2], label: 'keperluan' },
    ]
    expect(periksaJenisSurat({ ...f, isian })).toEqual({
      'isian.0.pilihan': 'Isi minimal dua pilihan',
      'isian.1.label': 'Label isian wajib diisi',
      'isian.2.label': 'Label isian sudah dipakai',
    })
  })
  it('nama, klasifikasi, masa berlaku, syarat, dan teks', () => {
    expect(periksaJenisSurat({ ...sktm(), nama: ' ', klasifikasi: '47', masaBerlakuBulan: 0, syarat: ['KTP', ''], teks: '' })).toEqual({
      nama: 'Nama surat wajib diisi',
      klasifikasi: 'Kode klasifikasi berupa 3 angka, boleh diikuti titik dan angka, mis. 474.1',
      masaBerlakuBulan: 'Masa berlaku 1 sampai 60 bulan',
      'syarat.1': 'Syarat tidak boleh kosong',
      teks: 'Teks surat wajib diisi',
    })
  })
})

describe('kunci isian dan sisipan', () => {
  it('kunci dari label: camelCase tanpa tanda baca; bentrok diberi angka', () => {
    expect(kunciDariLabel('Nama usaha', [])).toBe('namaUsaha')
    expect(kunciDariLabel('Nama usaha', ['namaUsaha'])).toBe('namaUsaha2')
    expect(kunciDariLabel('Nomor KTP (lama)', [])).toBe('nomorKtpLama')
    expect(kunciDariLabel('Nama', [])).toBe('nama2')
    expect(kunciDariLabel('2 saksi', [])).toBe('isian2Saksi')
    expect(kunciDariLabel('  ', [])).toBe('isian')
  })
  it('sisipan tersedia: umum, isian jenis ini, lalu tabel rincian', () => {
    const daftar = sisipanTersedia(sktm().isian).map((s) => s.kunci)
    expect(daftar.slice(0, 2)).toEqual(['nama', 'nik'])
    expect(daftar).toContain('instansiTujuan')
    expect(daftar.at(-1)).toBe('tabelRincian')
  })
  it('PATCH tidak bisa mengubah kode dan subjek surat', () =>
    expect(ubahJenisSuratSchema.parse({ kode: 'XX', subjek: 'kematian', nama: 'Surat Domisili' })).toEqual({ nama: 'Surat Domisili' }))
})
