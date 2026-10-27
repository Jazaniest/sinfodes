import { describe, expect, it } from 'vitest'
import { laporanDataSchema } from '@sinfodes/kontrak/laporan/schema'
import { bangkitkanDb } from '.'

const db = bangkitkanDb(new Date('2026-09-24T02:00:00Z'))

describe('laporan warga di data demo (SPEC §5.3, §12.6)', () => {
  it('dua laporan baru yang lolos skema; belum ada impor', () => {
    expect(db.laporanData.map((l) => [l.id, l.status])).toEqual([
      ['lap_pekerjaan_syahrial', 'baru'],
      ['lap_kelahiran_rosnani', 'baru'],
    ])
    for (const l of db.laporanData) expect(laporanDataSchema.safeParse(l).success).toBe(true)
    expect(db.impor).toEqual([])
  })
  it('perbaikan: pekerjaan Syahrial yang tercatat memang berbeda dengan laporan', () =>
    expect(db.penduduk.find((p) => p.id === 'pdk_syahrial')?.pekerjaan).toBe('Nelayan/Perikanan'))
  it('kelahiran: bayi lahir 3 hari sebelum acuan, dilaporkan sejam sebelum acuan, dan belum tercatat', () => {
    const [, lahir] = db.laporanData
    if (lahir.isi.jenis !== 'kelahiran') throw new Error('bukan laporan kelahiran')
    expect(lahir.isi).toMatchObject({ ibuId: 'pdk_rosnani', tanggalLahir: '2026-09-21' })
    expect(lahir.dibuatPada).toBe('2026-09-24T08:00:00+07:00')
    expect(db.penduduk.some((p) => p.nama === 'Nayla Safitri')).toBe(false)
  })
})
