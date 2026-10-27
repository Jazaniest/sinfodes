import { describe, expect, it } from 'vitest'
import { bacaFilterPermohonan, FILTER_PERMOHONAN_BAWAAN, hrefPermohonan } from './filter-url'

describe('filter URL permohonan (SPEC §3.1, §7.4)', () => {
  it('nilai bawaan tidak ditulis di URL', () => {
    expect(hrefPermohonan({})).toBe('/admin/surat')
    expect(hrefPermohonan({ ...FILTER_PERMOHONAN_BAWAAN, status: 'diproses' })).toBe('/admin/surat?status=diproses')
    expect(hrefPermohonan({ status: 'selesai', periode: 30, jenis: 'SKD', page: 2 })).toBe('/admin/surat?status=selesai&periode=30&jenis=SKD&page=2')
  })
  it('parameter rusak diabaikan satu per satu', () =>
    expect(bacaFilterPermohonan({ status: 'arsip', periode: '30', jenis: 'skd' })).toEqual({ ...FILTER_PERMOHONAN_BAWAAN, periode: 30 }))
})
