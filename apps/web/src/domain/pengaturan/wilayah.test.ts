import { describe, expect, it } from 'vitest'
import type { Dusun } from '../wilayah/schema'
import {
  AWALAN_DUSUN_BARU, dusunKosong, formDariWilayah, nomoriSusunan, periksaWilayah, rwKosong, susunanSama, ubahWilayahSchema,
} from './wilayah'

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
  it('susunan baru: dusun 1, 2, …; RW dan RT berurutan se-desa seperti data Sungai Sialang (tahap 6C)', () => {
    const a = dusunKosong(1)
    const b = dusunKosong(2)
    a.rw[0].rt.push({ nomor: '000', ketua: '' })
    a.rw.push(rwKosong())
    const hasil = nomoriSusunan([a, b])
    expect(hasil.map((d) => d.id)).toEqual([`${AWALAN_DUSUN_BARU}1`, `${AWALAN_DUSUN_BARU}2`])
    expect(hasil.map((d) => d.rw.map((rw) => `${rw.nomor}:${rw.rt.map((rt) => rt.nomor).join(',')}`))).toEqual([
      ['001:001,002', '002:003'],
      ['003:004'],
    ])
    expect(a.rw[0].nomor).toBe('000')
  })
  it('penomoran ulang sesudah RT dihapus: tidak ada nomor yang bolong', () => {
    const f = formDariWilayah(W)
    const hasil = nomoriSusunan([{ ...f.dusun[0], rw: [{ ...f.dusun[0].rw[0], rt: f.dusun[0].rw[0].rt.slice(1) }] }])
    expect(hasil[0].rw[0].rt).toEqual([{ nomor: '001', ketua: 'Azhar' }])
  })
  it('susunan kosong ditolak: tanpa dusun, dusun tanpa RW, RW tanpa RT', () => {
    expect(periksaWilayah({ ...formDariWilayah(W), dusun: [] })).toEqual({ dusun: 'Tambahkan minimal satu dusun' })
    const tanpaRw = formDariWilayah(W)
    tanpaRw.dusun[0].rw = []
    expect(periksaWilayah(tanpaRw)).toEqual({ 'dusun.0.rw': 'Setiap dusun punya minimal satu RW' })
    const tanpaRt = formDariWilayah(W)
    tanpaRt.dusun[0].rw[0].rt = []
    expect(periksaWilayah(tanpaRt)).toEqual({ 'dusun.0.rw.0.rt': 'Setiap RW punya minimal satu RT' })
  })
  it('dusun baru yang masih kosong: nama, kepala, dan ketua wajib diisi', () => {
    expect(periksaWilayah({ ...formDariWilayah(W), dusun: nomoriSusunan([dusunKosong(1)]) })).toEqual({
      'dusun.0.nama': 'Nama dusun wajib diisi',
      'dusun.0.kepalaDusun': 'Nama kepala dusun wajib diisi',
      'dusun.0.rw.0.ketua': 'Nama ketua RW wajib diisi',
      'dusun.0.rw.0.rt.0.ketua': 'Nama ketua RT wajib diisi',
    })
  })
})
