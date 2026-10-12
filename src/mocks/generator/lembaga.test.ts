import { describe, expect, it } from 'vitest'
import { hitungUmur } from '@/domain/format/tanggal'
import { pengurusSchema } from '@/domain/lembaga/schema'
import { bangkitkanDb } from './index'

const ACUAN = new Date('2026-09-24T02:00:00Z')
const db = bangkitkanDb(ACUAN)
const dari = (lembaga: string) => db.pengurusLembaga.filter((p) => p.lembaga === lembaga)

describe('lembaga desa demo (SPEC §12.6)', () => {
  it('jumlah pengurus per lembaga sesuai SPEC', () => {
    for (const p of db.pengurusLembaga) expect(pengurusSchema.parse(p)).toEqual(p)
    const jumlah = Object.fromEntries(
      ['perangkat', 'bpd', 'lpm', 'pkk', 'karang-taruna', 'rt-rw', 'kader-posyandu', 'linmas', 'bumdes'].map((l) => [l, dari(l).length]),
    )
    expect(jumlah).toEqual({ perangkat: 14, bpd: 7, lpm: 5, pkk: 8, 'karang-taruna': 6, 'rt-rw': 28, 'kader-posyandu': 16, linmas: 10, bumdes: 4 })
  })
  it('perangkat: pejabat akun demo, kepala dusun dari data wilayah, dan operator', () => {
    const jabatan = (j: string) => dari('perangkat').find((p) => p.jabatan === j)?.nama
    expect(jabatan('Kepala Desa')).toBe('H. Muhammad Nasir')
    expect(jabatan('Sekretaris Desa')).toBe('Hendri Saputra')
    expect(jabatan('Kaur Keuangan')).toBe('Nurhayati')
    expect(jabatan('Kepala Dusun II')).toBe('Sukardi')
    expect(jabatan('Operator Desa')).toBe('Rosmiati')
    // Nama perangkat lain mengikuti SPEC §12.1.
    expect(jabatan('Kaur Tata Usaha dan Umum')).toBe('Syafrizal')
    expect(jabatan('Kaur Perencanaan')).toBe('Wahyu Hidayat')
    expect(jabatan('Kasi Pemerintahan')).toBe('Zulkarnain')
    expect(jabatan('Kasi Kesejahteraan')).toBe('Wan Aisyah')
    expect(jabatan('Kasi Pelayanan')).toBe('Dedi Kurniawan')
  })
  it('ketua RT dan RW disalin dari data wilayah', () => {
    const rtRw = dari('rt-rw')
    for (const d of db.dusun.filter((x) => x.desaId === 'desa_sungai_sialang')) {
      for (const rw of d.rw) {
        expect(rtRw).toContainEqual(expect.objectContaining({ jabatan: `Ketua RW ${rw.nomor}`, nama: rw.ketua, dusunId: d.id }))
        for (const rt of rw.rt) expect(rtRw).toContainEqual(expect.objectContaining({ jabatan: `Ketua RT ${rt.nomor} / RW ${rw.nomor}`, nama: rt.ketua }))
      }
    }
  })
  it('pengurus lain adalah penduduk dewasa yang hidup, tidak ada yang merangkap; PKK dan kader perempuan, kader dari dusunnya', () => {
    const penduduk = new Map(db.penduduk.map((p) => [p.id, p]))
    const dariPenduduk = db.pengurusLembaga.filter((p) => p.pendudukId !== null)
    expect(new Set(dariPenduduk.map((p) => p.pendudukId)).size).toBe(dariPenduduk.length)
    for (const p of dariPenduduk) {
      const orang = penduduk.get(p.pendudukId ?? '')
      expect(orang?.statusDasar, p.jabatan).toBe('Hidup')
      expect(orang?.nama).toBe(p.nama)
      expect(hitungUmur(orang?.tanggalLahir ?? '2026-01-01', ACUAN).tahun).toBeGreaterThanOrEqual(17)
    }
    expect([...dari('pkk'), ...dari('kader-posyandu')].every((p) => penduduk.get(p.pendudukId ?? '')?.jenisKelamin === 'P')).toBe(true)
    for (const k of dari('kader-posyandu')) expect(penduduk.get(k.pendudukId ?? '')?.dusunId).toBe(k.dusunId)
    for (const d of ['dsn_ss_1', 'dsn_ss_2', 'dsn_ss_3', 'dsn_ss_4']) expect(dari('kader-posyandu').filter((k) => k.dusunId === d)).toHaveLength(4)
  })
})
