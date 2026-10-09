// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { cari } from '@/api/cari'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

describe('GET /beranda (SPEC §5.3)', () => {
  it('operator: tindakan, buku hari ini berurutan jam, keadaan desa', async () => {
    masukSebagai(AKUN_UJI.operator)
    const b = await ambilBeranda()
    expect(b.tindakan).toEqual([
      { jenis: 'kelahiran-dilaporkan', jumlah: 1, laporanId: 'lap_kelahiran_rosnani' },
      { jenis: 'laporan-perbaikan', jumlah: 1, pendudukId: 'pdk_syahrial' },
      { jenis: 'data-belum-lengkap', jumlah: 12 },
    ])
    const waktu = b.bukuHariIni?.map((a) => a.waktu) ?? []
    expect(waktu.length).toBeGreaterThanOrEqual(3)
    expect(waktu.every((w) => w.startsWith('2026-09-24'))).toBe(true)
    expect(waktu).toEqual([...waktu].sort())
    expect(b.keadaan).toMatchObject({
      cakupan: 'desa',
      jiwa: 2812,
      kk: 806,
      laki: 1431,
      perempuan: 1381,
      bulanIni: { lahir: 3, meninggal: 1, datang: 2, pindah: 4 },
    })
  })
  it('Sekretaris Desa melihat bagian yang sama dengan operator', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const b = await ambilBeranda()
    expect(b.tindakan).not.toBeNull()
    expect(b.bukuHariIni).not.toBeNull()
  })
  it('Kepala Desa: tanpa tindakan dan buku hari ini', async () => {
    masukSebagai(AKUN_UJI.kades)
    const b = await ambilBeranda()
    expect(b.tindakan).toBeNull()
    expect(b.bukuHariIni).toBeNull()
    expect(b.keadaan.jiwa).toBe(2812)
  })
  it('Kepala Dusun II: keadaan dusunnya saja', async () => {
    masukSebagai(AKUN_UJI.kadus)
    const b = await ambilBeranda()
    expect(b.tindakan).toBeNull()
    expect(b.keadaan).toMatchObject({ cakupan: 'dusun', dusunId: 'dsn_ss_2' })
    expect(b.keadaan.jiwa).toBeGreaterThan(0)
    expect(b.keadaan.jiwa).toBeLessThan(2812)
  })
  it('tanpa sesi → UNAUTHENTICATED', async () => {
    await expect(ambilBeranda()).rejects.toMatchObject({ kode: 'UNAUTHENTICATED' })
  })
})

describe('POST /cari (SPEC §5.4)', () => {
  it('NIK lengkap → tepat satu penduduk', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect((await cari('1405095203918002')).penduduk.map((p) => p.nama)).toEqual(['Siti Rahmah'])
  })
  it('nama: paling banyak 5 per jenis, semuanya cocok', async () => {
    masukSebagai(AKUN_UJI.operator)
    const h = await cari('siti')
    expect(h.penduduk.length).toBeGreaterThan(0)
    expect(h.penduduk.length).toBeLessThanOrEqual(5)
    expect(h.penduduk.every((p) => p.nama.toLowerCase().includes('siti'))).toBe(true)
  })
  it('nomor KK → keluarga dan seluruh anggotanya', async () => {
    masukSebagai(AKUN_UJI.operator)
    const h = await cari('1405092011238004')
    expect(h.keluarga.map((k) => k.id)).toEqual(['kk_syahrial'])
    expect(h.penduduk).toHaveLength(4)
  })
  it('kata terlalu pendek → kosong', async () => {
    masukSebagai(AKUN_UJI.operator)
    expect(await cari('s')).toEqual({ penduduk: [], keluarga: [] })
  })
  it('Kaur Keuangan tidak berhak melihat penduduk → kosong', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect(await cari('1405095203918002')).toEqual({ penduduk: [], keluarga: [] })
  })
  it('Kepala Dusun II tidak menemukan warga dusun lain (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    expect((await cari('1405095203918002')).penduduk).toEqual([])
  })
})
