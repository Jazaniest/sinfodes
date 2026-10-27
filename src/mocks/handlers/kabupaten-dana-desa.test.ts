import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilDanaDesaKabupaten, ambilPemantauanKabupaten } from '@/api/kabupaten'
import { tertinggal } from '@/domain/kabupaten/dana-desa'
import { median, rasioApbdes } from '@/domain/kabupaten/pemantauan'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

describe('GET /kabupaten/dana-desa (SPEC-V0.2 §8.3 butir 4)', () => {
  it('Admin Pelalawan: 32 desa di 12 kecamatan; Admin Siak: 4 desa', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const d = await ambilDanaDesaKabupaten()
    expect(d.kabupaten).toEqual({ kode: '14.05', nama: 'Pelalawan' })
    expect(d.tahun).toBe(2026)
    expect(d.kecamatan).toHaveLength(12)
    expect(d.kecamatan.flatMap((k) => k.desa)).toHaveLength(32)
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    const siak = await ambilDanaDesaKabupaten()
    expect(siak.kecamatan.flatMap((k) => k.desa.map((x) => x.nama)).sort()).toEqual(['Perawang Jaya', 'Sungai Limau Hilir', 'Teluk Lancang Baru', 'Tualang Permai'])
  })
  it('rasio setiap desa sama dengan kolom Realisasi APBDes di Pemantauan', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const d = await ambilDanaDesaKabupaten()
    const p = await ambilPemantauanKabupaten()
    const pemantauan = new Map(p.kecamatan.flatMap((k) => k.desa).map((x) => [x.id, rasioApbdes(x.apbdes)]))
    for (const x of d.kecamatan.flatMap((k) => k.desa)) expect(rasioApbdes(x.apbdes), x.nama).toBe(pemantauan.get(x.id))
  })
  it('median dari desa ber-APBDes, dan tanda tertinggal mengikuti aturan 15 poin', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const d = await ambilDanaDesaKabupaten()
    const desa = d.kecamatan.flatMap((k) => k.desa)
    const rasio = desa.flatMap((x) => (x.apbdes && x.apbdes.anggaran > 0 ? [x.apbdes.realisasi / x.apbdes.anggaran] : []))
    expect(d.medianRealisasi).toBe(median(rasio))
    for (const x of desa) expect(x.tertinggal, x.nama).toBe(tertinggal(rasioApbdes(x.apbdes), d.medianRealisasi))
    expect(d.total.tertinggal).toBe(desa.filter((x) => x.tertinggal).length)
    // Data demo deterministik: 25 desa bergabung ber-APBDes, median 63,2%, dan 2 desa tertinggal.
    expect([d.total.tertinggal, d.total.desaBerApbdes, Math.round((d.medianRealisasi ?? 0) * 1000)]).toEqual([2, 25, 632])
    expect(d.total.desaBerApbdes).toBe(rasio.length)
    expect(d.total.anggaran).toBe(d.kecamatan.reduce((n, k) => n + k.anggaran, 0))
  })
  it('tanpa token → 401', async () => {
    aturTokenSesi(null, 'kabupaten')
    const r = await fetch('http://localhost:3000/api/v1/kabupaten/dana-desa')
    expect(r.status).toBe(401)
  })
})
