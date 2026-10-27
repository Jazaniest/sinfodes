import { describe, expect, it } from 'vitest'
import { jumlahSelesai, langkahBerikut, LANGKAH_PERSIAPAN, persiapanBerurutan, persiapanSchema } from './persiapan'

describe('langkah persiapan desa baru (SPEC §5.3)', () => {
  it('lima langkah berurutan; langkah berikut adalah yang pertama belum selesai', () => {
    expect(LANGKAH_PERSIAPAN).toEqual(['identitas', 'wilayah', 'impor', 'pengguna', 'jenis-surat'])
    const p = persiapanBerurutan(2)
    expect(persiapanSchema.parse(p)).toEqual(p)
    expect(jumlahSelesai(p)).toBe(2)
    expect(langkahBerikut(p)).toBe('impor')
    expect(langkahBerikut(persiapanBerurutan(0))).toBe('identitas')
    expect(langkahBerikut(persiapanBerurutan(5))).toBeNull()
  })
  it('langkah yang selesai tidak berurutan: langkah berikut tetap yang pertama belum selesai', () => {
    const p = LANGKAH_PERSIAPAN.map((langkah) => ({ langkah, selesai: langkah !== 'wilayah' }))
    expect(langkahBerikut(p)).toBe('wilayah')
    expect(jumlahSelesai(p)).toBe(4)
  })
})
