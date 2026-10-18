import { describe, expect, it } from 'vitest'
import { ambilDetailDesaKonsol } from '@/api/konsol'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

/** Isi data desa yang tidak boleh sampai ke Tim Sinfodes (SPEC-V0.2 §5.1). */
const TERLARANG = [
  'jiwa', 'kelengkapan', 'suratPerBulan', 'suratMingguIni', 'suratBulanIni', 'waktuLayananJam', 'waktuTanggapanJam', 'apbdes',
  'penduduk', 'nik', 'pengaduan',
]

/** Semua kunci objek di dalam nilai JSON, bersarang. */
const semuaKunci = (x: unknown): string[] =>
  Array.isArray(x)
    ? x.flatMap(semuaKunci)
    : x && typeof x === 'object'
      ? Object.entries(x).flatMap(([k, v]) => [k, ...semuaKunci(v)])
      : []

const ambilSebagaiTim = (jalur: string) =>
  fetch(`http://localhost/api/v1${jalur}`, { headers: { Authorization: `Bearer konsol.${AKUN_KONSOL_UJI.tim}` } })

describe('batas data Konsol untuk Tim Sinfodes (SPEC-V0.2 §5.1)', () => {
  it('tidak satu pun respons Konsol memuat isi data desa', async () => {
    const jalur = ['/konsol/sesi', '/konsol/ringkasan', '/konsol/desa?page=1&pageSize=50', '/konsol/desa/desa_sungai_sialang', '/konsol/desa/desa_tanjung_lamo']
    for (const j of jalur) {
      const r = await ambilSebagaiTim(j)
      expect(r.status, j).toBe(200)
      expect(semuaKunci(await r.json()).filter((k) => TERLARANG.includes(k)), j).toEqual([])
    }
  })
  it('Pemantauan wilayah tidak lagi dibuka Tim Sinfodes', async () => {
    expect((await ambilSebagaiTim('/konsol/pemantauan?wilayah=14.05')).status).toBe(403)
  })
  it('Detail desa: alamat lama dan pemakaian penyimpanan', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const d = await ambilDetailDesaKonsol('desa_sungai_sialang')
    expect(d.aliasAlamat).toEqual(['sungai-sialang'])
    expect(d.penyimpananKb).toBeGreaterThan(0)
    const rekam = ambilDb().rekamDesa[0]
    expect((await ambilDetailDesaKonsol(rekam.desaId)).penyimpananKb).toBe(Math.round(rekam.jiwa * 3.2))
  })
})
