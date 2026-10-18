import { describe, expect, it } from 'vitest'
import { ambilAksesSinfodes, beriAksesSinfodes, cabutAksesSinfodes } from '@/api/pengaturan'
import { labelJejak, ringkasJejak } from '@/domain/pengaturan/akses-sinfodes'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const JAM_MS = 3_600_000

describe('akses bantuan Sinfodes, sisi desa (SPEC-V0.2 §5.3)', () => {
  it('Sekretaris Desa memberi akses 24 jam dengan data pribadi disamarkan', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const hasil = await beriAksesSinfodes({ lamaJam: 24, sembunyikanDataPribadi: true })
    expect(hasil.aktif).toMatchObject({ sembunyikanDataPribadi: true, diberiOleh: 'Hendri Saputra' })
    expect(new Date(hasil.aktif?.sampai ?? '').getTime()).toBe(SEKARANG_UJI.getTime() + 24 * JAM_MS)
    expect(hasil.riwayat[0]).toMatchObject({ id: hasil.aktif?.id, berakhir: null })
  })
  it('Kepala Desa juga bisa memberi akses; Operator tidak', async () => {
    masukSebagai(AKUN_UJI.kades)
    expect((await beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: false })).aktif).not.toBeNull()
    masukSebagai(AKUN_UJI.operator)
    await expect(ambilAksesSinfodes()).rejects.toMatchObject({ kode: 'FORBIDDEN' })
    await expect(beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: true })).rejects.toMatchObject({ kode: 'FORBIDDEN' })
  })
  it('memberi akses baru menutup akses yang masih aktif', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const pertama = await beriAksesSinfodes({ lamaJam: 72, sembunyikanDataPribadi: true })
    const kedua = await beriAksesSinfodes({ lamaJam: 2, sembunyikanDataPribadi: true })
    expect(kedua.aktif?.id).not.toBe(pertama.aktif?.id)
    expect(kedua.riwayat.find((r) => r.id === pertama.aktif?.id)?.berakhir).toBe('dicabut')
  })
  it('cabut: tidak ada akses aktif, dan riwayat teratas berakhir karena dicabut', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await beriAksesSinfodes({ lamaJam: 24, sembunyikanDataPribadi: true })
    const hasil = await cabutAksesSinfodes()
    expect(hasil.aktif).toBeNull()
    expect(hasil.riwayat[0]?.berakhir).toBe('dicabut')
  })
  it('data contoh: riwayat Sungai Sialang memuat satu sesi Dina yang membuka beberapa halaman', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const { aktif, riwayat } = await ambilAksesSinfodes()
    expect(aktif).toBeNull()
    const sesi = riwayat.flatMap((r) => r.sesi)
    expect(sesi).toHaveLength(1)
    expect(sesi[0]?.oleh).toBe('Dina')
    expect(sesi[0]?.halaman.length).toBeGreaterThanOrEqual(3)
    expect(riwayat[0]?.berakhir).toBe('habis')
  })
  it('jejak halaman dibaca per modul', () => {
    expect(labelJejak('/penduduk?page=1')).toBe('Kependudukan')
    expect(labelJejak('/jenis-surat')).toBe('Layanan Surat')
    expect(labelJejak('/buku-administrasi/a1')).toBe('Buku Administrasi')
    expect(labelJejak('/xyz')).toBe('Lainnya')
    const waktu = '2026-09-10T03:00:00+07:00'
    expect(
      ringkasJejak([{ jalur: '/surat', waktu }, { jalur: '/penduduk', waktu }, { jalur: '/keluarga/k1', waktu }, { jalur: '/beranda', waktu }]),
    ).toEqual([
      { label: 'Kependudukan', jumlah: 2 },
      { label: 'Layanan Surat', jumlah: 1 },
      { label: 'Beranda', jumlah: 1 },
    ])
  })
})
