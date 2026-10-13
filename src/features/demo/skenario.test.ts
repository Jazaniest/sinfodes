import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from '@/mocks/data/desa-demo'
import { PENGGUNA_KONSOL_DEMO } from '@/mocks/data/desa-konsol'
import { AKUN_WARGA_DEMO } from '@/mocks/data/warga-demo'
import { routeTree } from '@/routeTree.gen'
import { SKENARIO_DEMO, type MasukSkenario } from './skenario'

const semuaTombol = SKENARIO_DEMO.flatMap((s) => s.langkah.flatMap((l) => l.tombol))

function akunAda(m: MasukSkenario): boolean {
  switch (m.bagian) {
    case 'admin':
      return PENGGUNA_DEMO.some((p) => p.desaId === ID_SUNGAI_SIALANG && p.peran === m.peran && p.aktif)
    case 'warga':
      return AKUN_WARGA_DEMO.some((a) => a.pendudukId === m.pendudukId)
    case 'konsol':
      return PENGGUNA_KONSOL_DEMO.some((p) => p.peran === m.peran)
    case 'publik':
      return true
  }
}

describe('skenario terpandu (SPEC §3.6, §13.5)', () => {
  it('tiga skenario sesuai kriteria selesai tahap 1: SKTM 5 langkah, kelahiran 3 langkah, pemantauan', () => {
    expect(SKENARIO_DEMO.map((s) => [s.judul, s.langkah.length])).toEqual([
      ['SKTM dari HP sampai verifikasi QR', 5],
      ['Mencatat kelahiran', 3],
      ['Pemantauan kabupaten', 2],
    ])
    expect(SKENARIO_DEMO.every((s) => s.langkah.every((l) => l.tombol.length > 0))).toBe(true)
  })
  it('setiap tombol menuju rute yang ada (fokus review 5)', () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } })
    for (const t of semuaTombol) {
      const [, , ditemukan] = router.getMatchedRoutes(new URL(t.ke, 'http://demo.test').pathname)
      expect(ditemukan, t.ke).toBeDefined()
    }
  })
  it('setiap tombol memakai akun yang ada di data demo (fokus review 5)', () => {
    for (const t of semuaTombol) expect(akunAda(t.masuk), `${t.label} → ${JSON.stringify(t.masuk)}`).toBe(true)
  })
})
