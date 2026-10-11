// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { catatSuratMasuk, daftarSuratKeluar, daftarSuratMasuk, semuaSuratKeluar } from '@/api/arsip'
import { GalatApi } from '@/api/galat'
import { jalankanAksi } from '@/api/surat'
import type { IsianSuratMasuk } from '@/domain/surat/arsip'
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
const terbitPada = (bulan: string) => ambilDb().permohonan.filter((p) => p.terbit?.pada.startsWith(bulan))

describe('arsip surat keluar (SPEC §7.4 layar 5)', () => {
  it('bawaan bulan berjalan: semua yang terbit bulan ini, urut nomor naik', async () => {
    masukSebagai(AKUN_UJI.operator)
    const { data, meta } = await daftarSuratKeluar({ pageSize: 100 })
    expect(meta.total).toBe(terbitPada('2026-09').length)
    expect(data.map((b) => b.urut)).toEqual(data.map((b) => b.urut).sort((a, b) => a - b))
    expect(data.every((b) => b.tanggal.startsWith('2026-09'))).toBe(true)
  })
  it('filter jenis dan penandatangan a.n.; surat yang dibatalkan tetap tercatat', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await daftarSuratKeluar({ penandatangan: 'sekdes', pageSize: 100 })).data.every((b) => b.penandatangan.peran === 'sekdes')).toBe(true)
    expect((await daftarSuratKeluar({ jenis: 'SKD', pageSize: 100 })).data.every((b) => b.jenis.kode === 'SKD')).toBe(true)
    const [pertama] = (await daftarSuratKeluar({})).data
    masukSebagai(AKUN_UJI.kades)
    await jalankanAksi(pertama.id, 'batalkan', { alasan: 'Keperluan salah tulis.' })
    masukSebagai(AKUN_UJI.operator)
    expect((await daftarSuratKeluar({})).data.find((b) => b.id === pertama.id)?.status).toBe('dibatalkan')
  })
  it('Buku Agenda memakai semua baris sesuai filter, bukan satu halaman', async () => {
    masukSebagai(AKUN_UJI.operator)
    const semua = await semuaSuratKeluar({ bulan: '2026-08' })
    expect(semua.length).toBe(terbitPada('2026-08').length)
    expect(semua.length).toBeGreaterThan(25)
  })
  it('Kepala Dusun hanya surat dusunnya; Kaur Keuangan tidak berhak (fokus review 5)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const dusun = new Map(ambilDb().permohonan.map((p) => [p.id, p.dusunId]))
    const { data } = await daftarSuratKeluar({ bulan: '2026-08', pageSize: 100 })
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((b) => dusun.get(b.id) === 'dsn_ss_2')).toBe(true)
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await galatDari(daftarSuratKeluar({}))).kode).toBe('FORBIDDEN')
  })
})

const ISIAN: IsianSuratMasuk = {
  diterima: '2026-09-24', nomor: '005/312/Kec-TM/IX/2026', tanggalSurat: '2026-09-22', pengirim: 'Camat Teluk Meranti',
  perihal: 'Undangan rapat koordinasi kepala desa', disposisiKepada: 'Sekretaris Desa', disposisiInstruksi: 'Hadiri dan laporkan.',
}

describe('surat masuk (SPEC §7.4 layar 5)', () => {
  it('daftar bulan berjalan, urut nomor agenda', async () => {
    masukSebagai(AKUN_UJI.kades)
    const { data } = await daftarSuratMasuk({ pageSize: 100 })
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((s) => s.diterima.startsWith('2026-09'))).toBe(true)
    expect(data.map((s) => s.noAgenda)).toEqual(data.map((s) => s.noAgenda).sort((a, b) => a - b))
  })
  it('catat: nomor agenda berikutnya; scan disimpan nama dan ukurannya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const sebelum = Math.max(...ambilDb().suratMasuk.filter((s) => s.diterima.startsWith('2026')).map((s) => s.noAgenda))
    const s = await catatSuratMasuk(ISIAN, new File([new Uint8Array(2048)], 'undangan.pdf', { type: 'application/pdf' }))
    expect(s).toMatchObject({
      noAgenda: sebelum + 1, pengirim: 'Camat Teluk Meranti', scan: { berkas: 'undangan.pdf', ukuranKb: 2 },
      disposisi: { kepada: 'Sekretaris Desa', instruksi: 'Hadiri dan laporkan.' }, dicatat: { oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' } },
    })
    expect((await daftarSuratMasuk({ pageSize: 100 })).data.at(-1)?.id).toBe(s.id)
    expect((await catatSuratMasuk({ ...ISIAN, disposisiKepada: null, disposisiInstruksi: '' }, null)).disposisi).toBeNull()
  })
  it('galat per kolom: wajib, tanggal terima di masa depan, scan bukan PDF/gambar', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await galatDari(catatSuratMasuk({ ...ISIAN, nomor: ' ' }, null))).fields).toEqual({ nomor: 'Nomor surat wajib diisi' })
    expect((await galatDari(catatSuratMasuk({ ...ISIAN, diterima: '2026-09-25', tanggalSurat: '2026-09-25' }, null))).fields).toEqual({
      diterima: 'Tanggal terima tidak boleh sesudah hari ini',
    })
    expect((await galatDari(catatSuratMasuk(ISIAN, new File(['x'], 'data.xlsx')))).fields).toEqual({ scan: 'Scan harus berkas PDF, JPG, atau PNG' })
  })
  it('Kades dan Kepala Dusun bisa melihat, tetapi tidak bisa mencatat (fokus review 5)', async () => {
    for (const akun of [AKUN_UJI.kades, AKUN_UJI.kadus]) {
      masukSebagai(akun)
      expect((await daftarSuratMasuk({})).meta.total).toBeGreaterThan(0)
      expect((await galatDari(catatSuratMasuk(ISIAN, null))).kode).toBe('FORBIDDEN')
    }
  })
})
