// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ambilKeluarga, cariKeluarga, daftarKeluarga } from '@/api/keluarga'
import {
  ambilPenduduk, ambilRingkasanPenduduk, ambilRiwayatPenduduk, cariPenduduk, daftarPenduduk,
} from '@/api/penduduk'
import { ambilSesi, kenali, masuk } from '@/api/sesi'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

describe('sesi', () => {
  it('sesi membawa daftar dusun desanya', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilSesi()).dusun.map((d) => d.nomor)).toEqual([1, 2, 3, 4])
  })
  it('masuk mengembalikan token dan sesi lengkap', async () => {
    const hasil = await masuk('hendri@sungaisialang.desa.id', 'demo')
    expect(hasil.token).toBe('demo.pgn_hendri')
    expect(hasil.sesi.dusun).toHaveLength(4)
  })
  it('kenali: email terdaftar menampilkan desa, email asing tidak', async () => {
    expect((await kenali('Rosmiati@SungaiSialang.desa.id')).desa).toEqual({
      nama: 'Sungai Sialang',
      kecamatan: 'Teluk Meranti',
      kabupaten: 'Pelalawan',
    })
    expect((await kenali('tidak.ada@contoh.id')).desa).toBeNull()
  })
})

describe('penduduk', () => {
  it('ringkasan: 2.812 jiwa, 806 KK, diperbarui hari ini', async () => {
    masukSebagai(AKUN_UJI.operator)
    const r = await ambilRingkasanPenduduk()
    expect(r).toMatchObject({ jiwa: 2812, kk: 806 })
    expect(r.diperbaruiPada?.startsWith('2026-09-24')).toBe(true)
  })
  it('cari lewat NIK berspasi; baris membawa nomor KK', async () => {
    masukSebagai(AKUN_UJI.operator)
    const r = await cariPenduduk('140509 520391 8002', {})
    expect(r.data).toHaveLength(1)
    expect(r.data[0]).toMatchObject({ nama: 'Siti Rahmah', nomorKk: '1405092011238004' })
  })
  it('cari lewat potongan nomor KK menemukan seluruh anggota', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await cariPenduduk('2011238004', {})).meta.total).toBe(4)
  })
  it('kata terlalu pendek tidak mencocokkan apa pun', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await cariPenduduk('140', {})).meta.total).toBe(0)
  })
  it('pencarian tetap menghormati filter', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await cariPenduduk('1405095203918002', { dusun: 2 })).meta.total).toBe(0)
  })
  it('preset pendatang tahun ini berisi warga yang datang di 2026', async () => {
    masukSebagai(AKUN_UJI.operator)
    const r = await daftarPenduduk({ preset: 'pendatang-tahun-ini', pageSize: 100 })
    expect(r.meta.total).toBeGreaterThanOrEqual(2)
    expect(r.data.every((p) => p.nik !== null && !p.nik.startsWith('140509'))).toBe(true)
  })
  it('mantan penduduk terbuka lewat filter status dan tidak ikut jiwa', async () => {
    masukSebagai(AKUN_UJI.operator)
    const r = await daftarPenduduk({ status: 'Meninggal', pageSize: 100 })
    expect(r.meta.total).toBeGreaterThanOrEqual(1)
    expect(r.data.every((p) => p.statusDasar === 'Meninggal')).toBe(true)
    expect((await ambilPenduduk(r.data[0].id)).statusDasar).toBe('Meninggal')
  })
  it('riwayat: terbaru dulu, data lama diawali entri pembuatan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const entri = await ambilRiwayatPenduduk('pdk_siti_rahmah')
    expect(entri.at(-1)?.jenis).toBe('dibuat')
    const waktu = entri.map((e) => e.waktu)
    expect(waktu).toEqual([...waktu].sort().reverse())
  })
  it('riwayat bayi termuda diawali mutasi lahir, tanpa entri pembuatan', async () => {
    masukSebagai(AKUN_UJI.operator)
    const [termuda] = (await daftarPenduduk({ urut: 'umur' })).data
    const entri = await ambilRiwayatPenduduk(termuda.id)
    expect(entri.some((e) => e.jenis === 'mutasi' && e.mutasi === 'lahir')).toBe(true)
    expect(entri.some((e) => e.jenis === 'dibuat')).toBe(false)
  })
})

describe('keluarga', () => {
  it('daftar: 806 KK urut nama kepala, dengan jumlah anggota', async () => {
    masukSebagai(AKUN_UJI.operator)
    const r = await daftarKeluarga({})
    expect(r.meta).toEqual({ page: 1, pageSize: 25, total: 806 })
    const nama = r.data.map((k) => k.namaKepala)
    expect(nama).toEqual([...nama].sort((a, b) => a.localeCompare(b, 'id')))
    expect(r.data.every((k) => k.jumlahAnggota === k.anggotaIds.length)).toBe(true)
  })
  it('cari nomor KK lewat POST', async () => {
    masukSebagai(AKUN_UJI.operator)
    const r = await cariKeluarga('1405092011238004', {})
    expect(r.data).toHaveLength(1)
    expect(r.data[0]).toMatchObject({ id: 'kk_syahrial', namaKepala: 'Syahrial', jumlahAnggota: 4 })
  })
  it('detail: anggota urut sesuai KK', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await ambilKeluarga('kk_syahrial')).anggota.map((a) => a.nama)).toEqual([
      'Syahrial', 'Siti Rahmah', 'Nur Aini', 'Muhammad Alif',
    ])
  })
  it('Kaur Keuangan tidak berhak', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    await expect(daftarKeluarga({})).rejects.toMatchObject({ kode: 'FORBIDDEN' })
  })
})

describe('cakupan Kepala Dusun II (fokus review 1)', () => {
  it('pencarian NIK warga dusun lain tidak menemukan apa pun', async () => {
    masukSebagai(AKUN_UJI.kadus)
    expect((await cariPenduduk('1405095203918002', {})).meta.total).toBe(0)
  })
  it('KK dan riwayat warga dusun lain → 404', async () => {
    masukSebagai(AKUN_UJI.kadus)
    await expect(ambilKeluarga('kk_syahrial')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
    await expect(ambilRiwayatPenduduk('pdk_siti_rahmah')).rejects.toMatchObject({ kode: 'NOT_FOUND' })
  })
  it('daftar KK hanya dusunnya', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const r = await daftarKeluarga({ pageSize: 100 })
    expect(r.meta.total).toBeGreaterThan(0)
    expect(r.data.every((k) => k.dusunId === 'dsn_ss_2')).toBe(true)
  })
})
