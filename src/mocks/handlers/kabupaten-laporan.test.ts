import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilDanaDesaKabupaten, ambilLaporanBulanan, daftarLaporanBulanan } from '@/api/kabupaten'
import { ambilDb } from '@/mocks/db'
import { suratTerbitBulan } from '@/mocks/kabupaten-angka'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

const status = async (akun: string, bulan: string) => {
  aturTokenSesi(`kab.${akun}`, 'kabupaten')
  return (await fetch(`http://localhost:3000/api/v1/kabupaten/laporan/${bulan}`, { headers: { Authorization: `Bearer kab.${akun}` } })).status
}

describe('laporan bulanan kabupaten (SPEC-V0.2 §8.3 butir 7)', () => {
  it('daftar bulan Pelalawan dan Siak', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    expect((await daftarLaporanBulanan()).bulan).toEqual(['2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03'])
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    expect((await daftarLaporanBulanan()).bulan).toEqual(['2026-08'])
  })
  it('Agustus Pelalawan: jumlah konsisten antarbagian; realisasi sampai akhir bulan tidak melebihi tahun berjalan', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const l = await ambilLaporanBulanan('2026-08')
    expect(l).toMatchObject({ kabupaten: { kode: '14.05', nama: 'Pelalawan', label: 'kab-pelalawan' }, bulan: '2026-08' })
    expect(l.ringkasan.jumlahDesa).toBe(104)
    expect(l.desa).toHaveLength(32)
    expect(l.ringkasan.suratTerbit).toBe(l.desa.reduce((n, d) => n + d.suratTerbit, 0))
    expect(l.ringkasan.bergabung).toBe(l.desa.filter((d) => d.bergabung).length)
    expect(l.kecamatan.reduce((n, k) => n + k.suratTerbit, 0)).toBe(l.ringkasan.suratTerbit)
    const namaKec = l.kecamatan.map((k) => k.kecamatan.nama)
    expect(namaKec).toEqual([...namaKec].sort((a, b) => a.localeCompare(b, 'id')))
    const db = ambilDb()
    const ss = db.desa.find((d) => d.id === 'desa_sungai_sialang')
    if (!ss) throw new Error('Sungai Sialang tidak ada')
    expect(l.desa.find((d) => d.nama === 'Sungai Sialang')?.suratTerbit).toBe(suratTerbitBulan(db, ss, '2026-08'))
    const dana = new Map((await ambilDanaDesaKabupaten()).kecamatan.flatMap((k) => k.desa).map((d) => [d.nama, d.apbdes]))
    for (const d of l.desa) {
      if (d.realisasi === null) continue
      expect(d.realisasi, d.nama).toBeLessThanOrEqual(dana.get(d.nama)?.realisasi ?? 0)
    }
    expect(l.perhatian.tenggat).toEqual([])
    expect(l.perhatian.tertinggal.length).toBe(l.desa.filter((d) => d.tertinggal).length)
    // Air Tawar Jaya ditangguhkan sejak akhir Juni: tidak bergabung pada akhir Agustus, tetapi masih bergabung pada akhir Maret.
    expect(l.desa.find((d) => d.nama === 'Air Tawar Jaya')?.bergabung).toBe(false)
    expect((await ambilLaporanBulanan('2026-03')).desa.find((d) => d.nama === 'Air Tawar Jaya')?.bergabung).toBe(true)
  })
  it('Juli Pelalawan: tenggat semester I yang terlewat, tanpa Sungai Sialang yang sudah mengirim', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const l = await ambilLaporanBulanan('2026-07')
    expect(l.perhatian.tenggat).toHaveLength(1)
    expect(l.perhatian.tenggat[0]).toMatchObject({ nama: 'Laporan realisasi APBDes semester I 2026', tanggal: '2026-07-30' })
    expect(l.perhatian.tenggat[0].desa.length).toBeGreaterThan(0)
    expect(l.perhatian.tenggat[0].desa.some((d) => d.nama === 'Sungai Sialang')).toBe(false)
  })
  it('bulan yang tidak sah (fokus review 5)', async () => {
    for (const bulan of ['2026-09', '2026-10', '2026-02']) expect(await status(AKUN_KABUPATEN_UJI.admin, bulan), bulan).toBe(404)
    expect(await status(AKUN_KABUPATEN_UJI.adminSiak, '2026-07')).toBe(404)
    for (const bulan of ['2026-13', 'agustus']) expect(await status(AKUN_KABUPATEN_UJI.admin, bulan), bulan).toBe(400)
  })
  it('Admin Siak tidak menerima desa Pelalawan', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    const teks = JSON.stringify(await ambilLaporanBulanan('2026-08'))
    for (const d of ambilDb().desa.filter((x) => x.kabupaten.kode === '14.05')) expect(teks.includes(`"${d.nama}"`), d.nama).toBe(false)
  })
})
