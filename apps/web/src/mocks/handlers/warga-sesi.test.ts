import { describe, expect, it, vi } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { ambilSesi } from '@/api/sesi'
import { ambilSesiWarga, lupaPin, masukWarga, ubahAkunWarga } from '@/api/warga'
import { ambilDb } from '@/mocks/db'
import { AKUN_WARGA_UJI, masukSebagaiWarga, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const SITI = { nik: '1405095203918002', pin: '246810' }
/** Kode wilayah Jakarta dan nomor urut di luar 8001-9999: pasti tidak terdaftar di desa demo. */
const NIK_ASING = '3171014101900001'

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('masuk layanan warga (SPEC §10)', () => {
  it('NIK dan PIN benar → token warga dan sesi beserta desanya', async () => {
    const { token, sesi } = await masukWarga(SITI.nik, SITI.pin)
    expect(token).toBe('warga.pdk_siti_rahmah')
    expect(sesi).toMatchObject({
      jenis: 'warga',
      penduduk: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah', keluargaId: 'kk_syahrial' },
      desa: { nama: 'Sungai Sialang' },
      whatsapp: '081277402231',
    })
  })
  it('PIN salah dan NIK tidak terdaftar dijawab sama (fokus review 2)', async () => {
    const pinSalah = await galatDari(masukWarga(SITI.nik, '111111'))
    const nikAsing = await galatDari(masukWarga(NIK_ASING, SITI.pin))
    expect(pinSalah).toMatchObject({ kode: 'VALIDATION', fields: { pin: 'NIK atau PIN salah.' } })
    expect(nikAsing.message).toBe(pinSalah.message)
  })
  it('5 kali salah → RATE_LIMITED 15 menit, juga dengan PIN benar; sesudahnya bisa masuk lagi (fokus review 2)', async () => {
    for (let i = 0; i < 3; i++) await galatDari(masukWarga(SITI.nik, '000000'))
    expect((await galatDari(masukWarga(SITI.nik, '000000'))).message).toBe(
      'NIK atau PIN salah. Sisa 1 kali percobaan sebelum dikunci 15 menit.',
    )
    expect(await galatDari(masukWarga(SITI.nik, '000000'))).toMatchObject({
      kode: 'RATE_LIMITED', status: 429, message: 'Terlalu banyak percobaan — coba lagi 15 menit.',
    })
    expect((await galatDari(masukWarga(SITI.nik, SITI.pin))).kode).toBe('RATE_LIMITED')
    vi.setSystemTime(new Date(SEKARANG_UJI.getTime() + 15 * 60_000 + 1000))
    try {
      expect((await masukWarga(SITI.nik, SITI.pin)).sesi.penduduk.nama).toBe('Siti Rahmah')
    } finally {
      vi.setSystemTime(SEKARANG_UJI)
    }
  })
  it('NIK tidak terdaftar juga dikunci setelah 5 kali salah (fokus review 2)', async () => {
    for (let i = 0; i < 4; i++) await galatDari(masukWarga(NIK_ASING, '000000'))
    expect((await galatDari(masukWarga(NIK_ASING, '000000'))).kode).toBe('RATE_LIMITED')
  })
  it('berhasil masuk mereset hitungan salah', async () => {
    for (let i = 0; i < 4; i++) await galatDari(masukWarga(SITI.nik, '000000'))
    await masukWarga(SITI.nik, SITI.pin)
    expect((await galatDari(masukWarga(SITI.nik, '000000'))).message).toBe('NIK atau PIN salah.')
  })
  it('Lupa PIN: jawaban sama untuk NIK terdaftar maupun tidak, dan PIN tidak berubah (fokus review 2)', async () => {
    const terdaftar = await lupaPin(SITI.nik)
    const asing = await lupaPin(NIK_ASING)
    expect(terdaftar.pesan).toBe(asing.pesan)
    expect((await masukWarga(SITI.nik, SITI.pin)).token).toBe('warga.pdk_siti_rahmah')
  })
  it('token warga tidak berlaku di API admin, dan token admin tidak berlaku di API warga (fokus review 1)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await ambilSesiWarga()).penduduk.nama).toBe('Siti Rahmah')
    aturTokenSesi('warga.pdk_siti_rahmah')
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    aturTokenSesi('demo.pgn_rosmiati', 'warga')
    await expect(ambilSesiWarga()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
    aturTokenSesi('warga_pdk_siti_rahmah', 'warga')
    await expect(ambilSesiWarga()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })
})

describe('akun warga (SPEC §10)', () => {
  it('ganti PIN: PIN lama wajib benar, PIN lemah ditolak, lalu PIN baru dipakai masuk (fokus review 5)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect(await galatDari(ubahAkunWarga({ pinLama: '000000', pinBaru: '580317' }))).toMatchObject({
      kode: 'VALIDATION', fields: { pinLama: 'PIN lama salah.' },
    })
    expect((await galatDari(ubahAkunWarga({ pinLama: SITI.pin, pinBaru: '123456' }))).fields.pinBaru).toBe(
      'PIN tidak boleh angka berurutan seperti 123456.',
    )
    expect(ambilDb().akunWarga.find((a) => a.pendudukId === 'pdk_siti_rahmah')?.pin).toBe(SITI.pin)
    await ubahAkunWarga({ pinLama: SITI.pin, pinBaru: '580317' })
    expect((await galatDari(masukWarga(SITI.nik, SITI.pin))).kode).toBe('VALIDATION')
    expect((await masukWarga(SITI.nik, '580317')).token).toBe('warga.pdk_siti_rahmah')
  })
  it('ganti nomor WhatsApp: +62 dibersihkan; nomor tidak valid ditolak (fokus review 5)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await ubahAkunWarga({ whatsapp: '+62 813-1234-5678' })).whatsapp).toBe('081312345678')
    expect((await galatDari(ubahAkunWarga({ whatsapp: '12345' }))).fields.whatsapp).toBe(
      'Nomor WhatsApp diawali 08 dan terdiri dari 10-13 angka.',
    )
    expect((await ambilSesiWarga()).whatsapp).toBe('081312345678')
  })
})
