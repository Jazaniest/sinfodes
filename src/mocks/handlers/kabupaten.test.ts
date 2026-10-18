import { describe, expect, it } from 'vitest'
import { ambilPemantauanKabupaten, ambilRingkasanKabupaten } from '@/api/kabupaten'
import { barisPemantauanDesaSchema } from '@/domain/kabupaten/pemantauan'
import { ambilDb } from '@/mocks/db'
import { angkaKonsolDesa } from '@/mocks/konsol-angka'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'

pakaiApiTiruan()

const urutNama = (daftar: readonly string[]) => [...daftar].sort((a, b) => a.localeCompare(b, 'id'))

describe('GET /kabupaten/pemantauan (SPEC-V0.2 §8.3 butir 3, dipindah dari Konsol)', () => {
  it('Admin Pelalawan: kabupatennya sendiri, 12 kecamatan urut nama, total 32 desa', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const p = await ambilPemantauanKabupaten()
    expect(p.wilayah).toEqual({ kode: '14.05', nama: 'Pelalawan' })
    expect(p.bulan).toBe('2026-09')
    const nama = p.kecamatan.map((k) => k.kecamatan.nama)
    expect(nama).toHaveLength(12)
    expect(nama).toEqual(urutNama(nama))
    expect(p.total).toMatchObject({ jumlahDesa: 32, adopsi: { aktif: 21, ujiCoba: 4, persiapan: 5, ditangguhkan: 2 } })
    expect(p.total.suratBulanIni).toBe(p.kecamatan.reduce((n, k) => n + k.suratBulanIni, 0))
    expect(p.kecamatan.find((k) => k.kecamatan.nama === 'Teluk Meranti')?.desa.map((d) => d.nama)).toEqual([
      'Kuala Rengas', 'Sungai Sialang', 'Teluk Pauh',
    ])
  })
  it('Peninjau melihat angka yang sama; Admin Siak hanya 2 desa Siak (fokus review 1)', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    expect((await ambilPemantauanKabupaten()).total.jumlahDesa).toBe(32)
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    const siak = await ambilPemantauanKabupaten()
    expect(siak.wilayah).toEqual({ kode: '14.08', nama: 'Siak' })
    expect(siak.kecamatan.flatMap((k) => k.desa.map((d) => d.nama)).sort()).toEqual(['Sungai Limau Hilir', 'Tualang Permai'])
  })
  it('hanya angka agregat: key setiap baris desa persis sesuai skema, tanpa data pribadi', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const kunci = Object.keys(barisPemantauanDesaSchema.shape).sort()
    for (const d of (await ambilPemantauanKabupaten()).kecamatan.flatMap((k) => k.desa)) expect(Object.keys(d).sort()).toEqual(kunci)
  })
  it('Sungai Sialang = angka yang dihitung dari data panelnya', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const ss = (await ambilPemantauanKabupaten()).kecamatan.flatMap((k) => k.desa).find((d) => d.id === 'desa_sungai_sialang')
    const db = ambilDb()
    const desa = db.desa.find((d) => d.id === 'desa_sungai_sialang')
    if (!desa) throw new Error('Sungai Sialang tidak ada')
    const a = angkaKonsolDesa(db, desa, SEKARANG_UJI)
    expect(ss).toEqual({
      id: 'desa_sungai_sialang', nama: 'Sungai Sialang', alamat: 'sungaisialang', status: 'Aktif', suratBulanIni: a.suratBulanIni, waktuLayananJam: a.waktuLayananJam,
      jiwa: a.jiwa, kelengkapan: a.kelengkapan, waktuTanggapanJam: a.waktuTanggapanJam, apbdes: a.apbdes,
    })
  })
  it('desa tanpa data: Tanjung Lamo kosong; angka gabungan Kuala Kampar tetap terhitung', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const kk = (await ambilPemantauanKabupaten()).kecamatan.find((k) => k.kecamatan.nama === 'Kuala Kampar')
    expect(kk?.desa.find((d) => d.nama === 'Tanjung Lamo')).toMatchObject({
      status: 'Persiapan', suratBulanIni: 0, waktuLayananJam: null, kelengkapan: null, waktuTanggapanJam: null, apbdes: null,
    })
    expect(kk).toMatchObject({ jumlahDesa: 3, adopsi: { aktif: 1, ujiCoba: 0, persiapan: 2, ditangguhkan: 0 } })
    expect(kk?.kelengkapan).not.toBeNaN()
  })
  it('tanpa sesi kabupaten → 401', async () => {
    await expect(ambilPemantauanKabupaten()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })
})

describe('GET /kabupaten/ringkasan (SPEC-V0.2 §8.3 butir 1)', () => {
  it('Pelalawan: adopsi dibanding 104 desa, perhatian tanpa tagihan', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    const r = await ambilRingkasanKabupaten()
    expect(r.kabupaten).toEqual({ kode: '14.05', nama: 'Pelalawan' })
    expect(r.adopsi).toEqual({ bergabung: 25, jumlahDesa: 104, aktif: 21, ujiCoba: 4, persiapan: 5, ditangguhkan: 2 })
    expect(r.perhatian.map((p) => p.jenis)).toEqual(['tidak-aktif', 'berhenti-persiapan'])
  })
  it('Siak: 2 desa bergabung dari 122', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    expect((await ambilRingkasanKabupaten()).adopsi).toMatchObject({ bergabung: 2, jumlahDesa: 122 })
  })
})
