import { describe, expect, it } from 'vitest'
import type { Dusun } from '@/domain/wilayah/schema'
import { DUSUN_DEMO, ID_SUNGAI_SIALANG } from './desa-demo'
import { berkasContoh } from './impor-contoh'

const ISTILAH = { dusun: 'Dusun', rw: 'RW', rt: 'RT' }
const kolom = (b: ReturnType<typeof berkasContoh>, judul: string) => new Set(b.baris.map((r) => r.sel[b.kolom.indexOf(judul)]))

describe('berkas contoh impor (SPEC §6.8, tahap 6C)', () => {
  it('Sungai Sialang: tetap Dusun III Teluk Rengas, RW 005, RT 011–013 dalam berbagai cara tulis', () => {
    const b = berkasContoh(DUSUN_DEMO.filter((d) => d.desaId === ID_SUNGAI_SIALANG), ISTILAH)
    expect(b.baris).toHaveLength(17)
    expect(kolom(b, 'Dusun')).toEqual(new Set(['III', 'Dusun III', '3', 'Teluk Rengas']))
    expect(kolom(b, 'RW')).toEqual(new Set(['005']))
    expect(kolom(b, 'RT')).toEqual(new Set(['12', '012', '011', '013']))
  })
  it('desa baru dengan satu dusun: baris contoh pindah ke dusun, RW, dan RT-nya; cara tulisnya tetap beragam', () => {
    const dusun: Dusun[] = [
      {
        id: 'dsn_tl_1', desaId: 'desa_tanjung_lamo', nomor: 1, nama: 'Tanjung', kepalaDusun: 'Ahmad Yani', posyandu: '',
        rw: [{ nomor: '001', ketua: 'Rasyid', rt: [{ nomor: '001', ketua: 'Udin' }, { nomor: '002', ketua: 'Usman' }] }],
      },
    ]
    const b = berkasContoh(dusun, { ...ISTILAH, dusun: 'Jorong' })
    expect(kolom(b, 'Dusun')).toEqual(new Set(['I', 'Jorong I', '1', 'Tanjung']))
    expect(kolom(b, 'RW')).toEqual(new Set(['001']))
    expect(kolom(b, 'RT')).toEqual(new Set(['2', '002', '001']))
  })
})
