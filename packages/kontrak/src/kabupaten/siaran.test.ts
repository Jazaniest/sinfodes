import { describe, expect, it } from 'vitest'
import {
  barisCsvSiaran, desaSiaranSchema, isianSiaranSchema, kalimatSasaran, KOLOM_CSV_SIARAN, labelStatusSiaran, lewatTenggatSiaran,
  statusSiaranDesa, tindakLanjutSchema,
} from './siaran'

const dasar = { judul: 'Rapat evaluasi', isi: 'Mohon hadir.', tindakLanjut: null, sasaran: { jenis: 'semua' } }
const pesan = (hasil: { success: boolean; error?: { issues: { message: string }[] } }) => hasil.error?.issues.map((i) => i.message)

describe('isian siaran (SPEC-V0.2 §8.4 Menulis siaran)', () => {
  it('judul dan isi dipangkas; tindak lanjut boleh null', () => {
    const x = isianSiaranSchema.parse({ ...dasar, judul: '  Rapat evaluasi  ', isi: '  Mohon hadir.  ' })
    expect(x).toEqual({ ...dasar, judul: 'Rapat evaluasi', isi: 'Mohon hadir.' })
  })
  it('judul kosong atau 121 karakter, isi 5.001 karakter, dan sasaran kosong ditolak dengan pesannya', () => {
    expect(pesan(isianSiaranSchema.safeParse({ ...dasar, judul: '   ' }))).toEqual(['Judul wajib diisi.'])
    expect(pesan(isianSiaranSchema.safeParse({ ...dasar, judul: 'a'.repeat(121) }))).toEqual(['Paling banyak 120 karakter.'])
    expect(pesan(isianSiaranSchema.safeParse({ ...dasar, isi: '' }))).toEqual(['Isi siaran wajib diisi.'])
    expect(pesan(isianSiaranSchema.safeParse({ ...dasar, isi: 'a'.repeat(5001) }))).toEqual(['Paling banyak 5.000 karakter.'])
    expect(pesan(isianSiaranSchema.safeParse({ ...dasar, sasaran: { jenis: 'kecamatan', kode: [] } }))).toEqual([
      'Pilih paling sedikit satu kecamatan.',
    ])
    expect(pesan(isianSiaranSchema.safeParse({ ...dasar, sasaran: { jenis: 'desa', id: [] } }))).toEqual(['Pilih paling sedikit satu desa.'])
  })
  it('tindak lanjut tanpa tanggal ditolak', () => {
    expect(pesan(isianSiaranSchema.safeParse({ ...dasar, tindakLanjut: { tenggat: '' } }))).toEqual(['Pilih tanggal tenggat.'])
    expect(isianSiaranSchema.safeParse({ ...dasar, tindakLanjut: { tenggat: '2026-10-05' } }).success).toBe(true)
  })
  it('catatan tindak lanjut paling banyak 500 karakter, boleh kosong', () => {
    expect(tindakLanjutSchema.parse({ catatan: '  ' }).catatan).toBe('')
    expect(pesan(tindakLanjutSchema.safeParse({ catatan: 'a'.repeat(501) }))).toEqual(['Paling banyak 500 karakter.'])
  })
})

describe('kalimat sasaran', () => {
  it('semua, satu atau banyak kecamatan, satu atau banyak desa', () => {
    expect(kalimatSasaran({ jenis: 'semua', nama: [] })).toBe('Semua desa')
    expect(kalimatSasaran({ jenis: 'kecamatan', nama: ['Teluk Meranti'] })).toBe('Kecamatan Teluk Meranti')
    expect(kalimatSasaran({ jenis: 'kecamatan', nama: ['Teluk Meranti', 'Kuala Kampar', 'Bunut'] })).toBe('3 kecamatan')
    expect(kalimatSasaran({ jenis: 'desa', nama: ['Sungai Sialang'] })).toBe('Desa Sungai Sialang')
    expect(kalimatSasaran({ jenis: 'desa', nama: ['Sungai Sialang', 'Kuala Rengas'] })).toBe('2 desa pilihan')
  })
})

describe('status siaran per desa (SPEC-V0.2 §8.4 Di dasbor kabupaten)', () => {
  it('tanpa baris baca belum dibaca; dengan tindak lanjut ditindaklanjuti', () => {
    expect(statusSiaranDesa(undefined)).toBe('belum-dibaca')
    expect(statusSiaranDesa({ tindakLanjut: null })).toBe('dibaca')
    expect(statusSiaranDesa({ tindakLanjut: { catatan: '' } })).toBe('ditindaklanjuti')
  })
  it('lewat tenggat hanya bila perlu tindak lanjut, tenggat sebelum hari ini, dan belum ditindaklanjuti', () => {
    const tl = { tenggat: '2026-09-23' }
    expect(lewatTenggatSiaran(tl, 'belum-dibaca', '2026-09-24')).toBe(true)
    expect(lewatTenggatSiaran(tl, 'dibaca', '2026-09-24')).toBe(true)
    expect(lewatTenggatSiaran(tl, 'ditindaklanjuti', '2026-09-24')).toBe(false)
    expect(lewatTenggatSiaran({ tenggat: '2026-09-24' }, 'belum-dibaca', '2026-09-24')).toBe(false)
    expect(lewatTenggatSiaran(null, 'belum-dibaca', '2026-09-24')).toBe(false)
  })
  it('label status', () => {
    expect(labelStatusSiaran('belum-dibaca', true)).toBe('Belum dibaca · lewat tenggat')
    expect(labelStatusSiaran('dibaca', false)).toBe('Dibaca')
    expect(labelStatusSiaran('ditindaklanjuti', false)).toBe('Ditindaklanjuti')
  })
  it('baris status ketat: kabupaten tidak menerima kunci tambahan', () => {
    const baris = { id: 'desa_x', nama: 'X', kecamatan: 'Y', status: 'dibaca', dibacaPada: '2026-09-24T10:00:00+07:00', tindakLanjut: null }
    expect(desaSiaranSchema.safeParse(baris).success).toBe(true)
    expect(desaSiaranSchema.safeParse({ ...baris, nik: '1405' }).success).toBe(false)
  })
})

describe('CSV status siaran', () => {
  it('kolom berurutan; tanggal null menjadi sel kosong (null)', () => {
    expect(KOLOM_CSV_SIARAN).toEqual(['Kecamatan', 'Desa', 'Status', 'Dibaca pada', 'Ditindaklanjuti pada', 'Catatan tindak lanjut'])
    const belum = { id: 'd', nama: 'Kuala Rengas', kecamatan: 'Teluk Meranti', status: 'belum-dibaca' as const, dibacaPada: null, tindakLanjut: null }
    expect(barisCsvSiaran(belum, { tenggat: '2026-09-20' }, '2026-09-24')).toEqual([
      'Teluk Meranti', 'Kuala Rengas', 'Belum dibaca · lewat tenggat', null, null, null,
    ])
    const sudah = {
      ...belum, status: 'ditindaklanjuti' as const, dibacaPada: '2026-09-21T10:05:00+07:00',
      tindakLanjut: { pada: '2026-09-22T08:00:00+07:00', catatan: 'Hadir.' },
    }
    expect(barisCsvSiaran(sudah, { tenggat: '2026-09-20' }, '2026-09-24')).toEqual([
      'Teluk Meranti', 'Kuala Rengas', 'Ditindaklanjuti', '2026-09-21 10.05', '2026-09-22 08.00', 'Hadir.',
    ])
  })
})
