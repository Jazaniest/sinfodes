import { describe, expect, it } from 'vitest'
import { contohPermohonan } from '@/test/contoh-surat'
import { alasanSchema, catatanKembaliSchema, filterPermohonanSchema, permohonanSchema, type Terbit } from './permohonan'
import { TATA_LETAK_SIAP } from './tata-letak-siap'

const TERBIT: Terbit = {
  nomor: '470/087/SS/IX/2026',
  tahun: 2026,
  urut: 87,
  kodeVerifikasi: 'SS-7K3M-Q9TD',
  pada: '2026-09-24T10:00:00+07:00',
  penandatangan: { id: 'pgn_nasir', nama: 'H. Muhammad Nasir', peran: 'kades', nip: null },
  mode: 'tte',
  berlakuSampai: '2026-12-24',
  lembar: { judul: 'SURAT KETERANGAN DOMISILI', pembuka: 'Yang bertanda tangan …', blok: [], tempatTanggal: 'Sungai Sialang, 24 September 2026' },
  tataLetak: TATA_LETAK_SIAP.standar,
  kop: { lambang: null, lambangKabupaten: null },
}

describe('skema permohonan (SPEC §7.1)', () => {
  it('permohonan contoh lolos skema', () => expect(permohonanSchema.parse(contohPermohonan())).toEqual(contohPermohonan()))
  it('kode verifikasi surat terbit harus berpola, tanpa O/0/I/1', () => {
    expect(permohonanSchema.safeParse(contohPermohonan({ status: 'selesai', terbit: TERBIT })).success).toBe(true)
    const salah = { ...TERBIT, kodeVerifikasi: 'SS-7K3M-Q9T0' }
    expect(permohonanSchema.safeParse(contohPermohonan({ status: 'selesai', terbit: salah })).success).toBe(false)
  })
  it('filter bawaan: Menunggu, 14 hari terakhir, halaman 1 berisi 25', () =>
    expect(filterPermohonanSchema.parse({})).toEqual({ status: 'menunggu', periode: 14, page: 1, pageSize: 25 }))
  it('periode dari URL berupa teks; nilai di luar pilihan ditolak; jenis memakai kode kapital', () => {
    expect(filterPermohonanSchema.parse({ periode: '30' }).periode).toBe(30)
    expect(filterPermohonanSchema.safeParse({ periode: '7' }).success).toBe(false)
    expect(filterPermohonanSchema.safeParse({ jenis: 'skd' }).success).toBe(false)
    expect(filterPermohonanSchema.parse({ jenis: 'SKTM' }).jenis).toBe('SKTM')
  })
  it('alasan dan catatan wajib berisi, bukan hanya spasi', () => {
    expect(alasanSchema.safeParse({ alasan: '   ' }).success).toBe(false)
    expect(alasanSchema.parse({ alasan: ' Foto KTP buram ' })).toEqual({ alasan: 'Foto KTP buram' })
    expect(catatanKembaliSchema.safeParse({ catatan: '' }).success).toBe(false)
  })
})
