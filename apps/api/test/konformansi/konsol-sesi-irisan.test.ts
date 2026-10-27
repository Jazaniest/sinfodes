// Kembaran dari apps/web/src/mocks/handlers/konsol-sesi.test.ts: 4 dari 4 butir asal dipakai (2 utuh, 2 diadaptasi), ditambah
// satu butir untuk TOTP yang tidak ada di tiruan.
import { describe, expect, it } from 'vitest'
import { SESI_KUKI } from '@/api/client'
import { ambilSesiKonsol, keluarKonsol, masukKonsol } from '@/api/konsol'
import { ambilSesi } from '@/api/sesi'
import { ambilSesiWarga } from '@/api/warga'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { buatAkunKonsolUji } from '../akun-uji'
import { penyandiUji } from '../basisdata'
import { kodeTotp, langkahDari } from '../../src/kripto/totp'
import { masukKonsolSebagai, masukSebagai, masukSebagaiWarga, pakaiApiNyata } from '../api-nyata'

const api = pakaiApiNyata({ segarTiapUji: true })

describe('sesi Konsol Sinfodes (SPEC §11, §3.5)', () => {
  it('masuk dengan akun Tim Sinfodes; akun kabupaten tidak bisa masuk Konsol (SPEC-V0.2 §7)', async () => {
    api.keAlamat('konsol')
    const tim = await masukKonsol(' Dina@sinfodes.id ', 'demo')
    // Perbedaan sengaja: tanpa token dari server; penanda lokal mengisinya.
    expect(tim).toMatchObject({ token: SESI_KUKI, sesi: { jenis: 'konsol', pengguna: { nama: 'Dina', peran: 'tim' } } })
    await expect(masukKonsol('pmd.pelalawan@demo.sinfodes.id', 'demo')).rejects.toMatchObject({ kode: 'VALIDATION' })
  })

  it('kata sandi salah, atau email akun panel desa → "Email atau kata sandi salah."', async () => {
    api.keAlamat('konsol')
    await expect(masukKonsol('dina@sinfodes.id', 'salah')).rejects.toMatchObject({ kode: 'VALIDATION', fields: { kataSandi: 'Email atau kata sandi salah.' } })
    await expect(masukKonsol('rosmiati@sungaisialang.desa.id', 'demo')).rejects.toMatchObject({ kode: 'VALIDATION' })
  })

  it('cookie tertukar ditolak di kedua arah (fokus review 2)', async () => {
    api.keAlamat('konsol')
    await expect(ambilSesiKonsol()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    await masukSebagai('pgn_rosmiati')
    await masukSebagaiWarga('pdk_siti_rahmah')
    // Cookie panel dan warga ditaruh di alamat Konsol dengan nama cookie Konsol.
    const panel = (api.kukiDi('sungaisialang') as string).match(/__Host-panel=([^;]+)/)?.[1] as string
    api.pasangKukiDi('konsol', `__Host-konsol=${panel}`)
    api.keAlamat('konsol')
    await expect(ambilSesiKonsol()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    await masukKonsolSebagai('kns_dina')
    expect((await ambilSesiKonsol()).pengguna.nama).toBe('Dina')
    // Sesi panel dan warga tetap milik mereka sendiri.
    api.keAlamat('sungaisialang')
    expect((await ambilSesi()).pengguna.nama).toBe('Rosmiati')
    expect((await ambilSesiWarga()).penduduk.nama).toBe('Siti Rahmah')
  })

  it('keluar konsol mencabut sesi', async () => {
    await masukKonsolSebagai('kns_dina')
    await expect(keluarKonsol()).resolves.toBeUndefined()
    await expect(ambilSesiKonsol()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })

  it('TOTP (tidak ada di tiruan): akun ber-TOTP butuh kode dari autentikator, kode yang sama tidak bisa dipakai dua kali', async () => {
    const penyandi = await penyandiUji(api.uji.sqlMigrasi)
    const akun = await buatAkunKonsolUji(api.uji.sqlMigrasi, penyandi, { totp: true })
    api.keAlamat('konsol')
    await expect(masukKonsol(akun.email, akun.kataSandi)).rejects.toMatchObject({ kode: 'VALIDATION', fields: { kataSandi: 'Email atau kata sandi salah.' } })
    const kode = kodeTotp(akun.rahasia as Buffer, langkahDari(SEKARANG_UJI))
    expect((await masukKonsol(akun.email, akun.kataSandi, kode)).sesi.pengguna.id).toBe(akun.id)
    await expect(masukKonsol(akun.email, akun.kataSandi, kode)).rejects.toMatchObject({ kode: 'VALIDATION' })
  })
})
