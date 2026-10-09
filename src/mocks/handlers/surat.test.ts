import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { panggilApi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { ambilJumlahPermohonan, ambilPermohonan, cariPermohonan, daftarJenisSurat, daftarPermohonan } from '@/api/surat'
import { ambilDb } from '@/mocks/db'
import { serverUji } from '@/mocks/node'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('API Layanan Surat: baca (SPEC §3.4, §7.4)', () => {
  it('12 jenis surat desa, urut seperti SPEC', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await daftarJenisSurat()).data.map((j) => j.kode)).toEqual([
      'SKD', 'SKTM', 'SKU', 'SPCK', 'SKL', 'SKM', 'SPP', 'SKP', 'SPN', 'SKBN', 'SKBM', 'SKH',
    ])
  })
  it('tab Menunggu: 7 permohonan, terlama dulu, dengan pemohon dan jenisnya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { data, meta } = await daftarPermohonan({ status: 'menunggu' })
    expect(meta.total).toBe(7)
    const masuk = data.map((b) => b.masukPada)
    expect(masuk).toEqual([...masuk].sort())
    expect(data[0]).toMatchObject({ status: 'menunggu', kanal: 'online', nomor: null, dikembalikan: false })
    expect(data[0].pemohon.nik).toMatch(/^\d{16}$/)
  })
  it('jumlah per status: yang masih terbuka tidak dibatasi periode; angka menu per peran', async () => {
    masukSebagai(AKUN_UJI.operator)
    const duaMinggu = await ambilJumlahPermohonan(14, null)
    expect(duaMinggu.status).toMatchObject({ menunggu: 7, diproses: 5, 'perlu-ttd': 3 })
    expect(duaMinggu.perluTindakan).toBe(8)
    expect((await ambilJumlahPermohonan(365, null)).status.selesai).toBeGreaterThan(duaMinggu.status.selesai)
    expect((await ambilJumlahPermohonan(14, 'SKTM')).status['perlu-ttd']).toBe(1)
    masukSebagai(AKUN_UJI.sekdes)
    expect((await ambilJumlahPermohonan(14, null)).perluTindakan).toBe(9)
    masukSebagai(AKUN_UJI.kades)
    expect((await ambilJumlahPermohonan(14, null)).perluTindakan).toBe(2)
  })
  it('tab Selesai dibatasi periode, terbaru dulu, dengan nomor surat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarPermohonan({ status: 'selesai', periode: 14 })
    expect(data.length).toBeGreaterThan(10)
    expect(data[0].nomor).toMatch(/\/SS\//)
    const tutup = data.map((b) => b.ditutupPada ?? '')
    expect(tutup).toEqual([...tutup].sort().reverse())
  })
  it('filter jenis memakai kode', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { data } = await daftarPermohonan({ status: 'perlu-ttd', jenis: 'SKTM' })
    expect(data.map((b) => b.jenis.kode)).toEqual(['SKTM'])
  })
  it('cari nama, NIK, atau nomor surat di semua status; NIK tidak pernah di URL', async () => {
    masukSebagai(AKUN_UJI.operator)
    const url: string[] = []
    serverUji.events.on('request:start', ({ request }) => url.push(request.url))
    expect((await cariPermohonan('Siti Rahmah', null)).data).toContainEqual(
      expect.objectContaining({ pemohon: expect.objectContaining({ id: 'pdk_siti_rahmah' }), status: 'diproses' }),
    )
    expect((await cariPermohonan('1405091706848005', null)).data.some((b) => b.jenis.kode === 'SKU' && b.dikembalikan)).toBe(true)
    const nomor = ambilDb().permohonan.find((p) => p.terbit)?.terbit?.nomor ?? '-'
    expect((await cariPermohonan(nomor, null)).data.map((b) => b.nomor)).toContain(nomor)
    const sku = (await cariPermohonan('Siti Rahmah', 'SKU')).data
    expect(sku.every((b) => b.jenis.kode === 'SKU' && b.pemohon.id !== 'pdk_siti_rahmah')).toBe(true)
    expect(url.some((u) => /\d{16}/.test(u))).toBe(false)
  })
  it('detail: permohonan beserta jenis, pemohon, pengaturan surat, dan nama pejabat', async () => {
    masukSebagai(AKUN_UJI.operator)
    const siti = ambilDb().permohonan.find((p) => p.pemohonId === 'pdk_siti_rahmah')
    const d = await ambilPermohonan(siti?.id ?? '-')
    expect(d.jenis.kode).toBe('SKD')
    expect(d.pemohon.nama).toBe('Siti Rahmah')
    expect(d.subjek).toBeNull()
    expect(d.pengaturan).toMatchObject({ kertas: 'A4', huruf: 'Tinos', modeTandaTangan: 'tte' })
    expect(d.pejabat).toEqual({ kades: 'H. Muhammad Nasir', sekdes: 'Hendri Saputra' })
  })
  it('detail surat kelahiran membawa subjek (bayi) dan mutasinya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const skl = ambilDb().permohonan.find((p) => p.jenisId === 'js_ss_skl')
    const d = await ambilPermohonan(skl?.id ?? '-')
    expect(d.subjek?.id).toBe(skl?.subjekId)
    expect(d.mutasi?.jenis).toBe('lahir')
  })
  it('Kepala Dusun hanya melihat permohonan dari dusunnya; Kaur Keuangan tidak berhak (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const { data } = await daftarPermohonan({ status: 'selesai', periode: 365, pageSize: 100 })
    const db = ambilDb()
    expect(data.length).toBeGreaterThan(0)
    for (const b of data) expect(db.permohonan.find((p) => p.id === b.id)?.dusunId).toBe('dsn_ss_2')
    const luar = db.permohonan.find((p) => p.dusunId !== 'dsn_ss_2')
    expect((await galatDari(ambilPermohonan(luar?.id ?? '-'))).kode).toBe('NOT_FOUND')
    expect((await ambilJumlahPermohonan(14, null)).perluTindakan).toBe(0)
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(daftarPermohonan({ status: 'menunggu' }))).kode).toBe('FORBIDDEN')
    expect((await galatDari(daftarJenisSurat())).kode).toBe('FORBIDDEN')
  })
  it('filter rusak → VALIDATION', async () => {
    masukSebagai(AKUN_UJI.operator)
    const janji = panggilApi('GET', '/permohonan', { skema: z.unknown(), query: { status: 'arsip' } })
    expect((await galatDari(janji)).kode).toBe('VALIDATION')
  })
})
