import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilPapanIndeks } from '@/api/kabupaten'
import { AKUN_KABUPATEN_UJI, AKUN_UJI, masukKabupatenSebagai, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

async function galatPapan(query: string): Promise<{ status: number; fields: Record<string, string> }> {
  aturTokenSesi(`kab.${AKUN_KABUPATEN_UJI.admin}`, 'kabupaten')
  const r = await fetch(`http://localhost:3000/api/v1/kabupaten/indeks?${query}`, { headers: { Authorization: `Bearer kab.${AKUN_KABUPATEN_UJI.admin}` } })
  const isi = (await r.json()) as { error?: { fields?: Record<string, string> } }
  return { status: r.status, fields: isi.error?.fields ?? {} }
}

describe('GET /kabupaten/indeks (SPEC-V0.2 §9.4, §9.5)', () => {
  it('tanpa parameter: bulanan, bulan terakhir tutup, Juara Umum, semua kecamatan', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const p = await ambilPapanIndeks({})
    expect(p).toMatchObject({ musim: 'bulanan', kategori: 'umum', kecamatan: null, podiumKecamatan: null })
    expect(p.periode).toMatchObject({ kode: '2026-08', label: 'Agustus 2026', berjalan: false, tutupPada: '2026-09-01T00:00:00+07:00' })
    expect(p.kabupaten).toEqual({ kode: '14.05', nama: 'Pelalawan' })
    expect(p.daftarKecamatan).toHaveLength(12)
    expect(p.peringkat.length).toBeGreaterThan(10)
  })
  it('periode berjalan ditandai, dan daftar periode bulanan berisi 33 periode dari 2026-09 sampai 2024-01', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const p = await ambilPapanIndeks({ periode: '2026-09' })
    expect(p.periode).toMatchObject({ kode: '2026-09', berjalan: true, tutupPada: '2026-10-01T00:00:00+07:00' })
    expect(p.daftarPeriode).toHaveLength(33)
    expect(p.daftarPeriode[0]).toMatchObject({ kode: '2026-09', berjalan: true })
    expect(p.daftarPeriode.at(-1)?.kode).toBe('2024-01')
  })
  it('galat 422 per field', async () => {
    expect(await galatPapan('musim=mingguan')).toEqual({ status: 422, fields: { musim: 'Pilihan tidak dikenal.' } })
    expect(await galatPapan('musim=triwulan&periode=2026-T5')).toEqual({ status: 422, fields: { periode: 'Pilihan tidak dikenal.' } })
    expect(await galatPapan('kategori=lain')).toEqual({ status: 422, fields: { kategori: 'Pilihan tidak dikenal.' } })
    expect(await galatPapan('periode=2023-12')).toEqual({ status: 422, fields: { periode: 'Periode tidak tersedia.' } })
    expect(await galatPapan('periode=2026-10')).toEqual({ status: 422, fields: { periode: 'Periode tidak tersedia.' } })
  })
  it('Peninjau bisa membuka papan; sesi desa ditolak', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
    expect((await ambilPapanIndeks({})).kabupaten.kode).toBe('14.05')
    aturTokenSesi(null, 'kabupaten')
    masukSebagai(AKUN_UJI.operator)
    await expect(ambilPapanIndeks({})).rejects.toMatchObject({ status: 401 })
  })
  it('kategori berskor mengisi skor; Juara Umum mengisi tingkatan; Paling Meningkat tanpa skor', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const layanan = await ambilPapanIndeks({ kategori: 'layanan' })
    expect(layanan.peringkat.every((b) => b.skor !== null && b.tingkatan === null)).toBe(true)
    const umum = await ambilPapanIndeks({ kategori: 'umum' })
    expect(umum.peringkat.every((b) => b.skor === null && b.tingkatan !== null)).toBe(true)
    const meningkat = await ambilPapanIndeks({ kategori: 'meningkat' })
    expect(meningkat.peringkat.every((b) => b.skor === null)).toBe(true)
  })
  it('musim tahunan 2024 tidak error; peringkatnya boleh kosong dan semua desa tetap terhitung', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const p = await ambilPapanIndeks({ musim: 'tahunan', periode: '2024' })
    expect(p.periode.kode).toBe('2024')
    expect(p.peringkat.length + p.belumMemenuhi.length + p.tidakIkut).toBe(32)
  })
  it('se-provinsi: posisi sendiri dan podium kabupaten', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const p = await ambilPapanIndeks({})
    expect(p.provinsi.provinsi.nama).toBe('Riau')
    expect(p.provinsi.kategori.map((k) => k.kategori)).toEqual(['umum', 'merata'])
    const umum = p.provinsi.kategori[0]
    expect(umum.podium.length).toBeGreaterThanOrEqual(3)
    expect(umum.posisi === null ? umum.alasan : umum.posisi.dari).not.toBeNull()
  })
})
