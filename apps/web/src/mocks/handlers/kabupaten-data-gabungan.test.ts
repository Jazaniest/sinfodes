import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { daftarProgramBansos } from '@/api/bansos'
import { ambilDataGabungan } from '@/api/kabupaten'
import { barisCsvGabungan, KOLOM_GABUNGAN } from '@/domain/kabupaten/data-gabungan'
import { ambilDb } from '@/mocks/db'
import { komposisiDesa } from '@sinfodes/demo/kabupaten-angka'
import { AKUN_KABUPATEN_UJI, AKUN_UJI, masukKabupatenSebagai, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'

pakaiApiTiruan()

function semuaSel(nilai: unknown, kumpul: unknown[] = []): unknown[] {
  if (Array.isArray(nilai)) for (const x of nilai) semuaSel(x, kumpul)
  else if (nilai !== null && typeof nilai === 'object') {
    for (const [k, v] of Object.entries(nilai)) {
      if ((KOLOM_GABUNGAN as readonly string[]).includes(k)) kumpul.push(v)
      else semuaSel(v, kumpul)
    }
  }
  return kumpul
}

describe('GET /kabupaten/data-gabungan (SPEC-V0.2 §8.3 butir 6)', () => {
  it('Sungai Sialang sama dengan angka panelnya (sebelum disamarkan)', async () => {
    const db = ambilDb()
    const desa = db.desa.find((d) => d.id === 'desa_sungai_sialang')
    if (!desa) throw new Error('Sungai Sialang tidak ada')
    const k = komposisiDesa(db, desa, SEKARANG_UJI)
    masukSebagai(AKUN_UJI.kades)
    const { keadaan } = await ambilBeranda()
    expect(k).toMatchObject({ jiwa: keadaan.jiwa, laki: keadaan.laki, perempuan: keadaan.perempuan, kk: keadaan.kk })
    const program = (await daftarProgramBansos()).data
    const jumlah = (singkat: string) => program.find((p) => p.singkat === singkat)?.jumlahPenerima
    expect(k).toMatchObject({ blt: jumlah('BLT-DD'), pkh: jumlah('PKH'), pangan: jumlah('Bantuan Pangan') })
    expect((k?.u0_4 ?? 0) + (k?.u5_14 ?? 0) + (k?.u15_59 ?? 0) + (k?.u60 ?? 0)).toBe(k?.jiwa)
  })
  it('desa tanpa penduduk: Tanjung Lamo dan desa rekaman Persiapan tanpa impor → baris null', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
    const d = await ambilDataGabungan()
    const desa = d.kecamatan.flatMap((k) => k.desa)
    expect(desa).toHaveLength(32)
    expect(desa.find((x) => x.nama === 'Tanjung Lamo')?.baris).toBeNull()
    expect(desa.find((x) => x.nama === 'Panduk Baru')?.baris).toBeNull()
    expect(desa.find((x) => x.nama === 'Sungai Sialang')?.baris).not.toBeNull()
  })
  it('tidak ada angka 1-4 di respons mana pun, ada sel tersamar, dan CSV sama dengan respons (fokus review 2)', async () => {
    for (const akun of [AKUN_KABUPATEN_UJI.admin, AKUN_KABUPATEN_UJI.adminSiak]) {
      masukKabupatenSebagai(akun)
      const d = await ambilDataGabungan()
      const sel = semuaSel(d)
      expect(sel.length).toBeGreaterThan(0)
      expect(sel.some((s) => typeof s === 'number' && s >= 1 && s <= 4), akun).toBe(false)
      const csv = barisCsvGabungan(d).slice(1).flatMap((r) => r.slice(3))
      expect(csv.some((s) => typeof s === 'number' && s >= 1 && s <= 4)).toBe(false)
      if (akun === AKUN_KABUPATEN_UJI.admin) {
        expect(sel).toContain('<5')
        expect(sel).toContain('*')
      }
    }
  })
  it('Admin Siak hanya menerima 4 desa Siak', async () => {
    masukKabupatenSebagai(AKUN_KABUPATEN_UJI.adminSiak)
    const d = await ambilDataGabungan()
    expect(d.kecamatan.flatMap((k) => k.desa.map((x) => x.nama)).sort()).toEqual(['Perawang Jaya', 'Sungai Limau Hilir', 'Teluk Lancang Baru', 'Tualang Permai'])
  })
})
