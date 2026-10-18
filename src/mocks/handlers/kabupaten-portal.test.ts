// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { portalKabupatenSchema, type PortalKabupaten } from '@/domain/kabupaten/portal'
import { muatDb } from '../db'
import { aturModeJaringan } from '../jaringan'
import { serverUji } from '../node'
import { penyimpananMemori } from '../penyimpanan'

/** Portal publik dibaca tanpa token; kabupatennya dari alamat (SPEC-V0.2 §8.2). */
const ambil = (label: string) => fetch(`http://${label}.sinfodes.localhost/api/v1/kabupaten/portal`)
async function portal(label: string): Promise<PortalKabupaten> {
  const r = await ambil(label)
  expect(r.status).toBe(200)
  return portalKabupatenSchema.parse(await r.json())
}
const urutNama = (daftar: readonly string[]) => [...daftar].sort((a, b) => a.localeCompare(b, 'id'))

beforeAll(() => serverUji.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  await muatDb(penyimpananMemori(), new Date('2026-09-24T02:00:00Z'))
})
afterEach(() => {
  serverUji.resetHandlers()
  aturModeJaringan('instan')
})
afterAll(() => serverUji.close())

describe('GET /kabupaten/portal (SPEC-V0.2 §8.2)', () => {
  it('Pelalawan: hanya 25 desa bergabung (Aktif dan Uji coba), per kecamatan, urut nama', async () => {
    const p = await portal('kab-pelalawan')
    if (!p.mitra) throw new Error('Pelalawan seharusnya mitra')
    expect(p.kabupaten).toEqual({ kode: '14.05', nama: 'Pelalawan', label: 'kab-pelalawan' })
    expect(p).toMatchObject({ bergabung: 25, jumlahDesa: 104 })
    const desa = p.kecamatan.flatMap((k) => k.desa)
    expect(desa).toHaveLength(25)
    expect(desa.map((d) => d.nama)).not.toContain('Tanjung Lamo')
    expect(new Set(desa.map((d) => d.status))).toEqual(new Set(['Aktif', 'Uji coba']))
    const nama = p.kecamatan.map((k) => k.kecamatan.nama)
    expect(nama).toEqual(urutNama(nama))
    for (const k of p.kecamatan) expect(k.desa.map((d) => d.nama)).toEqual(urutNama(k.desa.map((d) => d.nama)))
    expect(p.kecamatan.find((k) => k.kecamatan.nama === 'Teluk Meranti')?.desa).toContainEqual({
      label: 'sungaisialang', nama: 'Sungai Sialang', status: 'Aktif',
    })
  })
  it('Siak: 2 desa dari 122', async () => {
    const p = await portal('kab-siak')
    expect(p).toMatchObject({ mitra: true, bergabung: 2, jumlahDesa: 122 })
  })
  it('kabupaten yang belum mitra: hanya identitasnya', async () => {
    expect(await portal('kab-kampar')).toEqual({ mitra: false, kabupaten: { kode: '14.01', nama: 'Kampar', label: 'kab-kampar' } })
  })
  it('alamat kabupaten yang tidak ada di tabel wilayah, dan alamat desa → 404', async () => {
    expect((await ambil('kab-antah-berantah')).status).toBe(404)
    expect((await ambil('sungaisialang')).status).toBe(404)
  })
})
