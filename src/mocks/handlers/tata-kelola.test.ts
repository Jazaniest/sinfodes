import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilLapisanPeta, daftarAset, daftarLembaga } from '@/api/tata-kelola'
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

describe('aset, lembaga, dan peta (SPEC §8)', () => {
  it('aset: urut kode, saringan kategori; Kaur Keuangan boleh, Kepala Dusun ditolak (fokus review 2)', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const semua = await daftarAset({})
    expect(semua.meta.total).toBe(40)
    const kode = semua.data.map((a) => a.kode)
    expect(kode).toEqual([...kode].sort())
    expect((await daftarAset({ kategori: 'Tanah' })).data.map((a) => a.nama)).toEqual(['Tanah kas desa (kebun sawit)', 'Tanah kantor desa'])
    masukSebagai(AKUN_UJI.kadus)
    expect((await galatDari(daftarAset({}))).kode).toBe('FORBIDDEN')
  })
  it('lembaga terbuka untuk semua peran (fokus review 2)', async () => {
    for (const akun of [AKUN_UJI.kadus, AKUN_UJI.kaurKeuangan, AKUN_UJI.kades]) {
      masukSebagai(akun)
      expect(await daftarLembaga()).toHaveLength(98)
    }
  })
  it('lapisan peta: batas 4 dusun, 13 fasilitas, dan 7 kegiatan dari modul Pembangunan', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const l = await ambilLapisanPeta()
    expect(l.dusun).toHaveLength(4)
    expect(l.fasilitas).toHaveLength(13)
    expect(l.kegiatan.map((k) => [k.id, k.status])).toContainEqual(['kgt_ss_07', 'perencanaan'])
    expect(l.kegiatan).toHaveLength(7)
  })
})
