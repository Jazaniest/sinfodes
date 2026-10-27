import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilAlamatSchema } from '@sinfodes/kontrak/alamat/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, type DbUji } from '../../../test/basisdata'
import { ambil, rakitApp } from '../../../test/rakit-app'

let uji: DbUji
beforeAll(async () => {
  uji = await buatDbUji()
})
afterAll(async () => {
  await uji?.tutup()
})

const baca = async (url: string) => {
  const { app } = rakitApp({ klien: uji.klien })
  return ambil(app, `${url}/api/v1/alamat`)
}

describe('GET /api/v1/alamat (SPEC-V0.2 §4.5)', () => {
  it('alamat desa memberi identitas ringkas dan tampilan warga', async () => {
    const r = await baca('http://sungaisialang.sinfodes.localhost')
    expect(r.status).toBe(200)
    const isi = hasilAlamatSchema.parse(await r.json())
    expect(isi).toMatchObject({ jenis: 'desa', desa: { label: 'sungaisialang', nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan', status: 'Aktif' } })
    if (isi.jenis !== 'desa') throw new Error('bentuk tak terduga')
    expect(isi.desa.tampilanWarga).not.toBeNull()
    expect(isi.desa.tampilanWarga?.warnaUtama).toMatch(/^#/)
  })

  it('desa berstatus Persiapan tidak punya tampilan warga', async () => {
    const isi = hasilAlamatSchema.parse(await (await baca('http://tanjunglamo.sinfodes.localhost')).json())
    expect(isi).toMatchObject({ jenis: 'desa', desa: { label: 'tanjunglamo', status: 'Persiapan', tampilanWarga: null } })
  })

  it('alamat lama (alias) memberi slug baru', async () => {
    const isi = hasilAlamatSchema.parse(await (await baca('http://sungai-sialang.sinfodes.localhost')).json())
    expect(isi).toEqual({ jenis: 'alias', labelBaru: 'sungaisialang' })
  })

  it('alamat induk dan Konsol dikenali tanpa menyentuh data desa', async () => {
    expect(hasilAlamatSchema.parse(await (await baca('http://sinfodes.localhost')).json())).toEqual({ jenis: 'induk' })
    expect(hasilAlamatSchema.parse(await (await baca('http://konsol.sinfodes.localhost')).json())).toEqual({ jenis: 'konsol' })
  })

  it('desa yang tidak ada dan alamat selain desa/induk/Konsol menjawab NOT_FOUND', async () => {
    // Perbedaan sengaja: alamat kabupaten baru dilayani di 8D; sampai saat itu menjawab NOT_FOUND.
    for (const url of ['http://tidak-ada.sinfodes.localhost', 'http://kab-pelalawan.sinfodes.localhost', 'http://contoh.example.com']) {
      const r = await baca(url)
      expect(r.status, url).toBe(404)
      expect(galatSchema.parse(await r.json()).error.code).toBe('NOT_FOUND')
    }
  })
})
