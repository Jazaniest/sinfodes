import { describe, expect, it } from 'vitest'
import {
  hargaTagihan,
  isianBuktiSchema,
  jadwalTagihan,
  labelStatusTagihan,
  lewatJatuhTempo,
  nomorTagihan,
  periodeTagihanBerikut,
  periodeTagihanMemuat,
  type Tagihan,
} from './tagihan'

const terbit = { status: 'terbit', jatuhTempo: '2026-10-15' } as Pick<Tagihan, 'status' | 'jatuhTempo'>

describe('periode tagihan', () => {
  it('triwulan berikut mengikuti kalender', () => {
    expect(periodeTagihanBerikut('triwulan', '2026-09-30')).toEqual({ mulai: '2026-10-01', sampai: '2026-12-31', label: 'Triwulan IV 2026' })
    expect(periodeTagihanBerikut('triwulan', '2026-12-31')).toEqual({ mulai: '2027-01-01', sampai: '2027-03-31', label: 'Triwulan I 2027' })
  })
  it('tanggal di tengah periode: periode berikut mulai sesudah tanggal itu', () => {
    expect(periodeTagihanBerikut('triwulan', '2026-08-15').mulai).toBe('2026-10-01')
    expect(periodeTagihanBerikut('triwulan', '2026-06-30').mulai).toBe('2026-07-01')
  })
  it('tahunan', () => {
    expect(periodeTagihanBerikut('tahunan', '2026-12-31')).toEqual({ mulai: '2027-01-01', sampai: '2027-12-31', label: 'Tahun 2027' })
    expect(periodeTagihanBerikut('tahunan', '2026-03-10').mulai).toBe('2027-01-01')
  })
  it('periode yang memuat tanggal', () => {
    expect(periodeTagihanMemuat('triwulan', '2026-09-24')).toEqual({ mulai: '2026-07-01', sampai: '2026-09-30', label: 'Triwulan III 2026' })
    expect(periodeTagihanMemuat('tahunan', '2026-09-24')).toEqual({ mulai: '2026-01-01', sampai: '2026-12-31', label: 'Tahun 2026' })
  })
})

describe('jadwal, harga, nomor', () => {
  it('terbit 14 hari sebelum mulai, jatuh tempo 14 hari sesudahnya', () => {
    expect(jadwalTagihan({ mulai: '2026-10-01' })).toEqual({ terbit: '2026-09-17', jatuhTempo: '2026-10-15' })
    expect(jadwalTagihan({ mulai: '2027-01-01' })).toEqual({ terbit: '2026-12-18', jatuhTempo: '2027-01-15' })
  })
  it('harga tahunan = 4 x triwulan', () => {
    expect(hargaTagihan('Dasar', 'triwulan')).toBe(1_500_000)
    expect(hargaTagihan('Lengkap', 'triwulan')).toBe(3_000_000)
    expect(hargaTagihan('Lengkap', 'tahunan')).toBe(12_000_000)
  })
  it('nomor tagihan', () => {
    expect(nomorTagihan({ mulai: '2026-10-01' }, 'triwulan', '001')).toBe('SFD/2026/T4/001')
    expect(nomorTagihan({ mulai: '2027-01-01' }, 'tahunan', '001')).toBe('SFD/2027/TH/001')
    expect(nomorTagihan({ mulai: '2026-04-01' }, 'triwulan', '017')).toBe('SFD/2026/T2/017')
  })
})

describe('label status', () => {
  it('terbit: belum dibayar sampai tepat hari jatuh tempo, lewat sesudahnya', () => {
    expect(lewatJatuhTempo(terbit, '2026-10-14')).toBe(false)
    expect(labelStatusTagihan(terbit, '2026-10-14')).toBe('Belum dibayar')
    expect(labelStatusTagihan(terbit, '2026-10-15')).toBe('Belum dibayar')
    expect(lewatJatuhTempo(terbit, '2026-10-16')).toBe(true)
    expect(labelStatusTagihan(terbit, '2026-10-16')).toBe('Lewat jatuh tempo')
  })
  it('status lain memakai label tetap, juga sesudah jatuh tempo', () => {
    for (const [status, label] of [['menunggu-verifikasi', 'Menunggu verifikasi'], ['lunas', 'Lunas'], ['dibatalkan', 'Dibatalkan']] as const) {
      expect(labelStatusTagihan({ status, jatuhTempo: '2026-10-15' }, '2027-01-01')).toBe(label)
      expect(lewatJatuhTempo({ status, jatuhTempo: '2026-10-15' }, '2027-01-01')).toBe(false)
    }
  })
})

describe('isianBuktiSchema', () => {
  const sah = { tanggalTransfer: '2026-09-20', namaPengirim: 'Pemdes Sungai Sialang', nominalTransfer: 3_000_127 }
  it('isian sah lolos dan nama dipangkas', () => {
    expect(isianBuktiSchema.parse({ ...sah, namaPengirim: '  Hendri  ' }).namaPengirim).toBe('Hendri')
  })
  it('pesan persis', () => {
    const galat = (isian: object) => isianBuktiSchema.safeParse(isian).error?.issues.map((i) => i.message)
    expect(galat({ ...sah, namaPengirim: 'a'.repeat(81) })).toEqual(['Paling banyak 80 karakter.'])
    expect(galat({ ...sah, namaPengirim: '   ' })).toEqual(['Nama rekening pengirim wajib diisi.'])
    expect(galat({ ...sah, nominalTransfer: 0 })).toEqual(['Nominal harus lebih dari 0.'])
    expect(galat({ ...sah, tanggalTransfer: '' })).toEqual(['Pilih tanggal transfer.'])
    expect(galat({ ...sah, nominalTransfer: undefined })).toEqual(['Isi nominal yang ditransfer.'])
    expect(isianBuktiSchema.safeParse({ ...sah, namaPengirim: 'a'.repeat(80) }).success).toBe(true)
  })
})
