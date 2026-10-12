import { describe, expect, it } from 'vitest'
import type { Dusun } from '../wilayah/schema'
import { formDariWilayah, periksaWilayah, susunanSama, ubahWilayahSchema } from './wilayah'

const DUSUN: Dusun[] = [
  {
    id: 'dsn_a', desaId: 'd', nomor: 1, nama: 'Kampung Tengah', kepalaDusun: 'Amran', posyandu: 'Melati',
    rw: [{ nomor: '001', ketua: 'Rusli', rt: [{ nomor: '001', ketua: 'Jufri' }, { nomor: '002', ketua: 'Azhar' }] }],
  },
]
const W = { istilah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' }, dusun: DUSUN }

describe('wilayah desa (SPEC §8)', () => {
  it('formulir dari data tersimpan sah dan susunannya sama', () => {
    const f = formDariWilayah(W)
    expect(periksaWilayah(f)).toEqual({})
    expect(susunanSama(f, DUSUN)).toBe(true)
    expect(ubahWilayahSchema.parse(f).dusun[0].rw[0].rt[1]).toEqual({ nomor: '002', ketua: 'Azhar' })
  })
  it('nama boleh diubah; menambah RT atau menghapus dusun mengubah susunan', () => {
    const f = formDariWilayah(W)
    f.dusun[0].rw[0].rt[0].ketua = 'Jufri Hasan'
    expect(susunanSama(f, DUSUN)).toBe(true)
    expect(DUSUN[0].rw[0].rt[0].ketua).toBe('Jufri')
    const tambah = formDariWilayah(W)
    tambah.dusun[0].rw[0].rt.push({ nomor: '003', ketua: 'Baru' })
    expect(susunanSama(tambah, DUSUN)).toBe(false)
    expect(susunanSama({ ...f, dusun: [] }, DUSUN)).toBe(false)
  })
  it('nama kosong ditandai per isian', () => {
    const f = formDariWilayah(W)
    f.istilah.dusun = ' '
    f.dusun[0].rw[0].rt[1].ketua = ''
    expect(periksaWilayah(f)).toEqual({ 'istilah.dusun': 'Istilah wajib diisi', 'dusun.0.rw.0.rt.1.ketua': 'Nama ketua RT wajib diisi' })
  })
})
