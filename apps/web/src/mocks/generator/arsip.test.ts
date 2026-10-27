import { describe, expect, it } from 'vitest'
import { suratMasukSchema } from '@/domain/surat/arsip'
import { ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from '../data/desa-demo'
import { buatAcak } from '../prng'
import { bangkitkanSuratMasuk } from './arsip'

const ACUAN = new Date('2026-09-24T02:00:00Z')
const daftar = bangkitkanSuratMasuk(buatAcak(20260927), {
  desaId: ID_SUNGAI_SIALANG, namaDesa: 'Sungai Sialang', pengguna: PENGGUNA_DEMO, acuan: ACUAN,
})

describe('surat masuk demo (SPEC §7.4 layar 5)', () => {
  it('sekitar satu surat tiap empat hari kerja selama 12 bulan; semuanya sah', () => {
    expect(daftar.length).toBeGreaterThanOrEqual(35)
    expect(daftar.length).toBeLessThanOrEqual(75)
    for (const s of daftar) expect(suratMasukSchema.parse(s)).toEqual(s)
  })
  it('nomor agenda berurutan per tahun; tanggal surat tidak sesudah diterima; hanya hari kerja', () => {
    for (const tahun of ['2025', '2026']) {
      const nomor = daftar.filter((s) => s.diterima.startsWith(tahun)).map((s) => s.noAgenda)
      expect(nomor).toEqual(nomor.map((_, i) => i + 1))
    }
    for (const s of daftar) {
      expect(s.tanggalSurat <= s.diterima).toBe(true)
      expect([0, 6]).not.toContain(new Date(`${s.diterima}T12:00:00+07:00`).getUTCDay())
    }
  })
  it('hari kerja terakhir sebelum acuan selalu ada surat masuk', () => expect(daftar.at(-1)?.diterima).toBe('2026-09-23'))
})
