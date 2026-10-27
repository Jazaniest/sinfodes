import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { ambilDetailDesaKonsol } from '@/api/konsol'
import { ubahDb } from '@/mocks/db'
import { AKUN_DESA_BARU_UJI, AKUN_KONSOL_UJI, AKUN_UJI, masukKonsolSebagai, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('GET /beranda: persiapan desa (SPEC §5.3)', () => {
  it('desa Aktif tidak mendapat daftar persiapan', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilBeranda()).persiapan).toBeNull()
  })
  it('Tanjung Lamo: progresnya sama dengan tab Persiapan di Konsol, dan ikut berubah saat dusun pertama dibuat (fokus review 5)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const awal = (await ambilBeranda()).persiapan
    expect(awal).toHaveLength(5)
    expect(awal?.every((l) => !l.selesai)).toBe(true)
    expect(awal).toEqual((await ambilDetailDesaKonsol('desa_tanjung_lamo')).persiapan)
    ubahDb((d) => {
      d.dusun.push({ ...structuredClone(d.dusun[0]), id: 'dsn_tanjung_lamo_1', desaId: 'desa_tanjung_lamo' })
    })
    const sesudah = (await ambilBeranda()).persiapan
    expect(sesudah?.find((l) => l.langkah === 'wilayah')?.selesai).toBe(true)
    expect(sesudah).toEqual((await ambilDetailDesaKonsol('desa_tanjung_lamo')).persiapan)
  })
})
