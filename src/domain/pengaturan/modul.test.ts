import { describe, expect, it } from 'vitest'
import { LABEL_MODUL, MODUL_BAWAAN_DESA_BARU, modulAktif, modulDesaSchema } from './modul'

describe('modul desa (SPEC-V0.2 12.3)', () => {
  it('modulDesaSchema menerima { kesehatan: boolean } dan menolak yang lain', () => {
    expect(modulDesaSchema.parse({ kesehatan: true })).toEqual({ kesehatan: true })
    expect(modulDesaSchema.parse({ kesehatan: false })).toEqual({ kesehatan: false })
    expect(modulDesaSchema.safeParse({ kesehatan: 'ya' }).success).toBe(false)
    expect(modulDesaSchema.safeParse({}).success).toBe(false)
  })
  it('modulAktif: nama modul yang menyala, kosong bila semuanya mati', () => {
    expect(modulAktif({ kesehatan: true })).toEqual([LABEL_MODUL.kesehatan])
    expect(modulAktif({ kesehatan: false })).toEqual([])
  })
  it('desa baru mulai dengan Kesehatan mati (keputusan 10)', () => expect(MODUL_BAWAAN_DESA_BARU).toEqual({ kesehatan: false }))
})
