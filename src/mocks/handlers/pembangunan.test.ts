import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilKegiatan, daftarKegiatan } from '@/api/pembangunan'
import { ambilDb, ubahDb } from '@/mocks/db'
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

describe('pembangunan (SPEC §8)', () => {
  it('daftar terbuka untuk semua peran: berjalan dulu, lalu perencanaan, lalu selesai (fokus review 2)', async () => {
    for (const akun of Object.values(AKUN_UJI)) {
      masukSebagai(akun)
      expect((await daftarKegiatan()).meta.total).toBe(7)
    }
    const { data } = await daftarKegiatan()
    expect(data.map((k) => k.status)).toEqual(['berjalan', 'berjalan', 'berjalan', 'perencanaan', 'selesai', 'selesai', 'selesai'])
    expect(data.find((k) => k.kodeApbdes === '5.2.01')).toMatchObject({ anggaran: 245_000_000, realisasi: 151_900_000 })
  })
  it('anggaran dan realisasi dibaca dari rincian APBDes saat diminta; rincian yang hilang tampil 0 (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    ubahDb((d) => {
      const [apbdes] = d.apbdes
      const semenisasi = apbdes.pos.find((p) => p.kode === '5.2.01')
      if (semenisasi) semenisasi.realisasi = 200_000_000
      apbdes.pos = apbdes.pos.filter((p) => p.kode !== '5.2.07')
    })
    expect(await ambilKegiatan('kgt_ss_01')).toMatchObject({ anggaran: 245_000_000, realisasi: 200_000_000 })
    expect(await ambilKegiatan('kgt_ss_07')).toMatchObject({ anggaran: 0, realisasi: 0 })
  })
  it('detail kegiatan; ID tak dikenal → NOT_FOUND', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const k = await ambilKegiatan('kgt_ss_02')
    expect(k).toMatchObject({ nama: 'Drainase RT 006–007', status: 'selesai', anggaran: 98_000_000 })
    expect(k.dokumentasi.map((d) => d.persen)).toEqual([0, 50, 100])
    expect((await galatDari(ambilKegiatan('kgt_xx'))).kode).toBe('NOT_FOUND')
    expect(ambilDb().kegiatan).toHaveLength(7)
  })
})
