import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilDetailDesaKonsol, ubahPeriodeTagihan, ubahStatusDesa } from '@/api/konsol'
import { HARGA_TRIWULAN } from '@/domain/konsol/filter'
import type { StatusDesa } from '@/domain/wilayah/schema'
import { AKUN_KABUPATEN_UJI, AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { ID_SUNGAI_SIALANG, ID_TANJUNG_LAMO } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'
import { pastikanTagihan } from '../tagihan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const ALASAN = 'Keputusan Tim Sinfodes setelah konfirmasi.'
const masukTim = () => masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
/** Desa contoh (rekaman) dengan status tertentu. */
const desaFiktif = (status: StatusDesa) => ambilDb().desa.find((d) => d.status === status && ambilDb().rekamDesa.some((r) => r.desaId === d.id))!
const statusDi = (id: string) => ambilDb().desa.find((d) => d.id === id)!.status

describe('POST /konsol/desa/:id/status', () => {
  it('Persiapan -> Uji coba ditolak bila langkah persiapan belum lengkap (Tanjung Lamo)', async () => {
    masukTim()
    await expect(ubahStatusDesa(ID_TANJUNG_LAMO, { ke: 'Uji coba', alasan: ALASAN })).rejects.toMatchObject({
      status: 409, message: 'Selesaikan kelima langkah persiapan dulu.',
    })
    expect(statusDi(ID_TANJUNG_LAMO)).toBe('Persiapan')
    expect(ambilDb().riwayatStatusDesa.filter((r) => r.desaId === ID_TANJUNG_LAMO)).toEqual([])
  })
  it('Persiapan -> Uji coba bila kelima langkah selesai: masa uji coba 60 hari dan riwayat status bertambah', async () => {
    const desa = desaFiktif('Persiapan')
    ubahDb((d) => {
      d.rekamDesa.find((r) => r.desaId === desa.id)!.langkahSelesai = 5
    })
    masukTim()
    const detail = await ubahStatusDesa(desa.id, { ke: 'Uji coba', alasan: ALASAN })
    expect(detail.status).toBe('Uji coba')
    expect(detail.langganan).toMatchObject({ mulai: '2026-09-24', sampai: '2026-11-23' })
    expect(detail.riwayatStatus).toHaveLength(1)
    expect(detail.riwayatStatus[0]).toMatchObject({ dari: 'Persiapan', ke: 'Uji coba', alasan: ALASAN, oleh: { id: 'kns_dina', nama: 'Dina' } })
    expect(ambilDb().tagihan.filter((t) => t.desaId === desa.id)).toEqual([])
  })
  it('Uji coba -> Aktif: langganan mulai hari ini, tahunan, tagihan pertama terbit hari ini dengan jatuh tempo hari ini + 14; tidak ada tagihan ganda', async () => {
    const desa = desaFiktif('Uji coba')
    masukTim()
    const detail = await ubahStatusDesa(desa.id, { ke: 'Aktif', alasan: ALASAN })
    expect(detail.status).toBe('Aktif')
    expect(detail.langganan).toMatchObject({ mulai: '2026-09-24', periodeTagihan: 'tahunan', sampai: '2026-12-31' })
    expect(detail.tagihan).toHaveLength(1)
    const t = detail.tagihan[0]
    expect(t).toMatchObject({ status: 'terbit', terbit: '2026-09-24', jatuhTempo: '2026-10-08', harga: HARGA_TRIWULAN[detail.langganan.paket] * 4 })
    expect(t.periode).toMatchObject({ jenis: 'tahunan', label: 'Tahun 2026', mulai: '2026-01-01', sampai: '2026-12-31' })
    expect(t.riwayat[0].pada).toBe('2026-09-24T09:00:00+07:00')
    pastikanTagihan(new Date())
    expect(ambilDb().tagihan.filter((x) => x.desaId === desa.id)).toHaveLength(1)
  })
  it('Aktif -> Ditangguhkan lalu dicabut kembali ke Aktif, dua-duanya tercatat, terbaru dulu', async () => {
    masukTim()
    const ke1 = await ubahStatusDesa(ID_SUNGAI_SIALANG, { ke: 'Ditangguhkan', alasan: ALASAN })
    expect(ke1.status).toBe('Ditangguhkan')
    const ke2 = await ubahStatusDesa(ID_SUNGAI_SIALANG, { ke: 'Aktif', alasan: 'Tunggakan sudah dilunasi.' })
    expect(ke2.status).toBe('Aktif')
    expect(ke2.riwayatStatus.map((r) => `${r.dari}>${r.ke}`)).toEqual(['Ditangguhkan>Aktif', 'Aktif>Ditangguhkan'])
    expect((await ambilDetailDesaKonsol(ID_SUNGAI_SIALANG)).riwayatStatus).toHaveLength(2)
  })
  it('perpindahan lain atau ke status sendiri: 409; desa tidak ada: 404', async () => {
    masukTim()
    for (const ke of ['Persiapan', 'Uji coba', 'Aktif'] as const) {
      await expect(ubahStatusDesa(ID_SUNGAI_SIALANG, { ke, alasan: ALASAN })).rejects.toMatchObject({
        status: 409, message: 'Perubahan status ini tidak tersedia.',
      })
    }
    await expect(ubahStatusDesa('desa_tidak_ada', { ke: 'Aktif', alasan: ALASAN })).rejects.toMatchObject({ status: 404 })
    expect(statusDi(ID_SUNGAI_SIALANG)).toBe('Aktif')
  })
  it('alasan 9 karakter: 422 dan status tidak berubah', async () => {
    masukTim()
    await expect(ubahStatusDesa(ID_SUNGAI_SIALANG, { ke: 'Ditangguhkan', alasan: 'Sembilan.' })).rejects.toMatchObject({
      status: 422, fields: { alasan: 'Isi alasan paling sedikit 10 karakter.' },
    })
    expect(statusDi(ID_SUNGAI_SIALANG)).toBe('Aktif')
  })
  it('ke status tidak dikenal: 422', async () => {
    masukTim()
    await expect(ubahStatusDesa(ID_SUNGAI_SIALANG, { ke: 'Libur' as never, alasan: ALASAN })).rejects.toMatchObject({ status: 422 })
  })
  it('akun desa tidak bisa: 401', async () => {
    masukSebagai(AKUN_UJI.kades)
    await expect(ubahStatusDesa(ID_SUNGAI_SIALANG, { ke: 'Ditangguhkan', alasan: ALASAN })).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })
})

describe('data contoh desa Ditangguhkan', () => {
  it('Air Tawar Jaya dan Segati Hilir punya riwayat status: sehari sesudah masa langganan habis', () => {
    for (const nama of ['Air Tawar Jaya', 'Segati Hilir']) {
      const d = ambilDb().desa.find((x) => x.nama === nama)!
      const l = ambilDb().langganan.find((x) => x.desaId === d.id)!
      const r = ambilDb().riwayatStatusDesa.filter((x) => x.desaId === d.id)
      expect(r).toHaveLength(1)
      expect(r[0]).toMatchObject({ dari: 'Aktif', ke: 'Ditangguhkan', alasan: 'Tagihan dua triwulan belum dibayar.' })
      const hari = Date.parse(`${l.sampai}T00:00:00Z`) + 86_400_000
      expect(r[0].pada.slice(0, 10)).toBe(new Date(hari).toISOString().slice(0, 10))
    }
  })
})

describe('PUT /konsol/desa/:id/periode-tagihan', () => {
  it('berlaku mulai tagihan berikutnya; tagihan yang sudah terbit tetap', async () => {
    masukTim()
    const sebelum = structuredClone(ambilDb().tagihan.filter((t) => t.desaId === ID_SUNGAI_SIALANG))
    const detail = await ubahPeriodeTagihan(ID_SUNGAI_SIALANG, 'tahunan')
    expect(detail.langganan.periodeTagihan).toBe('tahunan')
    expect(ambilDb().tagihan.filter((t) => t.desaId === ID_SUNGAI_SIALANG)).toEqual(sebelum)
    pastikanTagihan(new Date('2026-12-20T02:00:00Z'))
    const baru = ambilDb().tagihan.filter((t) => t.desaId === ID_SUNGAI_SIALANG && t.periode.mulai === '2027-01-01')
    expect(baru).toHaveLength(1)
    expect(baru[0]).toMatchObject({ periode: { jenis: 'tahunan', label: 'Tahun 2027' }, harga: HARGA_TRIWULAN.Lengkap * 4 })
  })
  it('nilai tidak dikenal: 422; desa tidak ada: 404; akun desa: 401', async () => {
    masukTim()
    await expect(ubahPeriodeTagihan(ID_SUNGAI_SIALANG, 'bulanan' as never)).rejects.toMatchObject({ status: 422 })
    await expect(ubahPeriodeTagihan('desa_tidak_ada', 'tahunan')).rejects.toMatchObject({ status: 404 })
    aturTokenSesi(null, 'konsol')
    masukSebagai(AKUN_UJI.kades)
    await expect(ubahPeriodeTagihan(ID_SUNGAI_SIALANG, 'tahunan')).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })
})

describe('batas data kabupaten setelah penangguhan', () => {
  it('kabupaten melihat status baru, tetapi tidak alasan, riwayat status, maupun tagihannya', async () => {
    masukTim()
    const air = ambilDb().desa.find((d) => d.nama === 'Sungai Rambai')!
    await ubahStatusDesa(air.id, { ke: 'Ditangguhkan', alasan: 'Tunggakan satu tahun tidak dilunasi.' })
    aturTokenSesi(`kab.${AKUN_KABUPATEN_UJI.admin}`, 'kabupaten')
    const respons = await fetch('http://localhost:3000/api/v1/kabupaten/pemantauan', { headers: { Authorization: `Bearer kab.${AKUN_KABUPATEN_UJI.admin}` } })
    expect(respons.status).toBe(200)
    const teks = await respons.text()
    expect(teks).toContain('Sungai Rambai')
    const json = JSON.parse(teks) as { kecamatan: { desa: { nama: string; status: string }[] }[] }
    const baris = json.kecamatan.flatMap((k) => k.desa).find((d) => d.nama === 'Sungai Rambai')
    expect(baris?.status).toBe('Ditangguhkan')
    for (const terlarang of ['Tunggakan satu tahun', 'alasan', 'riwayatStatus', 'tagihan']) expect(teks).not.toContain(terlarang)
  })
})
