import { describe, expect, it } from 'vitest'
import { hasilMasukSchema, type SesiAdmin } from './schema'

const sesi: SesiAdmin = {
  jenis: 'admin',
  pengguna: { id: 'pgn_a', desaId: 'desa_a', nama: 'A', jabatan: 'Operator Desa', peran: 'operator', dusunId: null, email: 'a@desa.id', aktif: true, nip: null },
  desa: {
    id: 'desa_a', slug: 'desa-a', nama: 'A', kodeDesa: '1', kecamatan: { kode: '1', nama: 'K' }, kabupaten: { kode: '1', nama: 'K' },
    provinsi: { kode: '1', nama: 'P' }, kodePos: '', alamatKantor: '', surel: '', telepon: '', jamLayanan: [], luasKm2: null, batas: null,
    istilahWilayah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' }, kodeSurat: 'A', status: 'Aktif',
  },
  dusun: [],
}

describe('hasilMasukSchema', () => {
  it('token boleh tidak ada: server nyata menaruh sesi di cookie HttpOnly dan tidak mengirimnya', () => {
    expect(hasilMasukSchema.parse({ sesi }).token).toBeUndefined()
  })

  it('mode demo tetap membawa token', () => {
    expect(hasilMasukSchema.parse({ token: 'demo.pgn_a', sesi }).token).toBe('demo.pgn_a')
  })

  it('token yang bukan teks ditolak, dan sesi tetap wajib', () => {
    expect(hasilMasukSchema.safeParse({ token: 5, sesi }).success).toBe(false)
    expect(hasilMasukSchema.safeParse({ token: 'x' }).success).toBe(false)
  })
})
