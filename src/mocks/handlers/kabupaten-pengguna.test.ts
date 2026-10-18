import { describe, expect, it } from 'vitest'
import { ambilSesiKabupaten, daftarPenggunaKabupaten, tambahPenggunaKabupaten, ubahPenggunaKabupaten } from '@/api/kabupaten'
import { undangPengguna } from '@/api/pengaturan'
import { tambahDesa } from '@/api/konsol'
import { ambilDb } from '@/mocks/db'
import {
  AKUN_KABUPATEN_UJI, AKUN_KONSOL_UJI, AKUN_UJI, masukKabupatenSebagai, masukKonsolSebagai, masukSebagai, pakaiApiTiruan,
} from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const EMAIL_DIPAKAI = { kode: 'CONFLICT', fields: { email: 'Email ini sudah dipakai akun lain.' } }

describe('Pengguna kabupaten (SPEC-V0.2 §8.1)', () => {
  it('daftar akun kabupaten sesi saja: aktif dulu, Admin dulu, lalu nama', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    await tambahPenggunaKabupaten({ nama: 'Andi Lubis', email: 'andi@pelalawan.go.id', peran: 'peninjau' })
    const nonaktif = await tambahPenggunaKabupaten({ nama: 'Aisyah', email: 'aisyah@pelalawan.go.id', peran: 'admin' })
    await ubahPenggunaKabupaten(nonaktif.id, { aktif: false })
    expect((await daftarPenggunaKabupaten()).map((p) => p.nama)).toEqual(['Fajar Ramadhan', 'Andi Lubis', 'Hj. Rosnani', 'Aisyah'])
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    expect((await daftarPenggunaKabupaten()).map((p) => p.id)).toEqual(['kab_wahyu'])
  })
  it('tambah Peninjau: akun langsung aktif dan bisa dipakai; jabatan kosong memakai label peran', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const baru = await tambahPenggunaKabupaten({ nama: 'Andi Lubis', email: 'Andi@Pelalawan.go.id', peran: 'peninjau' })
    expect(baru).toMatchObject({ kabupatenKode: '14.05', email: 'andi@pelalawan.go.id', jabatan: 'Peninjau', peran: 'peninjau', aktif: true })
    const berjabatan = await tambahPenggunaKabupaten({ nama: 'H. Zulmi', email: 'zulmi@pelalawan.go.id', peran: 'peninjau', jabatan: 'Bupati Pelalawan' })
    expect(berjabatan.jabatan).toBe('Bupati Pelalawan')
    masukKabupatenSebagai(baru.id)
    expect((await ambilSesiKabupaten()).pengguna.id).toBe(baru.id)
  })
  it('email unik di semua jenis akun: email desa, Konsol, dan kabupaten lain ditolak di kolom email', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    for (const email of ['ROSMIATI@sungaisialang.desa.id', 'dina@sinfodes.id', 'admin.siak@demo.sinfodes.id']) {
      await expect(tambahPenggunaKabupaten({ nama: 'Ganda', email, peran: 'peninjau' })).rejects.toMatchObject(EMAIL_DIPAKAI)
    }
    expect(ambilDb().penggunaKabupaten).toHaveLength(3)
  })
  it('email akun kabupaten juga tertutup untuk undangan desa dan Tambah desa di Konsol', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await expect(
      undangPengguna({ nama: 'Ganda', email: 'admin.pelalawan@demo.sinfodes.id', peran: 'operator', dusunId: null }),
    ).rejects.toMatchObject({ kode: 'CONFLICT', fields: { email: 'Surel ini sudah dipakai akun lain.' } })
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await expect(
      tambahDesa({
        nama: 'Koto Baru Sentosa', kecamatan: '14.01.17', kodeDesa: '2077', paket: 'Lengkap', email: 'pmd.pelalawan@demo.sinfodes.id',
        alamat: 'kotobarusentosa',
      }),
    ).rejects.toMatchObject(EMAIL_DIPAKAI)
  })
  it('Peninjau ditolak (403) untuk daftar, tambah, dan ubah', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    await expect(daftarPenggunaKabupaten()).rejects.toMatchObject({ kode: 'FORBIDDEN' })
    await expect(tambahPenggunaKabupaten({ nama: 'X Y', email: 'x@y.id', peran: 'admin' })).rejects.toMatchObject({ kode: 'FORBIDDEN' })
    await expect(ubahPenggunaKabupaten('kab_fajar', { aktif: false })).rejects.toMatchObject({ kode: 'FORBIDDEN' })
  })
  it('Admin Siak tidak bisa mengubah akun Pelalawan (404); akun sendiri tidak bisa diubah (403)', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    await expect(ubahPenggunaKabupaten('kab_rosnani', { aktif: false })).rejects.toMatchObject({ kode: 'NOT_FOUND' })
    await expect(ubahPenggunaKabupaten('kab_wahyu', { peran: 'peninjau' })).rejects.toMatchObject({ kode: 'FORBIDDEN' })
    expect(ambilDb().penggunaKabupaten.find((p) => p.id === 'kab_rosnani')?.aktif).toBe(true)
  })
  it('Admin aktif terakhir dijaga: setelah Admin kedua ada, kab_fajar bisa dinonaktifkan dan tidak bisa masuk lagi', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const kedua = await tambahPenggunaKabupaten({ nama: 'Aisyah', email: 'aisyah@pelalawan.go.id', peran: 'admin' })
    masukKabupatenSebagai(kedua.id)
    expect(await ubahPenggunaKabupaten('kab_fajar', { aktif: false })).toMatchObject({ id: 'kab_fajar', aktif: false })
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    await expect(ambilSesiKabupaten()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    // Aisyah kini Admin aktif satu-satunya; Peninjau dinaikkan jadi Admin, lalu Aisyah boleh diturunkan olehnya.
    masukKabupatenSebagai(kedua.id)
    await ubahPenggunaKabupaten('kab_rosnani', { peran: 'admin' })
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    expect(await ubahPenggunaKabupaten(kedua.id, { peran: 'peninjau' })).toMatchObject({ peran: 'peninjau' })
  })
})
