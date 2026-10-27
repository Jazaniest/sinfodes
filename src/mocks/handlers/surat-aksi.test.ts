import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ambilBeranda } from '@/api/beranda'
import { panggilApi } from '@/api/client'
import { GalatApi } from '@/api/galat'
import { jalankanAksi, ubahPermohonan } from '@/api/surat'
import type { Permohonan } from '@/domain/surat/permohonan'
import { ambilDb } from '@/mocks/db'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

const cari = (syarat: (p: Permohonan) => boolean): Permohonan => {
  const p = ambilDb().permohonan.find(syarat)
  if (!p) throw new Error('Permohonan uji tidak ada di data demo')
  return p
}
const paraf = () => cari((p) => p.status === 'perlu-ttd' && p.tahap === 'paraf')
const ttdDomisili = () => cari((p) => p.status === 'perlu-ttd' && p.tahap === 'tanda-tangan' && p.jenisId === 'js_ss_skd')
const domisiliSiti = () => cari((p) => p.pemohonId === 'pdk_siti_rahmah')
const skuZulkifli = () => cari((p) => p.pemohonId === 'pdk_zulkifli' && p.status === 'diproses')
const menunggu = () => cari((p) => p.status === 'menunggu')
const urutTerakhir2026 = () => Math.max(...ambilDb().permohonan.flatMap((p) => (p.terbit?.tahun === 2026 ? [p.terbit.urut] : [])))
const PASSPHRASE = { passphrase: 'sialang2026' }

describe('alur status surat (SPEC §7.1, §7.2)', () => {
  it('SKTM: Sekdes memaraf, Kades menandatangani; nomor diberikan saat tanda tangan', async () => {
    const id = paraf().id
    const urutSebelum = urutTerakhir2026()
    masukSebagai(AKUN_UJI.sekdes)
    expect((await jalankanAksi(id, 'paraf')).permohonan).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan', terbit: null })
    masukSebagai(AKUN_UJI.kades)
    const salah = await galatDari(jalankanAksi(id, 'tandatangani', { passphrase: 'salah' }))
    expect(salah.fields).toEqual({ passphrase: 'Passphrase salah. Periksa kembali, lalu coba lagi.' })
    const { permohonan: p } = await jalankanAksi(id, 'tandatangani', PASSPHRASE)
    expect(p.status).toBe('selesai')
    expect(p.terbit).toMatchObject({
      tahun: 2026, urut: urutSebelum + 1, berlakuSampai: '2026-12-24', mode: 'tte',
      penandatangan: { nama: 'H. Muhammad Nasir', peran: 'kades' },
    })
    expect(p.terbit?.nomor).toBe(`400/${String(urutSebelum + 1).padStart(3, '0')}/SS/IX/2026`)
    expect(p.terbit?.kodeVerifikasi).toMatch(/^SS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
    expect(p.terbit?.lembar.judul).toBe('SURAT KETERANGAN TIDAK MAMPU')
    expect(p.riwayat.slice(-2).map((r) => r.kejadian)).toEqual(['paraf', 'tandatangani'])
    expect(p.riwayat.at(-1)?.catatan).toBe(p.terbit?.nomor)
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilBeranda()).bukuHariIni).toContainEqual(
      expect.objectContaining({ jenis: 'surat-terbit', ringkasan: expect.stringContaining(p.terbit?.nomor ?? '-') }),
    )
  })
  it('dua tanda tangan bersamaan: satu berhasil, satu CONFLICT, satu nomor (fokus review 2)', async () => {
    const id = ttdDomisili().id
    const urutSebelum = urutTerakhir2026()
    masukSebagai(AKUN_UJI.kades)
    const hasil = await Promise.allSettled([jalankanAksi(id, 'tandatangani', PASSPHRASE), jalankanAksi(id, 'tandatangani', PASSPHRASE)])
    expect(hasil.filter((h) => h.status === 'fulfilled')).toHaveLength(1)
    const gagal = hasil.find((h) => h.status === 'rejected')
    expect(gagal?.status === 'rejected' && gagal.reason instanceof GalatApi ? gagal.reason.kode : null).toBe('CONFLICT')
    expect(urutTerakhir2026()).toBe(urutSebelum + 1)
  })
  it('peran tanpa hak → FORBIDDEN (fokus review 1)', async () => {
    const idParaf = paraf().id
    const idMenunggu = menunggu().id
    masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(jalankanAksi(idParaf, 'paraf'))).kode).toBe('FORBIDDEN')
    masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(jalankanAksi(idMenunggu, 'proses'))).kode).toBe('FORBIDDEN')
    masukSebagai(AKUN_UJI.sekdes)
    await jalankanAksi(idParaf, 'paraf')
    // SKTM tidak boleh ditandatangani a.n. Kepala Desa.
    expect((await galatDari(jalankanAksi(idParaf, 'tandatangani', PASSPHRASE))).kode).toBe('FORBIDDEN')
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(jalankanAksi(idMenunggu, 'proses'))).kode).toBe('FORBIDDEN')
    masukSebagai(AKUN_UJI.kadus)
    expect((await galatDari(ubahPermohonan(idMenunggu, { catatanInternal: 'x' }))).kode).toBe('FORBIDDEN')
  })
  it('Sekdes menandatangani a.n. Kepala Desa bila jenis suratnya mengizinkan', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const { permohonan: p } = await jalankanAksi(ttdDomisili().id, 'tandatangani', PASSPHRASE)
    expect(p.terbit?.penandatangan).toEqual({ id: 'pgn_hendri', nama: 'Hendri Saputra', peran: 'sekdes', nip: null })
  })
  it('ajukan tanda tangan: isian diperiksa per field; kunci asing dibuang (fokus review 3)', async () => {
    const id = domisiliSiti().id
    masukSebagai(AKUN_UJI.operator)
    const galat = await galatDari(jalankanAksi(id, 'ajukan-ttd', { isian: { keperluan: '  ' } }))
    expect(galat.kode).toBe('VALIDATION')
    expect(galat.fields).toEqual({ 'isian.keperluan': 'Keperluan wajib diisi' })
    expect(domisiliSiti().status).toBe('diproses')
    const { permohonan: p } = await jalankanAksi(id, 'ajukan-ttd', { isian: { keperluan: 'pendaftaran sekolah anak', asing: 'x' } })
    expect(p).toMatchObject({ status: 'perlu-ttd', tahap: 'tanda-tangan', isian: { keperluan: 'pendaftaran sekolah anak' } })
    expect(p.isian).not.toHaveProperty('asing')
  })
  it('surat yang dikembalikan diajukan ulang: tanda dikembalikan hilang', async () => {
    const z = skuZulkifli()
    masukSebagai(AKUN_UJI.operator)
    const { permohonan: p } = await jalankanAksi(z.id, 'ajukan-ttd', { isian: { ...z.isian, alamatUsaha: 'RT 012/RW 005, Dusun III Teluk Rengas' } })
    expect(p.status).toBe('perlu-ttd')
    expect(p.dikembalikan).toBeNull()
  })
  it('Kembalikan butuh catatan; surat kembali Diproses dengan tanda dikembalikan', async () => {
    const id = ttdDomisili().id
    masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(jalankanAksi(id, 'kembalikan', { catatan: '' }))).fields).toEqual({ catatan: 'Catatan wajib diisi' })
    const { permohonan: p } = await jalankanAksi(id, 'kembalikan', { catatan: 'Keperluan kurang jelas.' })
    expect(p).toMatchObject({
      status: 'diproses', tahap: null, dikembalikan: { catatan: 'Keperluan kurang jelas.', oleh: { nama: 'H. Muhammad Nasir' } },
    })
  })
  it('Proses lalu Tolak dengan alasan; Tolak lagi → CONFLICT', async () => {
    const id = menunggu().id
    masukSebagai(AKUN_UJI.operator)
    expect((await jalankanAksi(id, 'proses')).permohonan.status).toBe('diproses')
    expect((await galatDari(jalankanAksi(id, 'tolak', {}))).kode).toBe('VALIDATION')
    const { permohonan: p } = await jalankanAksi(id, 'tolak', { alasan: 'Foto KTP tidak terbaca.' })
    expect(p).toMatchObject({ status: 'ditolak', penolakan: { catatan: 'Foto KTP tidak terbaca.', oleh: { nama: 'Rosmiati' } } })
    expect(p.ditutupPada).not.toBeNull()
    expect((await galatDari(jalankanAksi(id, 'tolak', { alasan: 'lagi' }))).kode).toBe('CONFLICT')
  })
  it('PATCH: isian hanya saat Diproses; kunci asing dibuang; catatan internal kapan saja', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(ubahPermohonan(menunggu().id, { isian: { keperluan: 'x' } }))).kode).toBe('CONFLICT')
    const { permohonan: p } = await ubahPermohonan(domisiliSiti().id, { isian: { keperluan: 'pembukaan rekening bank', nik: '1' } })
    expect(p.isian).toEqual({ keperluan: 'pembukaan rekening bank' })
    expect(p.riwayat.at(-1)).toMatchObject({ kejadian: 'disimpan', oleh: { nama: 'Rosmiati' } })
    const tanpaUbah = await ubahPermohonan(domisiliSiti().id, { isian: { keperluan: 'pembukaan rekening bank' } })
    expect(tanpaUbah.permohonan.riwayat).toHaveLength(p.riwayat.length)
    const catatan = await ubahPermohonan(menunggu().id, { catatanInternal: '  Sudah ditelepon  ' })
    expect(catatan.permohonan.catatanInternal).toBe('Sudah ditelepon')
    expect((await ubahPermohonan(menunggu().id, { catatanInternal: '' })).permohonan.catatanInternal).toBeNull()
  })
  it('Batalkan: hanya Sekdes dan Kades; nomor tetap tercatat dan tidak dipakai ulang', async () => {
    const selesai = cari((p) => p.status === 'selesai')
    masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(jalankanAksi(selesai.id, 'batalkan', { alasan: 'x' }))).kode).toBe('FORBIDDEN')
    masukSebagai(AKUN_UJI.kades)
    expect((await galatDari(jalankanAksi(selesai.id, 'batalkan', { alasan: ' ' }))).kode).toBe('VALIDATION')
    const { permohonan: p } = await jalankanAksi(selesai.id, 'batalkan', { alasan: 'Salah ketik nama usaha.' })
    expect(p.status).toBe('dibatalkan')
    expect(p.terbit?.nomor).toBe(selesai.terbit?.nomor)
    expect(p.pembatalan?.catatan).toBe('Salah ketik nama usaha.')
    const urutSebelum = urutTerakhir2026()
    const baru = await jalankanAksi(ttdDomisili().id, 'tandatangani', PASSPHRASE)
    expect(baru.permohonan.terbit?.urut).toBe(urutSebelum + 1)
  })
  it('Tandai sudah diambil sekali saja; kirim WhatsApp tercatat dengan nomor tersamar', async () => {
    const id = domisiliSiti().id
    masukSebagai(AKUN_UJI.operator)
    await jalankanAksi(id, 'ajukan-ttd')
    masukSebagai(AKUN_UJI.kades)
    await jalankanAksi(id, 'tandatangani', PASSPHRASE)
    masukSebagai(AKUN_UJI.operator)
    expect((await jalankanAksi(id, 'tandai-diambil')).permohonan.diambil?.oleh.nama).toBe('Rosmiati')
    expect((await galatDari(jalankanAksi(id, 'tandai-diambil'))).kode).toBe('CONFLICT')
    const { permohonan: p } = await jalankanAksi(id, 'kirim-wa')
    expect(p.riwayat.at(-1)).toMatchObject({ kejadian: 'kirim-wa', catatan: 'Ke 0812-••••-2231' })
  })
  it('kirim WhatsApp tanpa nomor telepon pemohon → VALIDATION', async () => {
    const db = ambilDb()
    const p = cari((x) => x.status === 'selesai' && db.penduduk.find((o) => o.id === x.pemohonId)?.telepon === null)
    masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(jalankanAksi(p.id, 'kirim-wa'))).kode).toBe('VALIDATION')
  })
  it('aksi tidak dikenal → NOT_FOUND', async () => {
    masukSebagai(AKUN_UJI.operator)
    const janji = panggilApi('POST', `/permohonan/${menunggu().id}/hapus`, { skema: z.unknown(), body: {} })
    expect((await galatDari(janji)).kode).toBe('NOT_FOUND')
  })
})
