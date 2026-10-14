import { describe, expect, it } from 'vitest'
import { bacaFilterDesa } from '@/features/konsol/desa/filter-url'
import { bacaCariBuatSurat } from '@/features/surat/buat/cari-buat'
import { parseSearch, stringifySearch } from './cari-url'

describe('parameter URL (tahap 6D)', () => {
  it('kode wilayah, nomor RT, dan angka ditulis tanpa kutip; nol di depan dan di belakang tetap (fokus review 2)', () => {
    expect(stringifySearch({ provinsi: '14', kabupaten: '14.10', rt: '001', page: 2 })).toBe('?provinsi=14&kabupaten=14.10&rt=001&page=2')
    expect(parseSearch('?provinsi=14&kabupaten=14.10&rt=001&page=2')).toEqual({ provinsi: '14', kabupaten: '14.10', rt: '001', page: '2' })
  })
  it('tautan lama yang berkutip tetap terbaca sama (fokus review 1)', () => {
    expect(parseSearch('?kabupaten=%2214.05%22&wilayah=%2214.01%22')).toEqual({ kabupaten: '14.05', wilayah: '14.01' })
  })
  it('objek dan larik tetap JSON; teks yang mirip JSON dikutip supaya kembali utuh', () => {
    const asal = { pilihan: ['a', 'b'], ringkas: { x: 1 }, teks: '{}', kutip: '"halo' }
    expect(parseSearch(stringifySearch(asal))).toEqual(asal)
  })
  it('true, null, dan angka negatif tetap teks', () => {
    expect(parseSearch('?a=true&b=null&c=-5')).toEqual({ a: 'true', b: 'null', c: '-5' })
  })
  it('parameter angka di rute sungguhan tetap angka: ?langkah=2 di Buat surat (fokus review 3)', () => {
    expect(bacaCariBuatSurat(parseSearch('?langkah=2')).langkah).toBe(2)
  })
  it('Daftar desa Konsol: ?kabupaten=14.10 tanpa kutip terpakai sebagai filter (minor 6A)', () => {
    expect(bacaFilterDesa(parseSearch('?provinsi=14&kabupaten=14.10'))).toEqual({ provinsi: '14', kabupaten: '14.10' })
  })
})
