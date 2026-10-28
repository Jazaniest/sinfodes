import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { ambil, rakitApp, sisipAksesUji, sisipSesiBantuanUji } from '../../test/rakit-app'
import { badanGalat, GalatApp } from '../galat'
import { catatJejakBantuan } from '../sesi/repositori-bantuan'
import { JALUR_CARI_BACA, lapisanBantuan, PESAN_CARI_NOMOR, PESAN_LIHAT_SAJA, PESAN_UNDUHAN, samarkanDataPribadi } from './bantuan'
import type { LingkunganApp, PelakuPanel } from './konteks'

const SS = 'http://sungaisialang.sinfodes.localhost'
const DESA_SS = 'desa_sungai_sialang'
const JAM = 3600_000
const MENIT = 60_000
const lewat = (ms: number): Date => new Date(SEKARANG_UJI.getTime() + ms)
const NIK = /\d{16}/
const NIK_TERSAMAR = /^\d{4}•{8}\d{4}$/

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  await uji.sqlMigrasi`delete from jejak_bantuan`
  await uji.sqlMigrasi`delete from sesi_bantuan`
  await uji.sqlMigrasi`delete from akses_bantuan`
})

const siapkan = async (sembunyikan: boolean) => {
  const akses = await sisipAksesUji(uji.sqlMigrasi, { desaId: DESA_SS, mulai: lewat(-1 * JAM), sembunyikan })
  const sesi = await sisipSesiBantuanUji(uji.sqlMigrasi, { desaId: DESA_SS, aksesId: akses.id, dibuat: lewat(-10 * MENIT), olehNama: 'Dina Uji' })
  return { akses, sesi }
}
const jejak = async (): Promise<string[]> => (await uji.sqlMigrasi`select jalur from jejak_bantuan order by urut`).map((b) => b.jalur as string)
const kirim = (app: ReturnType<typeof rakitApp>['app'], metode: string, jalur: string, kuki: string, badan?: unknown) =>
  app.fetch(
    new Request(`${SS}/api/v1${jalur}`, {
      method: metode,
      headers: { 'Content-Type': 'application/json', Origin: SS, Cookie: kuki },
      ...(badan === undefined ? {} : { body: JSON.stringify(badan) }),
    }),
  )
const rakit = async () => rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) })

describe('lapisan bantuan: lihat saja', () => {
  it('POST, PUT, PATCH, DELETE, dan OPTIONS ke jalur apa pun ditolak FORBIDDEN, termasuk jalur yang tidak ada, tanpa jejak', async () => {
    const { app } = await rakit()
    const { sesi } = await siapkan(true)
    for (const metode of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      for (const jalur of ['/penduduk', '/pengaturan/akses-sinfodes', '/jalur-yang-tak-ada']) {
        const res = await kirim(app, metode, jalur, sesi.kuki, metode === 'DELETE' || metode === 'OPTIONS' ? undefined : {})
        expect(res.status, `${metode} ${jalur}`).toBe(403)
        expect(await res.json(), `${metode} ${jalur}`).toEqual(badanGalat('FORBIDDEN', PESAN_LIHAT_SAJA))
      }
    }
    expect(await jejak()).toEqual([])
  })

  it('POST /penduduk/cari tetap diizinkan, begitu pula jalur yang hanya mengganti sesi (keluar, masuk panel, tukar tiket)', async () => {
    const { app } = await rakit()
    const { sesi } = await siapkan(false)
    expect((await kirim(app, 'POST', '/penduduk/cari', sesi.kuki, { kata: 'Siti', filter: {} })).status).toBe(200)
    // Masuk dengan kata sandi salah dan tukar tiket ngawur: ditolak oleh rutenya sendiri (bukan FORBIDDEN dari lapisan).
    const masuk = await kirim(app, 'POST', '/sesi/masuk', sesi.kuki, { email: 'x@sungaisialang.desa.id', kataSandi: 'salah' })
    expect(masuk.status).toBe(422)
    expect((await kirim(app, 'POST', '/sesi/bantuan', sesi.kuki, { tiket: 'ngawur' })).status).not.toBe(403)
    expect((await kirim(app, 'POST', '/sesi/keluar', sesi.kuki, {})).status).toBe(204)
  })

  it('daftar jalur pencarian-baca hanya memuat /cari, /penduduk/cari, dan /keluarga/cari (modul baru menambah sendiri)', () => {
    expect([...JALUR_CARI_BACA]).toEqual(['/cari', '/penduduk/cari', '/keluarga/cari'])
  })

  it('pelaku panel biasa tidak terpengaruh: ia tetap bisa melakukan POST yang sah', async () => {
    const { app } = await rakit()
    const sesiBiasa = await uji.sqlMigrasi`select id from pengguna where id = 'pgn_rosmiati'`
    expect(sesiBiasa).toHaveLength(1)
    const res = await app.fetch(
      new Request(`${SS}/api/v1/sesi/masuk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: SS, 'X-Uji-Ip': '10.5.0.1' },
        body: JSON.stringify({ email: 'rosmiati@sungaisialang.desa.id', kataSandi: 'demo' }),
      }),
    )
    const kuki = res.headers.getSetCookie()[0].split(';')[0]
    const cari = await kirim(app, 'POST', '/penduduk/cari', kuki, { kata: 'Siti', filter: {} })
    expect(cari.status).toBe(200)
    expect(await jejak()).toEqual([])
  })
})

describe('lapisan bantuan: jejak', () => {
  it('GET dicatat dengan jalur dan query dari colokan waktu; GET /sesi tidak; pencarian dicatat tanpa isi badan; HEAD seperti GET', async () => {
    const { app } = await rakit()
    const { sesi } = await siapkan(false)
    expect((await ambil(app, `${SS}/api/v1/penduduk?page=1`, sesi.kuki)).status).toBe(200)
    expect((await ambil(app, `${SS}/api/v1/sesi`, sesi.kuki)).status).toBe(200)
    expect((await kirim(app, 'POST', '/penduduk/cari', sesi.kuki, { kata: 'Siti', filter: {} })).status).toBe(200)
    expect((await kirim(app, 'HEAD', '/penduduk/ringkasan', sesi.kuki)).status).toBe(200)
    expect(await jejak()).toEqual(['/penduduk?page=1', '/penduduk/cari', '/penduduk/ringkasan'])
    const baris = await uji.sqlMigrasi`select waktu, desa_id, sesi_id from jejak_bantuan order by urut limit 1`
    expect(baris[0].waktu).toEqual(SEKARANG_UJI)
    expect(baris[0]).toMatchObject({ desa_id: DESA_SS, sesi_id: sesi.id })
  })

  it('angka panjang di query tidak masuk jejak', async () => {
    const { app } = await rakit()
    const { sesi } = await siapkan(false)
    await ambil(app, `${SS}/api/v1/penduduk?kata=1405095203918002`, sesi.kuki)
    const baris = await jejak()
    expect(baris).toHaveLength(1)
    expect(baris[0]).not.toMatch(/\d{6}/)
  })
})

describe('lapisan bantuan: penyamaran NIK dan nomor KK', () => {
  const kumpulkan = (nilai: unknown, kunci: string, hasil: string[] = []): string[] => {
    if (Array.isArray(nilai)) nilai.forEach((x) => kumpulkan(x, kunci, hasil))
    else if (nilai && typeof nilai === 'object') {
      for (const [k, v] of Object.entries(nilai)) {
        if (k === kunci && typeof v === 'string') hasil.push(v)
        else kumpulkan(v, kunci, hasil)
      }
    }
    return hasil
  }

  it('menyala: daftar dan hasil pencarian tidak memuat 16 angka; nik dan nomorKk berbentuk 1405••••••••8002', async () => {
    const { app } = await rakit()
    const { sesi } = await siapkan(true)
    const daftar = (await (await ambil(app, `${SS}/api/v1/penduduk`, sesi.kuki)).json()) as { data: unknown[] }
    const teksDaftar = JSON.stringify(daftar)
    expect(NIK.test(teksDaftar)).toBe(false)
    const nik = kumpulkan(daftar, 'nik')
    const kk = kumpulkan(daftar, 'nomorKk')
    expect(nik.length).toBeGreaterThan(0)
    expect(kk.length).toBeGreaterThan(0)
    for (const n of [...nik, ...kk]) expect(n).toMatch(NIK_TERSAMAR)
    const cari = await kirim(app, 'POST', '/penduduk/cari', sesi.kuki, { kata: 'Siti', filter: {} })
    expect(cari.status).toBe(200)
    expect(NIK.test(JSON.stringify(await cari.json()))).toBe(false)
  })

  it('menyala: pencarian yang memuat lima angka berurutan ditolak, empat angka dan nama lolos', async () => {
    const { app } = await rakit()
    const { sesi } = await siapkan(true)
    for (const kata of ['12345', 'abc12345', '1405095203918002']) {
      const res = await kirim(app, 'POST', '/penduduk/cari', sesi.kuki, { kata, filter: {} })
      expect(res.status, kata).toBe(403)
      expect(await res.json(), kata).toEqual(badanGalat('FORBIDDEN', PESAN_CARI_NOMOR))
    }
    for (const kata of ['1234', 'Siti']) expect((await kirim(app, 'POST', '/penduduk/cari', sesi.kuki, { kata, filter: {} })).status, kata).toBe(200)
  })

  it('mati: NIK tampil utuh dan pencarian dengan angka NIK boleh', async () => {
    const { app } = await rakit()
    const { sesi } = await siapkan(false)
    const daftar = (await (await ambil(app, `${SS}/api/v1/penduduk`, sesi.kuki)).json()) as unknown
    const nik = kumpulkan(daftar, 'nik').filter((n) => NIK.test(n))
    expect(nik.length).toBeGreaterThan(0)
    const cari = await kirim(app, 'POST', '/penduduk/cari', sesi.kuki, { kata: nik[0], filter: {} })
    expect(cari.status).toBe(200)
  })
})

describe('samarkanDataPribadi', () => {
  it('menjangkau data bersarang dan setiap string berisi 16 angka berurutan, di kunci apa pun dan di tengah kalimat', () => {
    expect(samarkanDataPribadi({ nik: '1405095203918002', anak: [{ nomorKk: '1405090101120003', nama: 'Siti' }] })).toEqual({
      nik: '1405••••••••8002',
      anak: [{ nomorKk: '1405••••••••0003', nama: 'Siti' }],
    })
    expect(samarkanDataPribadi({ catatan: 'NIK 1405095203918002 dan abc1405090101120003xyz.' })).toEqual({
      catatan: 'NIK 1405••••••••8002 dan abc1405••••••••0003xyz.',
    })
  })

  it('tidak menyentuh 17 angka, 18 angka (NIP), angka bertipe number, dan nilai bukan string', () => {
    const utuh = { nip: '198001012005011001', tujuhBelas: '14050952039180021', angka: 1405095203918002, id: 'pdk_1', kosong: null, benar: true }
    expect(samarkanDataPribadi(utuh)).toEqual(utuh)
    expect(samarkanDataPribadi(null)).toBeNull()
  })
})

describe('lapisan bantuan di app kecil: jawaban bukan-JSON dan kegagalan jejak', () => {
  const pelakuBantuan = (sesiId: string, aksesId: string, sembunyikan: boolean, peran: 'bantuan' | 'operator' = 'bantuan'): PelakuPanel => ({
    id: `bantuan_${sesiId}`, desaId: DESA_SS, nama: 'Dina Uji', jabatan: 'Tim Sinfodes', peran, dusunId: null, email: '', aktif: true, nip: null,
    jenis: 'panel', sesiId,
    ...(peran === 'bantuan' ? { bantuan: { aksesId, sampai: lewat(23 * JAM), sembunyikanDataPribadi: sembunyikan } } : {}),
  })
  const appKecil = (pelaku: PelakuPanel, catatJejak?: typeof catatJejakBantuan) => {
    const app = new Hono<LingkunganApp>()
    app.use('*', async (c, next) => {
      c.set('waktu', () => SEKARANG_UJI)
      c.set('pelaku', pelaku)
      await uji.klien.dalamTransaksi('desa', { desaId: DESA_SS }, async (db) => {
        c.set('dbTransaksi', db)
        await next()
      })
    })
    app.use('*', lapisanBantuan(catatJejak ? { catatJejak } : {}))
    app.onError((e, c) =>
      e instanceof GalatApp ? c.json(badanGalat(e.kode, e.message), e.status as ContentfulStatusCode) : c.json(badanGalat('SERVER', 'galat'), 500),
    )
    const dipanggil = vi.fn()
    app.get('/api/v1/unduh', (c) => {
      dipanggil()
      return c.body('nama,nik\nSiti,1405095203918002', 200, { 'Content-Type': 'text/csv' })
    })
    app.get('/api/v1/kosong', (c) => c.body(null, 204))
    return { app, dipanggil }
  }

  it('penyamaran menyala: jawaban sukses bukan-JSON menjadi 403; 204 lolos', async () => {
    const { akses, sesi } = await siapkan(true)
    const { app } = appKecil(pelakuBantuan(sesi.id, akses.id, true))
    const res = await app.fetch(new Request('http://x.test/api/v1/unduh'))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual(badanGalat('FORBIDDEN', PESAN_UNDUHAN))
    expect((await app.fetch(new Request('http://x.test/api/v1/kosong'))).status).toBe(204)
  })

  it('penyamaran mati: jawaban bukan-JSON lewat apa adanya', async () => {
    const { akses, sesi } = await siapkan(false)
    const { app } = appKecil(pelakuBantuan(sesi.id, akses.id, false))
    const res = await app.fetch(new Request('http://x.test/api/v1/unduh'))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('1405095203918002')
  })

  it('jejak yang gagal ditulis menggagalkan permintaan dan handler tidak dijalankan', async () => {
    const { akses, sesi } = await siapkan(false)
    const { app, dipanggil } = appKecil(pelakuBantuan(sesi.id, akses.id, false), () => Promise.reject(new Error('basis data penuh')))
    const res = await app.fetch(new Request('http://x.test/api/v1/unduh'))
    expect(res.status).toBe(500)
    expect(dipanggil).not.toHaveBeenCalled()
  })

  it('pelaku tanpa batas bantuan (pengguna desa) tidak disentuh lapisan', async () => {
    const { akses, sesi } = await siapkan(true)
    const { app, dipanggil } = appKecil(pelakuBantuan(sesi.id, akses.id, true, 'operator'))
    const res = await app.fetch(new Request('http://x.test/api/v1/unduh'))
    expect(res.status).toBe(200)
    expect(dipanggil).toHaveBeenCalledOnce()
    expect(await jejak()).toEqual([])
  })
})
