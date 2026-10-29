// Kembaran dari apps/web/src/mocks/bantuan.test.ts (13 butir) dan handlers/akses-sinfodes.test.ts (4 dari 6 butir; riwayat contoh
// dan pembacaan jejak per modul tidak berlaku di server): pertanyaan yang sama diajukan ke server sungguhan lewat modul `api/*` web,
// dan jawabannya harus sama dengan API tiruan. Semua selisih ditandai "Perbedaan sengaja:".
import { describe, expect, it } from 'vitest'
import { aturTokenSesi, SESI_KUKI } from '@/api/client'
import { ambilTiketBantuan } from '@/api/konsol'
import { ambilAksesSinfodes, beriAksesSinfodes, cabutAksesSinfodes } from '@/api/pengaturan'
import { cariPenduduk, daftarPenduduk } from '@/api/penduduk'
import { ambilSesi, tukarTiketBantuan } from '@/api/sesi'
import { AKUN_UJI, SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { samarkanDataPribadi } from '../../src/lapisan/bantuan'
import { masukKonsolSebagai, masukSebagai, pakaiApiNyata } from '../api-nyata'

const api = pakaiApiNyata({ segarTiapUji: true })

const PESAN_TIKET = 'Tiket bantuan tidak berlaku. Minta ulang dari Konsol.'
const PESAN_LIHAT = 'Mode bantuan Sinfodes hanya bisa melihat.'
const PESAN_CARI_NOMOR = 'Pencarian dengan angka NIK atau nomor KK tidak tersedia selama data pribadi warga disamarkan.'
const JAM_MS = 3_600_000
const TERSAMAR = /^\d{4}•{8}\d{4}$/

const minta = (jalur: string, metode = 'GET', isi?: unknown) =>
  fetch(`${api.asal()}/api/v1${jalur}`, {
    method: metode,
    headers: isi === undefined ? {} : { 'Content-Type': 'application/json' },
    body: isi === undefined ? undefined : JSON.stringify(isi),
  })
const pesanGalat = async (r: Response): Promise<string> => ((await r.json()) as { error: { message: string } }).error.message

/** Sekdes memberi akses, Tim mengambil tiket untuk Sungai Sialang. */
async function siapkanTiket(sembunyikanDataPribadi = true): Promise<string> {
  await masukSebagai(AKUN_UJI.sekdes)
  await beriAksesSinfodes({ lamaJam: 24, sembunyikanDataPribadi })
  await masukKonsolSebagai('kns_dina')
  const { tiket, alamat } = await ambilTiketBantuan('desa_sungai_sialang')
  expect(alamat).toBe('sungaisialang')
  return tiket
}
/** Tukar tiket di alamat desa seperti halaman `/admin/bantuan` (sesi lama tidak ikut, penanda lokal disimpan). */
async function tukar(tiket: string, label = 'sungaisialang') {
  api.keAlamat(label)
  const hasil = await tukarTiketBantuan(tiket)
  aturTokenSesi(SESI_KUKI)
  return hasil
}
async function masukBantuan(sembunyikanDataPribadi = true) {
  return tukar(await siapkanTiket(sembunyikanDataPribadi))
}
/**
 * Menjalankan `fn` sebagai Sekretaris Desa dari "peramban lain": jar dikosongkan lebih dulu supaya masuknya tidak mencabut sesi
 * bantuan Tim (di server nyata keduanya memakai cookie panel yang sama), lalu cookie Tim dikembalikan.
 */
async function sebagaiSekdes<T>(fn: () => Promise<T>): Promise<T> {
  const tim = api.kukiDi('sungaisialang')
  api.jar.kosongkan()
  await masukSebagai(AKUN_UJI.sekdes)
  try {
    return await fn()
  } finally {
    api.jar.kosongkan()
    api.keAlamat('sungaisialang')
    if (tim) for (const kuki of tim.split('; ')) api.pasangKukiDi('sungaisialang', kuki)
  }
}

describe('sesi bantuan Tim Sinfodes, lihat saja (SPEC-V0.2 §5.2)', () => {
  it('tiket ditukar di alamat desanya menjadi sesi berperan bantuan', async () => {
    const hasil = await masukBantuan()
    // Perbedaan sengaja: tanpa token `bantuan.` dari server; sesinya di cookie HttpOnly dan `api/sesi.ts` mengisi penanda lokal.
    expect(hasil.token).toBe(SESI_KUKI)
    expect(hasil.sesi.pengguna).toMatchObject({ peran: 'bantuan', nama: 'Dina' })
    expect(hasil.sesi.bantuan).toMatchObject({ sembunyikanDataPribadi: true })
    // Perbedaan sengaja: email Tim tidak dibawa ke alamat desa (tiruan mengisi email akun Konsol).
    expect(hasil.sesi.pengguna.email).toBe('')
  })

  it('tiket hanya sekali pakai', async () => {
    const tiket = await siapkanTiket()
    await tukar(tiket)
    await expect(tukar(tiket)).rejects.toMatchObject({ kode: 'UNAUTHENTICATED', message: PESAN_TIKET })
  })

  it('tiket berumur lebih dari 60 detik ditolak', async () => {
    const tiket = await siapkanTiket()
    api.keWaktu(new Date(SEKARANG_UJI.getTime() + 61_000))
    await expect(tukar(tiket)).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })

  it('tiket desa lain ditolak di alamat desa ini', async () => {
    await expect(tukar(await siapkanTiket(), 'tanjunglamo')).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })

  it('Tim Sinfodes tidak bisa mengambil tiket bila desa belum memberi akses', async () => {
    await masukKonsolSebagai('kns_dina')
    await expect(ambilTiketBantuan('desa_sungai_sialang')).rejects.toMatchObject({ kode: 'CONFLICT', message: 'Desa belum memberi akses bantuan.' })
  })

  it('sesi bantuan tidak bisa menulis apa pun, di modul mana pun', async () => {
    await masukBantuan()
    const tulis: [string, string][] = [
      ['POST', '/penduduk'],
      ['PATCH', '/penduduk/pdk_siti_rahmah'],
      ['POST', '/permohonan'],
      ['PUT', '/pengaturan/desa'],
      ['DELETE', '/pengaturan/akses-sinfodes'],
    ]
    // Perbedaan sengaja: server menolak sebelum memilih rute, jadi jalur yang belum dibangun (mis. /permohonan) juga 403.
    for (const [metode, jalur] of tulis) {
      const r = await minta(jalur, metode, metode === 'DELETE' ? undefined : {})
      expect(r.status, `${metode} ${jalur}`).toBe(403)
      expect(await pesanGalat(r), `${metode} ${jalur}`).toBe(PESAN_LIHAT)
    }
    expect((await minta('/sesi/keluar', 'POST')).status).toBe(204)
  })

  it('NIK disamarkan bila desa memintanya, dan setiap halaman tercatat di riwayat desa', async () => {
    await masukBantuan()
    const r = await minta('/penduduk?page=1')
    expect(r.status).toBe(200)
    const { data } = (await r.json()) as { data: { nik: string | null; nomorKk: string }[] }
    expect(data.length).toBeGreaterThan(0)
    for (const p of data) {
      if (p.nik !== null) expect(p.nik).toMatch(TERSAMAR)
      expect(p.nomorKk).toMatch(TERSAMAR)
    }
    // Klien web yang sama menerima bentuk tersamar (skema kontrak membolehkannya).
    expect((await daftarPenduduk({})).data.length).toBeGreaterThan(0)
    const { riwayat } = await sebagaiSekdes(() => ambilAksesSinfodes())
    expect(riwayat[0]?.sesi[0]?.oleh).toBe('Dina')
    expect(riwayat[0]?.sesi[0]?.halaman.map((h) => h.jalur)).toContain('/penduduk?page=1')
  })

  it('pencarian tetap bisa dipakai, hasilnya tersamar dan tercatat', async () => {
    await masukBantuan()
    const hasil = await cariPenduduk('Siti', {})
    expect(hasil.data.length).toBeGreaterThan(0)
    for (const p of hasil.data) if (p.nik !== null) expect(p.nik).toMatch(TERSAMAR)
    // `/cari` (pencarian global) ada sejak 8E3 dan termasuk jalur pencarian-baca: terbaca, NIK tersamar, tercatat.
    const global = await minta('/cari', 'POST', { kata: 'Siti' })
    expect(global.status).toBe(200)
    for (const p of ((await global.json()) as { penduduk: { nik: string | null }[] }).penduduk) if (p.nik !== null) expect(p.nik).toMatch(TERSAMAR)
    const { riwayat } = await sebagaiSekdes(() => ambilAksesSinfodes())
    expect(riwayat[0]?.sesi[0]?.halaman.map((h) => h.jalur)).toEqual(expect.arrayContaining(['/penduduk/cari', '/cari']))
  })

  it('selama data disamarkan, pencarian dengan angka NIK atau KK ditolak supaya NIK tidak bisa ditebak', async () => {
    await masukBantuan()
    const r = await minta('/penduduk/cari', 'POST', { kata: '1405095203', filter: {} })
    expect(r.status).toBe(403)
    expect(await pesanGalat(r)).toBe(PESAN_CARI_NOMOR)
    // `/keluarga/cari` ada sejak 8E1 dan tunduk pada aturan angka yang sama dengan `/penduduk/cari`.
    const kk = await minta('/keluarga/cari', 'POST', { kata: '1405095203', filter: {} })
    expect(kk.status).toBe(403)
    expect(await pesanGalat(kk)).toBe(PESAN_CARI_NOMOR)
    // `/cari` ada sejak 8E3 dan tunduk pada aturan angka yang sama.
    const global = await minta('/cari', 'POST', { kata: '1405095203', filter: {} })
    expect(global.status).toBe(403)
    expect(await pesanGalat(global)).toBe(PESAN_CARI_NOMOR)
    // `/permohonan/cari` ada sejak 8F2a dan tunduk pada aturan angka yang sama.
    const surat = await minta('/permohonan/cari', 'POST', { kata: '1405095203', jenis: null })
    expect(surat.status).toBe(403)
    expect(await pesanGalat(surat)).toBe(PESAN_CARI_NOMOR)
    // Perbedaan sengaja: jalur pencarian modul lain belum ada di server, jadi ditolak sebagai penulisan (403 juga).
    const lain = await minta('/pengaduan/cari', 'POST', { kata: '1405095203', filter: {} })
    expect(lain.status).toBe(403)
    expect(await pesanGalat(lain)).toBe(PESAN_LIHAT)
  })

  it('tanpa penyamaran, pencarian dengan NIK boleh', async () => {
    await masukBantuan(false)
    expect((await cariPenduduk('1405095203918002', {})).meta.total).toBe(1)
  })

  it('tanpa penyamaran, NIK tampil utuh', async () => {
    await masukBantuan(false)
    const { data } = (await (await minta('/penduduk?page=1')).json()) as { data: { nik: string | null }[] }
    expect(data.some((p) => p.nik !== null && /^\d{16}$/.test(p.nik))).toBe(true)
  })

  it('akses yang dicabut langsung mengakhiri sesi bantuan', async () => {
    await masukBantuan()
    expect((await ambilSesi()).pengguna.peran).toBe('bantuan')
    await sebagaiSekdes(() => cabutAksesSinfodes())
    await expect(ambilSesi()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })

  it('penyamaran menjangkau data bersarang dan setiap string 16 angka; telepon tidak disentuh', () => {
    // Butir tiruan memakai telepon 16 angka (untuk membuktikan penyamaran tiruan hanya menyentuh kunci nik dan nomorKk). Telepon
    // sungguhan paling banyak 13 angka (skema kontrak), jadi di sini dipakai bentuk yang sah dan keluarannya sama persis.
    const asal = { anggota: [{ nik: '1405095203918002', nama: 'A' }], kk: { nomorKk: '1405090000000001' }, telepon: '081234567890' }
    expect(samarkanDataPribadi(asal)).toEqual({
      anggota: [{ nik: '1405••••••••8002', nama: 'A' }],
      kk: { nomorKk: '1405••••••••0001' },
      telepon: '081234567890',
    })
    // Perbedaan sengaja: server menyamarkan berdasarkan isi (16 angka di kunci apa pun, juga di tengah kalimat), tiruan hanya di
    // kunci nik dan nomorKk; karena itu telepon 16 angka milik butir tiruan ikut tersamar di server (tidak ada telepon seperti itu).
    expect(samarkanDataPribadi({ catatan: 'NIK 1405095203918002', telepon: '0812345678901234' })).toEqual({
      catatan: 'NIK 1405••••••••8002',
      telepon: '0812••••••••1234',
    })
  })
})

describe('akses bantuan Sinfodes, sisi desa (SPEC-V0.2 §5.2)', () => {
  it('Sekretaris Desa memberi akses 24 jam dengan data pribadi disamarkan', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    const hasil = await beriAksesSinfodes({ lamaJam: 24, sembunyikanDataPribadi: true })
    expect(hasil.aktif).toMatchObject({ sembunyikanDataPribadi: true, diberiOleh: 'Hendri Saputra' })
    expect(new Date(hasil.aktif?.sampai ?? '').getTime()).toBe(SEKARANG_UJI.getTime() + 24 * JAM_MS)
    expect(hasil.riwayat[0]).toMatchObject({ id: hasil.aktif?.id, berakhir: null })
  })

  it('Kepala Desa juga bisa memberi akses; Operator tidak', async () => {
    await masukSebagai(AKUN_UJI.kades)
    expect((await beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: false })).aktif).not.toBeNull()
    await masukSebagai(AKUN_UJI.operator)
    await expect(ambilAksesSinfodes()).rejects.toMatchObject({ kode: 'FORBIDDEN' })
    await expect(beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: true })).rejects.toMatchObject({ kode: 'FORBIDDEN' })
  })

  it('memberi akses baru menutup akses yang masih aktif', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    const pertama = await beriAksesSinfodes({ lamaJam: 72, sembunyikanDataPribadi: true })
    const kedua = await beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: true })
    expect(kedua.aktif?.id).not.toBe(pertama.aktif?.id)
    expect(kedua.riwayat.find((r) => r.id === pertama.aktif?.id)?.berakhir).toBe('dicabut')
  })

  it('cabut: tidak ada akses aktif, dan riwayat teratas berakhir karena dicabut', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    await beriAksesSinfodes({ lamaJam: 24, sembunyikanDataPribadi: true })
    const hasil = await cabutAksesSinfodes()
    expect(hasil.aktif).toBeNull()
    expect(hasil.riwayat[0]?.berakhir).toBe('dicabut')
  })

  it('Perbedaan sengaja: server mulai tanpa riwayat contoh (tiruan memuat satu sesi Dina yang sudah habis)', async () => {
    await masukSebagai(AKUN_UJI.sekdes)
    const { aktif, riwayat } = await ambilAksesSinfodes()
    expect(aktif).toBeNull()
    expect(riwayat).toEqual([])
  })
})
