import { describe, expect, it } from 'vitest'
import { ambilPemantauan } from '@/api/konsol'
import { barisPemantauanDesaSchema } from '@/domain/konsol/pemantauan'
import { ambilDb } from '@/mocks/db'
import { angkaKonsolDesa } from '@/mocks/konsol-angka'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'

pakaiApiTiruan()

const urutNama = (daftar: readonly string[]) => [...daftar].sort((a, b) => a.localeCompare(b, 'id'))

describe('GET /konsol/pemantauan (SPEC §11 layar 5, §3.4)', () => {
  it('pemantau Pelalawan: kabupatennya sendiri, 12 kecamatan urut nama, total 32 desa', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    const p = await ambilPemantauan(null)
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
    expect((await ambilPemantauan('14.05')).total.jumlahDesa).toBe(32)
  })
  it('pemantau yang meminta kabupaten lain ditolak (fokus review 1)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    await expect(ambilPemantauan('14.01')).rejects.toMatchObject({ kode: 'FORBIDDEN' })
  })
  it('hanya angka agregat: key setiap baris desa persis sesuai skema, tanpa data pribadi (fokus review 1)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    const kunci = Object.keys(barisPemantauanDesaSchema.shape).sort()
    for (const d of (await ambilPemantauan(null)).kecamatan.flatMap((k) => k.desa)) expect(Object.keys(d).sort()).toEqual(kunci)
  })
  it('Sungai Sialang = angka Konsol desa itu, yang dihitung dari data panelnya (fokus review 2)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    const ss = (await ambilPemantauan(null)).kecamatan.flatMap((k) => k.desa).find((d) => d.id === 'desa_sungai_sialang')
    const db = ambilDb()
    const desa = db.desa.find((d) => d.id === 'desa_sungai_sialang')
    if (!desa) throw new Error('Sungai Sialang tidak ada')
    const a = angkaKonsolDesa(db, desa, SEKARANG_UJI)
    expect(ss).toEqual({
      id: 'desa_sungai_sialang', nama: 'Sungai Sialang', status: 'Aktif', suratBulanIni: a.suratBulanIni, waktuLayananJam: a.waktuLayananJam,
      jiwa: a.jiwa, kelengkapan: a.kelengkapan, waktuTanggapanJam: a.waktuTanggapanJam, apbdes: a.apbdes,
    })
  })
  it('desa tanpa data: Tanjung Lamo kosong; angka gabungan Kuala Kampar tetap terhitung (fokus review 3)', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.pemantau)
    const kk = (await ambilPemantauan(null)).kecamatan.find((k) => k.kecamatan.nama === 'Kuala Kampar')
    expect(kk?.desa.find((d) => d.nama === 'Tanjung Lamo')).toMatchObject({
      status: 'Persiapan', suratBulanIni: 0, waktuLayananJam: null, kelengkapan: null, waktuTanggapanJam: null, apbdes: null,
    })
    expect(kk).toMatchObject({ jumlahDesa: 3, adopsi: { aktif: 1, ujiCoba: 0, persiapan: 2, ditangguhkan: 0 } })
    expect(kk?.kelengkapan).not.toBeNaN()
  })
  it('Tim Sinfodes memilih kabupaten; kabupaten kosong atau tidak dikenal ditolak dengan pesan', async () => {
    masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
    const kampar = await ambilPemantauan('14.01')
    expect(kampar.wilayah).toEqual({ kode: '14.01', nama: 'Kampar' })
    expect(kampar.kecamatan.map((k) => [k.kecamatan.nama, k.desa.map((d) => d.nama)])).toEqual([
      ['Kampa', ['Koto Damar']],
      ['Tambang', ['Sungai Pinang Hilir']],
    ])
    await expect(ambilPemantauan(null)).rejects.toMatchObject({ kode: 'VALIDATION', fields: { wilayah: 'Pilih kabupaten.' } })
    await expect(ambilPemantauan('14.99')).rejects.toMatchObject({ kode: 'VALIDATION', fields: { wilayah: 'Kabupaten tidak dikenal.' } })
  })
})
