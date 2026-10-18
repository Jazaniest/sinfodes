import { describe, expect, it, vi } from 'vitest'
import { ambilTiketBantuan } from '@/api/konsol'
import { ambilAksesSinfodes, beriAksesSinfodes, cabutAksesSinfodes } from '@/api/pengaturan'
import { AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { samarkanDataPribadi } from './bantuan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const url = (label: string, jalur: string) => `http://${label}.sinfodes.localhost/api/v1${jalur}`
const minta = (alamat: string, token: string | null, metode = 'GET', isi?: unknown) =>
  fetch(alamat, {
    method: metode,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(isi === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: isi === undefined ? undefined : JSON.stringify(isi),
  })
const PESAN_TIKET = 'Tiket bantuan tidak berlaku. Minta ulang dari Konsol.'
const PESAN_LIHAT = 'Mode bantuan Sinfodes hanya bisa melihat.'

/** Sekdes memberi akses, Tim mengambil tiket untuk Sungai Sialang. */
async function siapkanTiket(sembunyikanDataPribadi = true): Promise<string> {
  masukSebagai(AKUN_UJI.sekdes)
  await beriAksesSinfodes({ lamaJam: 24, sembunyikanDataPribadi })
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  const { tiket, alamat } = await ambilTiketBantuan('desa_sungai_sialang')
  expect(alamat).toBe('sungaisialang')
  return tiket
}
async function tukar(tiket: string, label = 'sungaisialang') {
  return minta(url(label, '/sesi/bantuan'), null, 'POST', { tiket })
}
async function masukBantuan(sembunyikanDataPribadi = true): Promise<string> {
  const r = await tukar(await siapkanTiket(sembunyikanDataPribadi))
  expect(r.status).toBe(200)
  return ((await r.json()) as { token: string }).token
}

describe('sesi bantuan Tim Sinfodes, lihat saja (SPEC-V0.2 §5.3)', () => {
  it('tiket ditukar di alamat desanya menjadi sesi berperan bantuan', async () => {
    const r = await tukar(await siapkanTiket())
    expect(r.status).toBe(200)
    const hasil = (await r.json()) as { token: string; sesi: { pengguna: { peran: string; nama: string }; bantuan: unknown } }
    expect(hasil.token).toMatch(/^bantuan\./)
    expect(hasil.sesi.pengguna).toMatchObject({ peran: 'bantuan', nama: 'Dina' })
    expect(hasil.sesi.bantuan).toMatchObject({ sembunyikanDataPribadi: true })
  })
  it('tiket hanya sekali pakai', async () => {
    const tiket = await siapkanTiket()
    expect((await tukar(tiket)).status).toBe(200)
    const kedua = await tukar(tiket)
    expect(kedua.status).toBe(401)
    expect(((await kedua.json()) as { error: { message: string } }).error.message).toBe(PESAN_TIKET)
  })
  it('tiket berumur lebih dari 60 detik ditolak', async () => {
    const tiket = await siapkanTiket()
    vi.setSystemTime(new Date(SEKARANG_UJI.getTime() + 61_000))
    try {
      expect((await tukar(tiket)).status).toBe(401)
    } finally {
      vi.setSystemTime(SEKARANG_UJI)
    }
  })
  it('tiket desa lain ditolak di alamat desa ini', async () => {
    expect((await tukar(await siapkanTiket(), 'tanjunglamo')).status).toBe(401)
  })
  it('Tim Sinfodes tidak bisa mengambil tiket bila desa belum memberi akses', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    await expect(ambilTiketBantuan('desa_sungai_sialang')).rejects.toMatchObject({
      kode: 'CONFLICT', message: 'Desa belum memberi akses bantuan.',
    })
  })
  it('sesi bantuan tidak bisa menulis apa pun, di modul mana pun', async () => {
    const token = await masukBantuan()
    const tulis: [string, string][] = [
      ['POST', '/penduduk'],
      ['PATCH', '/penduduk/pdk_siti_rahmah'],
      ['POST', '/permohonan'],
      ['PUT', '/pengaturan/desa'],
      ['DELETE', '/pengaturan/akses-sinfodes'],
    ]
    for (const [metode, jalur] of tulis) {
      const r = await minta(url('sungaisialang', jalur), token, metode, {})
      expect(r.status, `${metode} ${jalur}`).toBe(403)
      expect(((await r.json()) as { error: { message: string } }).error.message).toBe(PESAN_LIHAT)
    }
    expect((await minta(url('sungaisialang', '/sesi/keluar'), token, 'POST')).status).toBe(204)
  })
  it('NIK disamarkan bila desa memintanya, dan setiap halaman tercatat di riwayat desa', async () => {
    const token = await masukBantuan()
    const r = await minta(url('sungaisialang', '/penduduk?page=1'), token)
    expect(r.status).toBe(200)
    const { data } = (await r.json()) as { data: { nik: string | null; nomorKk: string }[] }
    expect(data.length).toBeGreaterThan(0)
    for (const p of data) {
      if (p.nik !== null) expect(p.nik).toMatch(/^\d{4}•{8}\d{4}$/)
      expect(p.nomorKk).toMatch(/^\d{4}•{8}\d{4}$/)
    }
    masukSebagai(AKUN_UJI.sekdes)
    const { riwayat } = await ambilAksesSinfodes()
    expect(riwayat[0]?.sesi[0]?.halaman.map((h) => h.jalur)).toContain('/penduduk?page=1')
  })
  it('tanpa penyamaran, NIK tampil utuh', async () => {
    const token = await masukBantuan(false)
    const { data } = (await (await minta(url('sungaisialang', '/penduduk?page=1'), token)).json()) as { data: { nik: string | null }[] }
    expect(data.some((p) => p.nik !== null && /^\d{16}$/.test(p.nik))).toBe(true)
  })
  it('akses yang dicabut langsung mengakhiri sesi bantuan', async () => {
    const token = await masukBantuan()
    expect((await minta(url('sungaisialang', '/sesi'), token)).status).toBe(200)
    masukSebagai(AKUN_UJI.sekdes)
    await cabutAksesSinfodes()
    expect((await minta(url('sungaisialang', '/sesi'), token)).status).toBe(401)
  })
  it('penyamaran menjangkau data bersarang dan hanya kunci nik serta nomorKk', () => {
    expect(
      samarkanDataPribadi({ anggota: [{ nik: '1405095203918002', nama: 'A' }], kk: { nomorKk: '1405090000000001' }, telepon: '0812345678901234' }),
    ).toEqual({ anggota: [{ nik: '1405••••••••8002', nama: 'A' }], kk: { nomorKk: '1405••••••••0001' }, telepon: '0812345678901234' })
  })
})
