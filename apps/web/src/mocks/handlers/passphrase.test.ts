import { describe, expect, it } from 'vitest'
import { GalatApi } from '@/api/galat'
import { aturPassphrase, bacaStatusPassphrase } from '@/api/surat'
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

describe('tiruan passphrase tanda tangan (Ruling 1 tahap 8F2b)', () => {
  it('status selalu diatur: demo memakai passphrase tetap', async () => {
    masukSebagai(AKUN_UJI.kades)
    expect(await bacaStatusPassphrase()).toEqual({ diatur: true })
  })
  it('PUT sah menjawab diatur tanpa menyimpan apa pun', async () => {
    masukSebagai(AKUN_UJI.kades)
    expect(await aturPassphrase({ kataSandi: 'demo', passphrase: 'sialang2026' })).toEqual({ diatur: true })
  })
  it('PUT dengan isian tidak sah 422 per field', async () => {
    masukSebagai(AKUN_UJI.kades)
    const pendek = await galatDari(aturPassphrase({ kataSandi: 'demo', passphrase: 'pendek' }))
    expect(pendek.status).toBe(422)
    expect(pendek.fields).toEqual({ passphrase: 'Passphrase minimal 8 karakter.' })
    const sama = await galatDari(aturPassphrase({ kataSandi: 'sialang2026', passphrase: 'sialang2026' }))
    expect(sama.fields).toEqual({ passphrase: 'Passphrase tidak boleh sama dengan kata sandi akun.' })
  })
  it('peran tanpa hak tanda tangan 403', async () => {
    masukSebagai(AKUN_UJI.operator)
    const g = await galatDari(bacaStatusPassphrase())
    expect(g.status).toBe(403)
    expect(g.message).toBe('Peran Anda tidak menandatangani surat.')
  })
})
