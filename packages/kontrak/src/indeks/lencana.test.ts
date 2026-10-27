import { describe, expect, it } from 'vitest'
import { KATEGORI_DESA } from './kategori'
import { POLA_KODE_LENCANA, kalimatLencana, kodeLencana, lencanaAdminSchema, lencanaPublikSchema } from './lencana'

const dasar = { desaId: 'desa_sungai_sialang', kategori: 'layanan', tingkat: 'kabupaten', wilayahKode: '14.05', musim: 'bulanan', periode: '2026-08' } as const

describe('kalimatLencana (rencana 7C-2, Global Constraints)', () => {
  it('juara tunggal tingkat kabupaten', () => {
    expect(kalimatLencana({ peringkat: 1, bersama: false, kategori: 'layanan', tingkat: 'kabupaten', wilayahNama: 'Pelalawan', periode: { musim: 'bulanan', kode: '2026-08' } })).toBe(
      'Juara 1 Layanan Tercepat · Kabupaten Pelalawan · Agustus 2026',
    )
  })
  it('seri memakai "bersama" sesudah angka peringkat', () => {
    expect(kalimatLencana({ peringkat: 1, bersama: true, kategori: 'umum', tingkat: 'kabupaten', wilayahNama: 'Pelalawan', periode: { musim: 'bulanan', kode: '2026-08' } })).toBe(
      'Juara 1 bersama Juara Umum · Kabupaten Pelalawan · Agustus 2026',
    )
  })
  it('kecamatan dan triwulan', () => {
    expect(kalimatLencana({ peringkat: 3, bersama: false, kategori: 'website', tingkat: 'kecamatan', wilayahNama: 'Teluk Meranti', periode: { musim: 'triwulan', kode: '2026-T2' } })).toBe(
      'Juara 3 Website Teraktif · Kecamatan Teluk Meranti · Triwulan II 2026',
    )
  })
  it('tahunan', () => {
    expect(kalimatLencana({ peringkat: 2, bersama: false, kategori: 'serapan', tingkat: 'kabupaten', wilayahNama: 'Siak', periode: { musim: 'tahunan', kode: '2025' } })).toBe(
      'Juara 2 Serapan Dana Desa · Kabupaten Siak · Tahun 2025',
    )
  })
})

describe('kodeLencana', () => {
  it('tetap untuk masukan yang sama dan cocok dengan pola', () => {
    expect(kodeLencana(dasar)).toBe(kodeLencana({ ...dasar }))
    expect(kodeLencana(dasar)).toMatch(POLA_KODE_LENCANA)
  })
  it('berbeda untuk musim, periode, kategori, tingkat, dan wilayah yang berbeda', () => {
    const semua = new Set([
      kodeLencana(dasar),
      kodeLencana({ ...dasar, musim: 'triwulan', periode: '2026-T2' }),
      kodeLencana({ ...dasar, periode: '2026-07' }),
      kodeLencana({ ...dasar, kategori: 'umum' }),
      kodeLencana({ ...dasar, tingkat: 'kecamatan', wilayahKode: '14.05.09' }),
      kodeLencana({ ...dasar, desaId: 'desa_lain' }),
    ])
    expect(semua.size).toBe(6)
  })
  it('tidak pernah memuat karakter yang membingungkan (I, L, O, U)', () => {
    for (const k of KATEGORI_DESA) expect(kodeLencana({ ...dasar, kategori: k }).slice(3)).not.toMatch(/[ILOU]/)
  })
})

describe('skema lencana', () => {
  const lencana = {
    kode: kodeLencana(dasar),
    kalimat: 'Juara 1 Layanan Tercepat · Kabupaten Pelalawan · Agustus 2026',
    peringkat: 1,
    bersama: false,
    kategori: 'layanan',
    tingkat: 'kabupaten',
    periode: { musim: 'bulanan', kode: '2026-08', label: 'Agustus 2026' },
  }
  it('publik menolak kunci tambahan seperti tingkatan atau indeks', () => {
    expect(lencanaPublikSchema.safeParse(lencana).success).toBe(true)
    expect(lencanaPublikSchema.safeParse({ ...lencana, tingkatan: 'Maju' }).success).toBe(false)
    expect(lencanaPublikSchema.safeParse({ ...lencana, indeks: 80 }).success).toBe(false)
  })
  it('admin menambah tampil', () => {
    expect(lencanaAdminSchema.safeParse({ ...lencana, tampil: true }).success).toBe(true)
    expect(lencanaAdminSchema.safeParse(lencana).success).toBe(false)
  })
})
