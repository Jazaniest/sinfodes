import { describe, expect, it } from 'vitest'
import { DESA_DEMO, DUSUN_DEMO } from '@sinfodes/demo/data/desa-demo'
import { bacaFilterPenduduk, daftarFilterAktif, FILTER_PENDUDUK_BAWAAN, HAPUS_SEMUA_FILTER, hrefDaftarPenduduk } from './filter-url'

const istilah = DESA_DEMO[0].istilahWilayah

describe('filter penduduk dari URL (fokus review 3)', () => {
  it('kosong → bawaan', () =>
    expect(bacaFilterPenduduk({})).toEqual({ status: 'Hidup', urut: 'nama', page: 1, pageSize: 25 }))
  it('parameter rusak diabaikan satu per satu', () =>
    expect(bacaFilterPenduduk({ pageSize: 30, dusun: 2, jk: 'X', page: 3 })).toEqual({
      dusun: 2, status: 'Hidup', urut: 'nama', page: 3, pageSize: 25,
    }))
  it('parameter asing (mis. NIK) dibuang', () =>
    expect(bacaFilterPenduduk({ nik: '1405095203918002' })).toEqual(FILTER_PENDUDUK_BAWAAN))
})

describe('daftarFilterAktif', () => {
  it('chip berlabel, masing-masing dengan cara menghapusnya', () => {
    const chip = daftarFilterAktif({ ...FILTER_PENDUDUK_BAWAAN, dusun: 2, umurMin: 17, status: 'Meninggal' }, DUSUN_DEMO, istilah)
    expect(chip.map((c) => c.label)).toEqual(['Dusun II', 'Umur ≥ 17 tahun', 'Status: Meninggal'])
    expect(chip[0].hapus).toEqual({ dusun: undefined, rt: undefined, page: 1 })
    expect(chip[2].hapus).toEqual({ status: 'Hidup', page: 1 })
  })
  it('tanpa filter → kosong', () => expect(daftarFilterAktif(FILTER_PENDUDUK_BAWAAN, DUSUN_DEMO, istilah)).toEqual([]))
})

describe('KTP-el dan tautan daftar (2A-3)', () => {
  it('chip KTP-el bisa dihapus; Hapus semua filter ikut mengosongkannya', () => {
    const [chip] = daftarFilterAktif({ ...FILTER_PENDUDUK_BAWAAN, ktpEl: 'Belum rekam' }, DUSUN_DEMO, istilah)
    expect(chip).toEqual({ kunci: 'ktpEl', label: 'KTP-el: Belum rekam', hapus: { ktpEl: undefined, page: 1 } })
    expect(HAPUS_SEMUA_FILTER).toHaveProperty('ktpEl', undefined)
  })
  it('hrefDaftarPenduduk: nilai di-encode; tanpa filter → daftar polos', () => {
    expect(hrefDaftarPenduduk({ dusun: 2, kawin: 'Kawin Tercatat', pekerjaan: 'Petani/Pekebun' })).toBe(
      '/admin/kependudukan/penduduk?dusun=2&kawin=Kawin%20Tercatat&pekerjaan=Petani%2FPekebun',
    )
    expect(hrefDaftarPenduduk({})).toBe('/admin/kependudukan/penduduk')
  })
})
