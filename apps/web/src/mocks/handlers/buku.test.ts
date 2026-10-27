import { describe, expect, it } from 'vitest'
import { ambilIsiBuku, daftarBuku } from '@/api/buku'
import { GalatApi } from '@/api/galat'
import { UKURAN_SEMUA_BARIS } from '@/domain/buku/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

async function galatDari(janji: Promise<unknown>): Promise<GalatApi> {
  try {
    await janji
  } catch (e) {
    if (e instanceof GalatApi) return e
    throw e
  }
  throw new Error('Seharusnya gagal')
}

describe('Buku Administrasi (SPEC §8)', () => {
  it('Operator melihat 24 buku; buku manual tanpa jumlah; Buku Induk berisi semua penduduk hidup', async () => {
    masukSebagai(AKUN_UJI.operator)
    const daftar = await daftarBuku()
    expect(daftar).toHaveLength(24)
    expect(daftar.find((b) => b.kode === 'kas-umum')).toMatchObject({ sumber: null, jumlah: null, diperbarui: null })
    expect(daftar.find((b) => b.kode === 'induk-penduduk')).toMatchObject({ sumber: 'Kependudukan', jumlah: 2812 })
  })
  it('Kaur Keuangan hanya buku keuangan; Buku Induk yang berisi NIK ditolak; Kepala Dusun ditolak (fokus review 1)', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    expect((await daftarBuku()).map((b) => b.kode)).toEqual(['apb-desa', 'rab', 'kas-pembantu-kegiatan', 'kas-umum', 'kas-pembantu', 'bank-desa'])
    expect((await galatDari(ambilIsiBuku('induk-penduduk', { page: 1, pageSize: 25 }))).kode).toBe('FORBIDDEN')
    expect((await ambilIsiBuku('apb-desa', { page: 1, pageSize: 25 })).buku.kode).toBe('apb-desa')
    masukSebagai(AKUN_UJI.kadus)
    expect((await galatDari(daftarBuku())).kode).toBe('FORBIDDEN')
  })
  it('isi per halaman; Unduh dan Cetak mengambil semua baris; buku manual dan kode tak dikenal → NOT_FOUND', async () => {
    masukSebagai(AKUN_UJI.kades)
    const h2 = await ambilIsiBuku('induk-penduduk', { page: 2, pageSize: 25 })
    expect(h2.meta).toEqual({ page: 2, pageSize: 25, total: 2812 })
    expect(h2.baris).toHaveLength(25)
    expect(h2.baris[0][0]).toBe('26')
    const semua = await ambilIsiBuku('mutasi-penduduk', { page: 1, pageSize: UKURAN_SEMUA_BARIS })
    expect(semua.baris).toHaveLength(semua.meta.total)
    expect((await galatDari(ambilIsiBuku('kas-umum', { page: 1, pageSize: 25 }))).message).toBe('Buku ini diisi manual dan belum tersedia di Sinfodes.')
    expect((await galatDari(ambilIsiBuku('buku-hantu', { page: 1, pageSize: 25 }))).kode).toBe('NOT_FOUND')
  })
})
