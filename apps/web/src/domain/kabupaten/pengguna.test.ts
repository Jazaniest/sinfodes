import { describe, expect, it } from 'vitest'
import { PENGGUNA_KABUPATEN_DEMO } from '@/mocks/data/kabupaten-demo'
import { periksaAturanPenggunaKabupaten, tambahPenggunaKabupatenSchema, ubahPenggunaKabupatenSchema } from './pengguna'
import type { PenggunaKabupaten } from './schema'

const semua = PENGGUNA_KABUPATEN_DEMO.map((p) => structuredClone(p))
const akun = (id: string): PenggunaKabupaten => {
  const p = semua.find((x) => x.id === id)
  if (!p) throw new Error(`Akun ${id} tidak ada`)
  return p
}
const ADMIN_TERAKHIR = 'Kabupaten harus punya paling sedikit satu Admin aktif.'

describe('isian pengguna kabupaten (SPEC-V0.2 §8.1)', () => {
  it('tambah: nama dan email dirapikan; jabatan boleh kosong; peran wajib salah satu peran kabupaten', () => {
    expect(tambahPenggunaKabupatenSchema.parse({ nama: '  Riko  ', email: ' Riko@Pelalawan.go.id ', peran: 'peninjau' })).toEqual({
      nama: 'Riko', email: 'riko@pelalawan.go.id', peran: 'peninjau',
    })
    expect(tambahPenggunaKabupatenSchema.safeParse({ nama: 'Riko', email: 'bukan-email', peran: 'admin' }).success).toBe(false)
    expect(tambahPenggunaKabupatenSchema.safeParse({ nama: 'Riko', email: 'r@x.id', peran: 'operator' }).success).toBe(false)
  })
  it('ubah: harus ada perubahan', () => {
    expect(ubahPenggunaKabupatenSchema.safeParse({}).success).toBe(false)
    expect(ubahPenggunaKabupatenSchema.parse({ aktif: false })).toEqual({ aktif: false })
  })
})

describe('aturan akun kabupaten (SPEC-V0.2 §8.1)', () => {
  it('akun sendiri tidak bisa diubah dari dasbor kabupaten', () => {
    const fajar = akun('kab_fajar')
    expect(periksaAturanPenggunaKabupaten(semua, 'kab_fajar', fajar, { ...fajar, peran: 'peninjau' })).toMatchObject({ kode: 'FORBIDDEN' })
  })
  it('Admin aktif satu-satunya tidak bisa dinonaktifkan atau diturunkan (oleh Tim Sinfodes sekalipun)', () => {
    const fajar = akun('kab_fajar')
    expect(periksaAturanPenggunaKabupaten(semua, null, fajar, { ...fajar, aktif: false })).toEqual({ kode: 'CONFLICT', field: null, pesan: ADMIN_TERAKHIR })
    expect(periksaAturanPenggunaKabupaten(semua, null, fajar, { ...fajar, peran: 'peninjau' })).toEqual({ kode: 'CONFLICT', field: null, pesan: ADMIN_TERAKHIR })
  })
  it('Admin kabupaten lain tidak dihitung; Admin kedua yang aktif membuat Admin pertama boleh dinonaktifkan', () => {
    const fajar = akun('kab_fajar')
    // kab_wahyu Admin Siak: tidak menyelamatkan Pelalawan.
    expect(periksaAturanPenggunaKabupaten(semua, null, fajar, { ...fajar, aktif: false })).not.toBeNull()
    const kedua: PenggunaKabupaten = { ...fajar, id: 'kab_kedua', email: 'kedua@pelalawan.go.id' }
    expect(periksaAturanPenggunaKabupaten([...semua, kedua], 'kab_kedua', fajar, { ...fajar, aktif: false })).toBeNull()
    expect(periksaAturanPenggunaKabupaten([...semua, { ...kedua, aktif: false }], null, fajar, { ...fajar, aktif: false })).not.toBeNull()
  })
  it('Peninjau boleh dinonaktifkan dan Admin yang sudah nonaktif boleh diaktifkan lagi', () => {
    const rosnani = akun('kab_rosnani')
    expect(periksaAturanPenggunaKabupaten(semua, 'kab_fajar', rosnani, { ...rosnani, aktif: false })).toBeNull()
    const lama: PenggunaKabupaten = { ...akun('kab_fajar'), id: 'kab_lama', aktif: false }
    expect(periksaAturanPenggunaKabupaten([...semua, lama], 'kab_fajar', lama, { ...lama, aktif: true })).toBeNull()
  })
})
