import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../../test/basisdata'
import { buatKlien } from '../basisdata/klien'
import { catatGagal, hapusKunci, periksaKunci, type RuangKunci } from './kunci-masuk'

const MENIT = 60_000
const JAM = 60 * MENIT
const AWAL = new Date('2026-09-24T02:00:00Z')
const SS = 'desa_sungai_sialang'
const TL = 'desa_tanjung_lamo'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterAll(async () => {
  await uji?.tutup()
})

const warga = (desaId: string): RuangKunci => ({ tabel: 'desa', desaId, jenis: 'warga' })
const panel = (desaId: string): RuangKunci => ({ tabel: 'desa', desaId, jenis: 'panel' })
const konsol: RuangKunci = { tabel: 'platform', jenis: 'konsol' }
const kabupaten: RuangKunci = { tabel: 'platform', jenis: 'kabupaten' }

/** Setiap panggilan satu transaksi, seperti satu permintaan; peran dan konteks mengikuti ruang kunci. */
const dalam = <T>(ruang: RuangKunci, fn: (db: Parameters<typeof catatGagal>[0]) => Promise<T>, klien = uji.klien): Promise<T> =>
  ruang.tabel === 'desa' ? klien.dalamTransaksi('desa', { desaId: ruang.desaId }, fn) : klien.dalamTransaksi(ruang.jenis, {}, fn)
const gagal = (ruang: RuangKunci, kunci: string, t: Date, klien = uji.klien) => dalam(ruang, (db) => catatGagal(db, ruang, kunci, t), klien)
const cek = (ruang: RuangKunci, kunci: string, t: Date, klien = uji.klien) => dalam(ruang, (db) => periksaKunci(db, ruang, kunci, t), klien)
const hapus = (ruang: RuangKunci, kunci: string) => dalam(ruang, (db) => hapusKunci(db, ruang, kunci))

describe('pengunci percobaan masuk di PostgreSQL (SPEC-V0.3 §8.5)', () => {
  it('empat kegagalan belum mengunci (sisa menurun), kelima mengunci 15 menit', async () => {
    const k = 'nik-a'
    expect(await cek(warga(SS), k, AWAL)).toEqual({ terkunciSampai: null })
    for (const sisa of [4, 3, 2, 1]) expect(await gagal(warga(SS), k, AWAL)).toEqual({ terkunciSampai: null, sisa })
    const kelima = await gagal(warga(SS), k, AWAL)
    expect(kelima.sisa).toBe(0)
    expect(kelima.terkunciSampai?.getTime()).toBe(AWAL.getTime() + 15 * MENIT)
    expect((await cek(warga(SS), k, new Date(AWAL.getTime() + 14 * MENIT))).terkunciSampai?.getTime()).toBe(AWAL.getTime() + 15 * MENIT)
    expect(await cek(warga(SS), k, new Date(AWAL.getTime() + 15 * MENIT + 1))).toEqual({ terkunciSampai: null })
  })

  it('kunci berlipat: 15, 30, 60 menit, dan dibatasi 24 jam', async () => {
    const k = 'nik-b'
    let t = AWAL
    const lama: number[] = []
    for (let putaran = 0; putaran < 8; putaran++) {
      let hasil = await gagal(warga(SS), k, t)
      for (let i = 0; i < 4; i++) hasil = await gagal(warga(SS), k, t)
      lama.push((hasil.terkunciSampai as Date).getTime() - t.getTime())
      t = new Date((hasil.terkunciSampai as Date).getTime() + 1)
    }
    expect(lama.slice(0, 3)).toEqual([15 * MENIT, 30 * MENIT, 60 * MENIT])
    expect(Math.max(...lama)).toBe(24 * JAM)
    expect(lama.at(-1)).toBe(24 * JAM)
  })

  it('berhasil masuk menghapus hitungan dan tingkat kunci', async () => {
    const k = 'nik-c'
    for (let i = 0; i < 4; i++) await gagal(warga(SS), k, AWAL)
    await hapus(warga(SS), k)
    expect((await gagal(warga(SS), k, AWAL)).sisa).toBe(4)
    for (let i = 0; i < 3; i++) await gagal(warga(SS), k, AWAL)
    const kunci = await gagal(warga(SS), k, AWAL)
    expect(kunci.terkunciSampai?.getTime()).toBe(AWAL.getTime() + 15 * MENIT)
    await hapus(warga(SS), k)
    for (let i = 0; i < 4; i++) await gagal(warga(SS), k, new Date(AWAL.getTime() + JAM))
    const lagi = await gagal(warga(SS), k, new Date(AWAL.getTime() + JAM))
    expect((lagi.terkunciSampai as Date).getTime() - (AWAL.getTime() + JAM)).toBe(15 * MENIT)
  })

  it('kegagalan lama dilupakan: 24 jam tanpa kegagalan mengembalikan hitungan dan tingkat ke nol', async () => {
    const k = 'nik-d'
    for (let i = 0; i < 5; i++) await gagal(warga(SS), k, AWAL)
    const sesudah = new Date(AWAL.getTime() + 25 * JAM)
    const hasil = await gagal(warga(SS), k, sesudah)
    expect(hasil).toEqual({ terkunciSampai: null, sisa: 4 })
  })

  it('kunci tidak bocor antardesa, antarjenis, maupun antarperan platform', async () => {
    const k = 'nik-e'
    for (let i = 0; i < 5; i++) await gagal(warga(SS), k, AWAL)
    expect((await cek(warga(SS), k, AWAL)).terkunciSampai).not.toBeNull()
    expect((await cek(warga(TL), k, AWAL)).terkunciSampai).toBeNull()
    expect((await cek(panel(SS), k, AWAL)).terkunciSampai).toBeNull()
    for (let i = 0; i < 5; i++) await gagal(konsol, k, AWAL)
    expect((await cek(konsol, k, AWAL)).terkunciSampai).not.toBeNull()
    expect((await cek(kabupaten, k, AWAL)).terkunciSampai).toBeNull()
  })

  it('kunci bertahan setelah server dimulai ulang (klien baru, basis data sama)', async () => {
    const k = 'nik-f'
    for (let i = 0; i < 5; i++) await gagal(panel(SS), k, AWAL)
    const baru = buatKlien(uji.urlDb)
    try {
      expect((await cek(panel(SS), k, AWAL, baru)).terkunciSampai?.getTime()).toBe(AWAL.getTime() + 15 * MENIT)
    } finally {
      await baru.tutup()
    }
  })

  it('kunci akun yang tidak ada diperlakukan sama: kunci hanya teks indeks, tanpa memeriksa akun', async () => {
    const k = 'indeks-tak-dikenal-xyz'
    for (let i = 0; i < 4; i++) await gagal(konsol, k, AWAL)
    expect((await gagal(konsol, k, AWAL)).terkunciSampai).not.toBeNull()
  })
})
