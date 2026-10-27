import { describe, expect, it } from 'vitest'
import { hasilMasukKabupatenSchema } from '../kabupaten/schema'
import { hasilMasukKonsolSchema, masukKonsolSchema } from '../konsol/schema'
import { hasilMasukWargaSchema } from '../warga/sesi'

const desa = {
  id: 'desa_a', slug: 'desa-a', nama: 'A', kodeDesa: '1', kecamatan: { kode: '1', nama: 'K' }, kabupaten: { kode: '14.05', nama: 'K' },
  provinsi: { kode: '14', nama: 'P' }, kodePos: '', alamatKantor: '', surel: '', telepon: '', jamLayanan: [], luasKm2: null, batas: null,
  istilahWilayah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' }, kodeSurat: 'A', status: 'Aktif',
}
const sesiWarga = { jenis: 'warga', penduduk: { id: 'pdk_a', nama: 'A', nik: '1405095203918002', keluargaId: 'kk_a' }, desa, whatsapp: '081277402231' }
const sesiKonsol = { jenis: 'konsol', pengguna: { id: 'kns_a', nama: 'A', jabatan: 'Tim Sinfodes', peran: 'tim', email: 'a@sinfodes.id' } }
const sesiKabupaten = {
  jenis: 'kabupaten',
  pengguna: { id: 'kab_a', kabupatenKode: '14.05', nama: 'A', jabatan: 'Admin', peran: 'admin', email: 'a@kab.id', aktif: true },
  kabupaten: { kode: '14.05', nama: 'Pelalawan', label: 'kab-pelalawan' },
}

describe('hasil masuk warga, Konsol, dan kabupaten', () => {
  it.each([
    ['warga', hasilMasukWargaSchema, sesiWarga],
    ['Konsol', hasilMasukKonsolSchema, sesiKonsol],
    ['kabupaten', hasilMasukKabupatenSchema, sesiKabupaten],
  ] as const)('%s: token boleh tidak ada (sesi di cookie HttpOnly) dan tetap diterima bila ada', (_nama, skema, sesi) => {
    expect(skema.parse({ sesi }).token).toBeUndefined()
    expect(skema.parse({ token: 'demo.x', sesi }).token).toBe('demo.x')
    expect(skema.safeParse({ token: 5, sesi }).success).toBe(false)
    expect(skema.safeParse({ token: 'x' }).success).toBe(false)
  })

  it('masukKonsolSchema: kodeTotp opsional dan hanya enam angka', () => {
    const dasar = { email: 'a@sinfodes.id', kataSandi: 'x' }
    expect(masukKonsolSchema.parse(dasar).kodeTotp).toBeUndefined()
    expect(masukKonsolSchema.parse({ ...dasar, kodeTotp: '012345' }).kodeTotp).toBe('012345')
    for (const salah of ['12345', '1234567', 'abcdef', '12 345']) expect(masukKonsolSchema.safeParse({ ...dasar, kodeTotp: salah }).success, salah).toBe(false)
  })
})
