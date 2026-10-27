import { describe, expect, it } from 'vitest'
import { ambilDetailTenggat, daftarTenggatKabupaten, hapusTenggat, tambahTenggat, ubahTenggat } from '@/api/kabupaten'
import { ambilDb } from '@/mocks/db'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const TIDAK_ADA = { kode: 'NOT_FOUND', status: 404 }

describe('tenggat laporan di dasbor kabupaten (SPEC-V0.2 §8.3 butir 4)', () => {
  it('daftar Pelalawan: akan datang urut tanggal naik, sudah lewat urut turun; sasaran = desa Aktif dan Uji coba', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    const d = await daftarTenggatKabupaten()
    expect(d.akanDatang.map((t) => [t.id, t.tanggal])).toEqual([
      ['tgt_pll_dd2', '2026-09-30'],
      ['tgt_pll_akhir', '2027-01-15'],
    ])
    expect(d.sudahLewat.map((t) => [t.id, t.tanggal])).toEqual([['tgt_pll_smt1', '2026-07-30']])
    for (const t of [...d.akanDatang, ...d.sudahLewat]) expect(t.sasaran).toBe(25)
    expect(d.akanDatang[1]).toMatchObject({ nama: 'Laporan realisasi APBDes akhir tahun 2026', dikirim: 0, terlambat: 0 })
    expect(d.sudahLewat[0].dikirim).toBeGreaterThan(d.sudahLewat[0].terlambat)
  })
  it('detail semester I: Sungai Sialang sudah dikirim 26 Juli; urut kecamatan lalu nama', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const d = await ambilDetailTenggat('tgt_pll_smt1')
    expect(d.desa).toHaveLength(25)
    expect(d.desa.find((x) => x.nama === 'Sungai Sialang')).toEqual({
      id: 'desa_sungai_sialang', nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', status: 'dikirim', tanggalKirim: '2026-07-26',
    })
    const urutan = d.desa.map((x) => `${x.kecamatan}|${x.nama}`)
    expect(urutan).toEqual([...urutan].sort((a, b) => a.localeCompare(b, 'id')))
    expect(new Set(d.desa.map((x) => x.status))).toEqual(new Set(['dikirim', 'terlambat', 'lewat']))
    expect(d.tenggat.dikirim).toBe(d.desa.filter((x) => x.status === 'dikirim' || x.status === 'terlambat').length)
  })
  it('tambah: tanggal kemarin ditolak; ubah nama tenggat lampau boleh; ubah ke tanggal lampau ditolak', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    await expect(tambahTenggat({ nama: 'Laporan X', tanggal: '2026-09-23' })).rejects.toMatchObject({
      status: 422, fields: { tanggal: 'Tanggal tenggat tidak boleh sebelum hari ini.' },
    })
    const baru = await tambahTenggat({ nama: '  Laporan konsolidasi BLT-DD  ', tanggal: '2026-09-24' })
    expect(baru).toMatchObject({ nama: 'Laporan konsolidasi BLT-DD', tanggal: '2026-09-24', sasaran: 25, dikirim: 0 })
    expect((await daftarTenggatKabupaten()).akanDatang[0].id).toBe(baru.id)
    expect(await ubahTenggat('tgt_pll_smt1', { nama: 'Laporan semester I', tanggal: '2026-07-30' })).toMatchObject({ nama: 'Laporan semester I' })
    await expect(ubahTenggat('tgt_pll_dd2', { nama: 'Laporan DD', tanggal: '2026-09-01' })).rejects.toMatchObject({ status: 422 })
  })
  it('hapus: tanda kirimnya ikut terhapus dan detailnya 404', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    expect(ambilDb().kirimLaporan.some((k) => k.tenggatId === 'tgt_pll_smt1')).toBe(true)
    await hapusTenggat('tgt_pll_smt1')
    expect(ambilDb().kirimLaporan.some((k) => k.tenggatId === 'tgt_pll_smt1')).toBe(false)
    await expect(ambilDetailTenggat('tgt_pll_smt1')).rejects.toMatchObject(TIDAK_ADA)
  })
  it('batas antarkabupaten dan peran (fokus review 3)', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    const siak = await daftarTenggatKabupaten()
    expect([...siak.akanDatang, ...siak.sudahLewat].map((t) => t.id)).toEqual(['tgt_siak_dd2'])
    expect(siak.akanDatang[0].sasaran).toBe(4)
    await expect(ambilDetailTenggat('tgt_pll_dd2')).rejects.toMatchObject(TIDAK_ADA)
    await expect(ubahTenggat('tgt_pll_dd2', { nama: 'Ganti', tanggal: '2026-10-30' })).rejects.toMatchObject(TIDAK_ADA)
    await expect(hapusTenggat('tgt_pll_dd2')).rejects.toMatchObject(TIDAK_ADA)
    expect(ambilDb().tenggatLaporan.some((t) => t.id === 'tgt_pll_dd2')).toBe(true)
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    await expect(tambahTenggat({ nama: 'Laporan', tanggal: '2026-10-30' })).rejects.toMatchObject({ kode: 'FORBIDDEN', status: 403 })
    await expect(hapusTenggat('tgt_pll_dd2')).rejects.toMatchObject({ status: 403 })
  })
})
