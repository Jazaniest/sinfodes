import { describe, expect, it } from 'vitest'
import { ambilDb, KUNCI_DB, muatDb, resetDb, simpanSekarang, ubahDb } from './db'
import { penyimpananMemori } from './penyimpanan'
import { VERSI_DATA, type DbDemo } from './tipe-db'

const ACUAN = new Date('2026-09-24T02:00:00Z')

describe('basis data tiruan (SPEC §12.7)', () => {
  it('penyimpanan kosong: dibangkitkan lalu disimpan', async () => {
    const s = penyimpananMemori()
    const db = await muatDb(s, ACUAN)
    expect(db.versiData).toBe(VERSI_DATA)
    expect(db.tanggalAcuan).toBe('2026-09-24T09:00:00+07:00')
    expect(db.penduduk.filter((p) => p.statusDasar === 'Hidup')).toHaveLength(2812)
    expect(s.isi.has(KUNCI_DB)).toBe(true)
  })
  it('data tersimpan dengan versi yang sama dipakai apa adanya', async () => {
    const s = penyimpananMemori()
    const salinan = structuredClone(await muatDb(s, ACUAN))
    salinan.penduduk[0].nama = 'Nama Diubah'
    await s.tulis(KUNCI_DB, salinan)
    expect((await muatDb(s, ACUAN)).penduduk[0].nama).toBe('Nama Diubah')
  })
  it('versi berbeda: dibangkitkan ulang', async () => {
    const s = penyimpananMemori()
    await s.tulis(KUNCI_DB, { versiData: -1, penduduk: [] })
    expect((await muatDb(s, ACUAN)).penduduk.filter((p) => p.statusDasar === 'Hidup')).toHaveLength(2812)
  })
  it('ubahDb lalu simpanSekarang menulis perubahan', async () => {
    const s = penyimpananMemori()
    await muatDb(s, ACUAN)
    ubahDb((db) => {
      db.penduduk[0].catatan = 'catatan uji'
    })
    await simpanSekarang()
    expect((s.isi.get(KUNCI_DB) as DbDemo).penduduk[0].catatan).toBe('catatan uji')
  })
  it('resetDb membangkitkan ulang dengan tanggal acuan baru', async () => {
    await muatDb(penyimpananMemori(), ACUAN)
    ubahDb((db) => {
      db.penduduk[0].catatan = 'akan hilang'
    })
    const baru = await resetDb(new Date('2026-10-01T02:00:00Z'))
    expect(baru.tanggalAcuan).toBe('2026-10-01T09:00:00+07:00')
    expect(baru.penduduk[0].catatan).toBeNull()
    expect(ambilDb()).toBe(baru)
  })
})
