import { describe, expect, it } from 'vitest'
import { contohPenduduk } from '@/test/contoh'
import { daftarSchema, galatSchema } from './api'
import { pendudukSchema } from './penduduk/schema'
import { penggunaSchema } from './pengguna/schema'

describe('skema data', () => {
  it('penduduk contoh valid', () => expect(pendudukSchema.safeParse(contohPenduduk()).success).toBe(true))
  it('NIK boleh null (bayi belum punya NIK)', () =>
    expect(pendudukSchema.safeParse(contohPenduduk({ nik: null })).success).toBe(true))
  it('NIK harus 16 angka', () => expect(pendudukSchema.safeParse(contohPenduduk({ nik: '12345' })).success).toBe(false))
  it('telepon harus nomor HP Indonesia', () =>
    expect(pendudukSchema.safeParse(contohPenduduk({ telepon: '+62 812' })).success).toBe(false))
  it('respons daftar', () =>
    expect(
      daftarSchema(pendudukSchema).safeParse({ data: [contohPenduduk()], meta: { page: 1, pageSize: 25, total: 1 } })
        .success,
    ).toBe(true))
  it('respons galat', () =>
    expect(
      galatSchema.safeParse({ error: { code: 'CONFLICT', message: 'NIK sudah terdaftar', fields: { nik: 'NIK sudah terdaftar' } } })
        .success,
    ).toBe(true))
  it('kepala dusun wajib punya dusun', () => {
    const dasar = { id: 'pgn_x', desaId: 'desa_x', nama: 'Sukardi', jabatan: 'Kepala Dusun II', email: 'x@y.id', aktif: true, nip: null }
    expect(penggunaSchema.safeParse({ ...dasar, peran: 'kadus', dusunId: null }).success).toBe(false)
    expect(penggunaSchema.safeParse({ ...dasar, peran: 'kadus', dusunId: 'dsn_ss_2' }).success).toBe(true)
  })
})
