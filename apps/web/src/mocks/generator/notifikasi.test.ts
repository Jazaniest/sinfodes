import { describe, expect, it } from 'vitest'
import { notifikasiSchema } from '@/domain/notifikasi/schema'
import { bangkitkanDb } from './index'

const ACUAN = new Date('2026-09-24T02:00:00Z')
const db = bangkitkanDb(ACUAN)
const milik = (id: string) => db.notifikasi.filter((n) => n.penggunaId === id)

describe('notifikasi demo (SPEC §5.2, §5.5)', () => {
  it('Operator: 3 terbaru belum dibaca, sisanya sudah', () => {
    const urut = [...milik('pgn_rosmiati')].sort((a, b) => b.waktu.localeCompare(a.waktu))
    expect(urut.length).toBeGreaterThan(3)
    expect(urut.map((n) => n.dibaca)).toEqual(urut.map((_, i) => i >= 3))
  })
  it('Kades dan Kaur Keuangan hanya menerima pengumuman (di luar siaran kabupaten, diuji di generator/siaran.test.ts)', () => {
    for (const id of ['pgn_nasir', 'pgn_nurhayati']) {
      expect(milik(id).filter((n) => n.jenis !== 'siaran-kabupaten').map((n) => n.jenis)).toEqual(['pengumuman'])
    }
  })
  it('Kepala Dusun II: pengumuman dan pengaduan baru dari dusunnya saja (3A)', () => {
    const sukardi = milik('pgn_sukardi')
    expect(sukardi.map((n) => n.jenis).sort()).toEqual(['pengaduan-baru', 'pengumuman'])
    const rujukan = sukardi.find((n) => n.jenis === 'pengaduan-baru')?.rujukan
    expect(db.pengaduan.find((a) => a.id === rujukan?.id)?.dusunId).toBe('dsn_ss_2')
    expect(milik('pgn_rosmiati').filter((n) => n.jenis === 'pengaduan-baru')).toHaveLength(2)
  })
  it('penanda tangan a.n. tidak menerima notifikasi tanda tangannya sendiri (fokus review 4)', () => {
    const olehSekdes = new Set(db.permohonan.filter((p) => p.terbit?.penandatangan.id === 'pgn_hendri').map((p) => p.id))
    const untukSekdes = milik('pgn_hendri').filter((n) => n.jenis === 'surat-ditandatangani')
    expect(untukSekdes.some((n) => olehSekdes.has(n.rujukan?.id ?? ''))).toBe(false)
    expect(milik('pgn_rosmiati').some((n) => n.jenis === 'surat-ditandatangani' && olehSekdes.has(n.rujukan?.id ?? ''))).toBe(true)
  })
  it('laporan warga dan SKU yang dikembalikan sampai ke Operator; semuanya sah dan tidak di masa depan', () => {
    const operator = milik('pgn_rosmiati')
    expect(operator).toContainEqual(expect.objectContaining({ jenis: 'laporan-data', rujukan: { jenis: 'laporan-kelahiran', id: 'lap_kelahiran_rosnani' } }))
    expect(operator).toContainEqual(expect.objectContaining({ jenis: 'surat-dikembalikan', judul: 'SKU · Zulkifli dikembalikan untuk diperbaiki' }))
    for (const n of db.notifikasi) {
      expect(notifikasiSchema.parse(n)).toEqual(n)
      expect(new Date(n.waktu).getTime()).toBeLessThanOrEqual(ACUAN.getTime())
    }
  })
})
