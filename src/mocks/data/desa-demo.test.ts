import { describe, expect, it } from 'vitest'
import { desaSchema, dusunSchema } from '@/domain/wilayah/schema'
import { penggunaSchema } from '@/domain/pengguna/schema'
import { DESA_DEMO, DUSUN_DEMO, ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from './desa-demo'

describe('data desa demo (SPEC §12.1, §12.2, §12.9)', () => {
  it('semua valid terhadap skema', () => {
    DESA_DEMO.forEach((d) => expect(desaSchema.safeParse(d).success).toBe(true))
    DUSUN_DEMO.forEach((d) => expect(dusunSchema.safeParse(d).success).toBe(true))
    PENGGUNA_DEMO.forEach((p) => expect(penggunaSchema.safeParse(p).success).toBe(true))
  })
  it('Sungai Sialang di Teluk Meranti, kode pos 28353', () => {
    const desa = DESA_DEMO.find((d) => d.id === ID_SUNGAI_SIALANG)
    expect(desa).toMatchObject({ slug: 'sungaisialang', kodePos: '28353', kecamatan: { kode: '14.05.09' } })
  })
  it('4 dusun, 8 RW, dan RT 001-020 berurutan tanpa ganda', () => {
    const dusun = DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG)
    expect(dusun).toHaveLength(4)
    expect(dusun.flatMap((d) => d.rw)).toHaveLength(8)
    const rt = dusun.flatMap((d) => d.rw.flatMap((w) => w.rt.map((t) => t.nomor)))
    expect(rt).toEqual(Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, '0')))
  })
  it('akun demo mengarah ke desa yang ada dan emailnya unik', () => {
    PENGGUNA_DEMO.forEach((p) => expect(DESA_DEMO.some((d) => d.id === p.desaId)).toBe(true))
    expect(new Set(PENGGUNA_DEMO.map((p) => p.email)).size).toBe(PENGGUNA_DEMO.length)
    expect(PENGGUNA_DEMO.find((p) => p.peran === 'kadus')?.dusunId).toBe('dsn_ss_2')
  })
})
