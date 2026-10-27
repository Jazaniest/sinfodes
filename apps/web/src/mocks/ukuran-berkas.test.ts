import { expect, it } from 'vitest'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { ukuranBerkasDesa } from './ukuran-berkas'

it('ukuran berkas desa: ukuranKb bersarang dan gambar data URL milik desa itu saja (SPEC-V0.2 §5.1)', () => {
  const db = {
    desa: [
      { id: 'd1', lambang: `data:image/png;base64,${'A'.repeat(4096)}` },
      { id: 'd2', lambang: null },
    ],
    suratMasuk: [
      { desaId: 'd1', berkas: { ukuranKb: 200 } },
      { desaId: 'd2', berkas: { ukuranKb: 999 } },
    ],
  } as unknown as DbDemo
  expect(ukuranBerkasDesa(db, 'd1')).toBe(203)
  expect(ukuranBerkasDesa(db, 'd2')).toBe(999)
})
