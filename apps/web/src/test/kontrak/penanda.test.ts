import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '@/test/contoh'
import { VARIAN_CAP } from '@/ui/cap/varian'
import { PENANDA_PENDUDUK, penandaPenduduk, penandaStatus } from '@/domain/penduduk/penanda'

const ctx = { kodeWilayahDesa: '140509', hariIni: new Date('2026-09-24T02:00:00Z') }
const bayi = {
  nik: null, tanggalLahir: '2026-09-01', statusPerkawinan: 'Belum Kawin', ktpEl: 'Belum wajib',
  pendidikan: 'Tidak/Belum Sekolah', pekerjaan: 'Belum/Tidak Bekerja', hubunganKeluarga: 'Anak',
} as const

describe('penanda penduduk (SPEC §4.4, §6.2)', () => {
  it('warga asli dengan data lengkap: tanpa penanda', () => expect(penandaPenduduk(contohPenduduk(), ctx)).toEqual([]))
  it('NIK dari luar desa → pendatang', () =>
    expect(penandaPenduduk(contohPenduduk({ nik: '3310014802768001' }), ctx)).toEqual(['pendatang']))
  it('bayi baru lahir → belum ada NIK, bukan data belum lengkap', () =>
    expect(penandaPenduduk(contohPenduduk(bayi), ctx)).toEqual(['belum-ada-nik']))
  it('wajib KTP belum rekam dan data belum lengkap', () =>
    expect(penandaPenduduk(contohPenduduk({ ktpEl: 'Belum rekam', pekerjaan: null }), ctx)).toEqual([
      'belum-ktp-el',
      'data-belum-lengkap',
    ]))
  it('yang sudah meninggal hanya diberi status', () =>
    expect(penandaPenduduk(contohPenduduk({ statusDasar: 'Meninggal', ktpEl: 'Belum rekam' }), ctx)).toEqual(['meninggal']))
  it('status dasar → penanda', () => expect(penandaStatus({ statusDasar: 'Pindah' })).toBe('pindah'))
  it('setiap penanda punya varian Cap', () => PENANDA_PENDUDUK.forEach((p) => expect(VARIAN_CAP).toContain(p)))
})
