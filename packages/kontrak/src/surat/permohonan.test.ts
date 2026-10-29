import { describe, expect, it } from 'vitest'
import { contohPermohonan } from '../uji/contoh-surat'
import {
  alasanSchema,
  catatanKembaliSchema,
  filterPermohonanSchema,
  PESAN_CATATAN_NIK,
  permohonanSchema,
  type Terbit,
  ubahPermohonanSchema,
} from './permohonan'
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

describe('catatan tanpa NIK (tahap 8F2a, ruling 3)', () => {
  const pesan = (hasil: { success: boolean; error?: { issues: { message: string }[] } }) =>
    hasil.success ? null : hasil.error?.issues[0]?.message
  const NIK = '1405095203918002'

  it('16 angka berurutan ditolak pada ketiga skema dengan pesan yang sama', () => {
    expect(pesan(alasanSchema.safeParse({ alasan: `NIK ${NIK} tidak cocok` }))).toBe(PESAN_CATATAN_NIK)
    expect(pesan(catatanKembaliSchema.safeParse({ catatan: `NIK ${NIK}` }))).toBe(PESAN_CATATAN_NIK)
    expect(pesan(ubahPermohonanSchema.safeParse({ catatanInternal: `${NIK} sudah dicek` }))).toBe(PESAN_CATATAN_NIK)
  })
  it('15 dan 17 angka berurutan lolos', () => {
    expect(alasanSchema.safeParse({ alasan: `Nomor ${NIK.slice(0, 15)}` }).success).toBe(true)
    expect(alasanSchema.safeParse({ alasan: `Nomor ${NIK}9` }).success).toBe(true)
  })
  it('16 angka yang dikelilingi tanda baca atau huruf tetap ditolak', () => {
    expect(alasanSchema.safeParse({ alasan: `(${NIK}).` }).success).toBe(false)
    expect(alasanSchema.safeParse({ alasan: `NIK:${NIK}.` }).success).toBe(false)
    expect(catatanKembaliSchema.safeParse({ catatan: `a${NIK}b` }).success).toBe(false)
  })
  it('angka terpisah spasi tidak dianggap NIK (jaring pengaman, bukan pencegah)', () =>
    expect(alasanSchema.safeParse({ alasan: '1405 0952 0391 8002' }).success).toBe(true))
  it('catatan internal kosong atau null tetap sah', () => {
    expect(ubahPermohonanSchema.safeParse({ catatanInternal: null }).success).toBe(true)
    expect(ubahPermohonanSchema.safeParse({}).success).toBe(true)
  })
})
