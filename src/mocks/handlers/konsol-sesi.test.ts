import { describe, expect, it } from 'vitest'
import { ambilSesi } from '@/api/sesi'
import { ambilSesiKonsol, keluarKonsol, masukKonsol } from '@/api/konsol'
import { AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

describe('sesi Konsol Sinfodes (SPEC §11, §3.5)', () => {
  it('masuk dengan akun konsol: Tim Sinfodes dan pemantau Kabupaten Pelalawan', async () => {
    const tim = await masukKonsol('dina@sinfodes.id', 'demo')
    expect(tim).toMatchObject({ token: 'konsol.kns_dina', sesi: { jenis: 'konsol', pengguna: { nama: 'Dina', peran: 'tim', wilayah: null } } })
    const pemantau = await masukKonsol(' Pemantau.Pelalawan@demo.sinfodes.id ', 'demo')
    expect(pemantau.sesi.pengguna).toMatchObject({ peran: 'pemantau', wilayah: { kode: '14.05', nama: 'Pelalawan' } })
  })
  it('kata sandi salah, atau email akun panel desa → "Email atau kata sandi salah."', async () => {
    await expect(masukKonsol('dina@sinfodes.id', 'salah')).rejects.toMatchObject({ kode: 'VALIDATION', fields: { kataSandi: 'Email atau kata sandi salah.' } })
    await expect(masukKonsol('rosmiati@sungaisialang.desa.id', 'demo')).rejects.toMatchObject({ kode: 'VALIDATION' })
  })
  it('token tertukar ditolak di kedua arah (fokus review 2)', async () => {
    await expect(ambilSesiKonsol()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    masukSebagai(AKUN_UJI.operator)
    masukSebagaiWarga('pdk_siti_rahmah')
    await expect(ambilSesiKonsol()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    expect((await ambilSesiKonsol()).pengguna.nama).toBe('Dina')
    // Sesi panel admin tetap miliknya sendiri; token konsol tidak berlaku di /sesi.
    expect((await ambilSesi()).pengguna.nama).toBe('Rosmiati')
  })
  it('keluar konsol', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await expect(keluarKonsol()).resolves.toBeUndefined()
  })
})
