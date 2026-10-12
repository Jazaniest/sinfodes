import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { ambilApbdes, sinkronSiskeudes } from '@/api/keuangan'
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

describe('keuangan desa (SPEC §8)', () => {
  it('APBDes tahun terbaru untuk Operator, Sekdes, Kades, dan Kaur Keuangan; Kepala Dusun ditolak (fokus review 2)', async () => {
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.sekdes, AKUN_UJI.kades, AKUN_UJI.kaurKeuangan]) {
      masukSebagai(akun)
      expect((await ambilApbdes()).tahun).toBe(2026)
    }
    masukSebagai(AKUN_UJI.kadus)
    expect((await galatDari(ambilApbdes())).kode).toBe('FORBIDDEN')
  })
  it('tahun yang belum ada → NOT_FOUND', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await galatDari(ambilApbdes(2019))).toMatchObject({ kode: 'NOT_FOUND', message: 'APBDes 2019 belum tersedia.' })
  })
  it('sinkron Siskeudes hanya Kaur Keuangan; waktu sinkron diperbarui, angka tidak berubah (fokus review 2)', async () => {
    for (const akun of [AKUN_UJI.operator, AKUN_UJI.kades]) {
      masukSebagai(akun)
      expect((await galatDari(sinkronSiskeudes())).kode).toBe('FORBIDDEN')
    }
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const sebelum = structuredClone(ambilDb().apbdes[0].pos)
    const hasil = await sinkronSiskeudes()
    expect(hasil.sinkronPada.startsWith('2026-09-24T09:00')).toBe(true)
    expect(hasil.pos).toEqual(sebelum)
  })
})
