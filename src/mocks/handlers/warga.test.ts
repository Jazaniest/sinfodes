import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { jalankanAksi } from '@/api/surat'
import { ambilBerandaWarga, ambilRiwayatWarga, daftarRiwayatWarga } from '@/api/warga'
import { milikWarga } from '@/domain/warga/permohonan'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, AKUN_WARGA_UJI, masukSebagai, masukSebagaiWarga, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const PASSPHRASE = { passphrase: 'sialang2026' }

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

/** Domisili online Siti Rahmah yang sedang diproses (SPEC §12.9). */
const idDomisiliSiti = () => {
  const p = ambilDb().permohonan.find((x) => x.pemohonId === AKUN_WARGA_UJI.siti && x.status === 'diproses')
  if (!p) throw new Error('Permohonan Domisili Siti tidak ada di seed')
  return p.id
}

describe('Beranda warga (SPEC §10)', () => {
  it('Siti: Domisili sedang diproses, pengumuman berlaku, posyandu untuk balitanya, BLT dan Bantuan Pangan', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const b = await ambilBerandaWarga()
    expect(b.permohonan).toContainEqual(
      expect.objectContaining({
        jenis: { kode: 'SKD', nama: 'Surat Keterangan Domisili' },
        untuk: { id: 'pdk_siti_rahmah', nama: 'Siti Rahmah' },
        posisi: 'sedang diproses petugas desa',
      }),
    )
    expect(b.pengumuman).toHaveLength(3)
    expect(b.pengumuman.map((p) => p.mulai)).toEqual([...b.pengumuman.map((p) => p.mulai)].sort().reverse())
    expect(b.posyandu?.balita).toEqual([{ id: 'pdk_muhammad_alif', nama: 'Muhammad Alif', umurBulan: 34 }])
    expect((b.posyandu?.jadwal ?? '') >= '2026-09-24').toBe(true)
    expect(b.bantuan.map((x) => x.program).sort()).toEqual(['BLT Dana Desa 2026', 'Bantuan Pangan Beras 2026'])
  })
  it('Zulkifli: SKU dikembalikan tampil "sedang diperbaiki"; keluarganya tanpa balita, jadi tanpa posyandu', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    const b = await ambilBerandaWarga()
    expect(b.permohonan).toContainEqual(
      expect.objectContaining({ jenis: { kode: 'SKU', nama: 'Surat Keterangan Usaha' }, posisi: 'sedang diperbaiki petugas desa' }),
    )
    expect(b.posyandu).toBeNull()
  })
  it('surat yang baru ditandatangani tetap tampil di Beranda dengan posisi Selesai', async () => {
    const id = idDomisiliSiti()
    masukSebagai(AKUN_UJI.operator)
    await jalankanAksi(id, 'ajukan-ttd')
    masukSebagai(AKUN_UJI.kades)
    await jalankanAksi(id, 'tandatangani', PASSPHRASE)
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    expect((await ambilBerandaWarga()).permohonan).toContainEqual(
      expect.objectContaining({ id, status: 'selesai', posisi: 'selesai, surat bisa diunduh' }),
    )
  })
})

describe('Riwayat warga (SPEC §10)', () => {
  it('hanya permohonan milik warga, terbaru dulu (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const { data } = await daftarRiwayatWarga()
    expect(data.map((p) => p.id)).toContain(idDomisiliSiti())
    const db = ambilDb()
    expect(data.every((r) => db.permohonan.some((p) => p.id === r.id && milikWarga(p, 'pdk_siti_rahmah')))).toBe(true)
    expect(data.map((p) => p.masukPada)).toEqual([...data.map((p) => p.masukPada)].sort().reverse())
  })
  it('permohonan orang lain dijawab sama dengan yang tidak ada (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const lain = ambilDb().permohonan.find((p) => !milikWarga(p, 'pdk_siti_rahmah'))
    if (!lain) throw new Error('Seed tanpa permohonan orang lain')
    const bukanMilik = await galatDari(ambilRiwayatWarga(lain.id))
    const tidakAda = await galatDari(ambilRiwayatWarga('srt_tidak_ada'))
    expect(bukanMilik).toMatchObject({ kode: 'NOT_FOUND', status: 404 })
    expect(bukanMilik.message).toBe(tidakAda.message)
  })
  it('SKU Zulkifli: catatan pengembalian dan catatan internal tidak terkirim (fokus review 3)', async () => {
    masukSebagaiWarga(AKUN_WARGA_UJI.zulkifli)
    const sku = (await daftarRiwayatWarga()).data.find((p) => p.jenis.kode === 'SKU')
    if (!sku) throw new Error('SKU Zulkifli tidak ada di seed')
    const d = await ambilRiwayatWarga(sku.id)
    expect(d.permohonan.riwayat.find((r) => r.kejadian === 'kembalikan')?.catatan).toBeNull()
    expect(JSON.stringify(d)).not.toContain('Alamat usaha belum lengkap')
    expect(JSON.stringify(d)).not.toContain('Pemohon sudah ditelepon')
    expect(d.jenis.isian.map((i) => i.kunci)).toContain('namaUsaha')
    expect(d.terbit).toBeNull()
  })
  it('Selesai TTE: lembar surat terbit dikirim beserta ukuran kertas dan hurufnya', async () => {
    const id = idDomisiliSiti()
    masukSebagai(AKUN_UJI.operator)
    await jalankanAksi(id, 'ajukan-ttd')
    masukSebagai(AKUN_UJI.kades)
    await jalankanAksi(id, 'tandatangani', PASSPHRASE)
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const d = await ambilRiwayatWarga(id)
    expect(d.permohonan).toMatchObject({ status: 'selesai', posisi: 'selesai, surat bisa diunduh', alasanDitolak: null })
    expect(d.terbit).toMatchObject({ mode: 'tte', nomor: d.permohonan.nomor })
    expect(d.pengaturan).toEqual({ kertas: 'A4', huruf: expect.any(String) })
  })
  it('Ditolak: alasannya dikirim, di detail maupun di riwayat', async () => {
    const id = idDomisiliSiti()
    masukSebagai(AKUN_UJI.operator)
    await jalankanAksi(id, 'tolak', { alasan: 'Pengantar RT belum dilampirkan.' })
    masukSebagaiWarga(AKUN_WARGA_UJI.siti)
    const d = await ambilRiwayatWarga(id)
    expect(d.permohonan).toMatchObject({ status: 'ditolak', posisi: 'ditolak', alasanDitolak: 'Pengantar RT belum dilampirkan.' })
    expect(d.permohonan.riwayat.at(-1)).toMatchObject({ kejadian: 'tolak', catatan: 'Pengantar RT belum dilampirkan.' })
    expect(d.terbit).toBeNull()
  })
})
