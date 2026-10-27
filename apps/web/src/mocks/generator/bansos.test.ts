import { describe, expect, it } from 'vitest'
import { penerimaBansosSchema, programBansosSchema } from '@/domain/bansos/schema'
import { bangkitkanDb } from './index'

const ACUAN = new Date('2026-09-24T02:00:00Z')
const db = bangkitkanDb(ACUAN)
const penerimaDi = (kode: string) => db.penerimaBansos.filter((x) => x.programId === `bns_ss_${kode}`)
const statusDasar = (id: string) => db.penduduk.find((p) => p.id === id)?.statusDasar

describe('bantuan sosial demo (SPEC §12.6)', () => {
  it('BLT Dana Desa 38 KPM, PKH 64, Bantuan Pangan 112; satu keluarga sekali per program; empat tahap', () => {
    expect(db.programBansos.map((p) => p.nama)).toEqual(['BLT Dana Desa 2026', 'Program Keluarga Harapan 2026', 'Bantuan Pangan Beras 2026'])
    for (const p of db.programBansos) expect(programBansosSchema.parse(p)).toEqual(p)
    expect(['blt', 'pkh', 'pangan'].map((k) => penerimaDi(k).length)).toEqual([38, 64, 112])
    for (const k of ['blt', 'pkh', 'pangan']) expect(new Set(penerimaDi(k).map((x) => x.keluargaId)).size).toBe(penerimaDi(k).length)
    for (const x of db.penerimaBansos) {
      expect(penerimaBansosSchema.parse(x)).toEqual(x)
      expect(x.penyaluran).toHaveLength(4)
    }
  })
  it('penerima BLT bukan penerima PKH; keluarga Siti Rahmah menerima BLT dan Bantuan Pangan', () => {
    const pkh = new Set(penerimaDi('pkh').map((x) => x.keluargaId))
    expect(penerimaDi('blt').some((x) => pkh.has(x.keluargaId))).toBe(false)
    expect(db.penerimaBansos.filter((x) => x.keluargaId === 'kk_syahrial').map((x) => x.programId).sort()).toEqual([
      'bns_ss_blt', 'bns_ss_pangan',
    ])
  })
  it('BLT tahap III dijadwalkan 30 September; PKH tahap III sudah disalurkan', () => {
    expect(db.programBansos[0].tahap[2]).toEqual({ ke: 3, periode: 'Juli-September', jadwal: '2026-09-30' })
    expect(penerimaDi('blt').filter((x) => !x.perluDitinjau).every((x) => x.penyaluran[2] === 'dijadwalkan')).toBe(true)
    expect(penerimaDi('pkh').every((x) => x.penyaluran[2] === 'tersalur' || x.penyaluran[2] === 'belum-diambil')).toBe(true)
  })
  it('satu penerima BLT meninggal bulan ini: perlu ditinjau, tahap yang belum tersalur ditahan', () => {
    const ditinjau = db.penerimaBansos.filter((x) => x.perluDitinjau)
    expect(ditinjau).toHaveLength(1)
    const [x] = ditinjau
    expect(x.programId).toBe('bns_ss_blt')
    expect(statusDasar(x.atasNama.pendudukId)).toBe('Meninggal')
    expect(x.perluDitinjau?.alasan).toMatch(/^Penerima meninggal dunia pada \d{1,2} September 2026$/)
    expect(x.penyaluran.slice(2)).toEqual(['ditahan', 'ditahan'])
    expect(db.penerimaBansos.filter((y) => !y.perluDitinjau).every((y) => statusDasar(y.atasNama.pendudukId) === 'Hidup')).toBe(true)
  })
})
