import { describe, expect, it } from 'vitest'
import { masuk } from '@/api/sesi'
import { ambilDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

describe('riwayat masuk panel (SPEC §11: login per minggu)', () => {
  it('masuk yang berhasil dicatat; kata sandi salah tidak', async () => {
    const awal = ambilDb().riwayatMasuk.length
    await expect(masuk('rosmiati@sungaisialang.desa.id', 'salah')).rejects.toMatchObject({ kode: 'VALIDATION' })
    expect(ambilDb().riwayatMasuk).toHaveLength(awal)
    await masuk('rosmiati@sungaisialang.desa.id', 'demo')
    expect(ambilDb().riwayatMasuk).toHaveLength(awal + 1)
    // Waktu uji: Kamis, 24 September 2026 pukul 09.00 WIB (SEKARANG_UJI).
    expect(ambilDb().riwayatMasuk.at(-1)).toEqual({ penggunaId: 'pgn_rosmiati', desaId: 'desa_sungai_sialang', waktu: '2026-09-24T09:00:00+07:00' })
  })
})
