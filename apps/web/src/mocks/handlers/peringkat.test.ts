import { describe, expect, it } from 'vitest'
import { ambilBeranda } from '@/api/beranda'
import { ambilPeringkat } from '@/api/peringkat'
import { KATEGORI_DESA } from '@/domain/indeks/kategori'
import type { Pengaduan } from '@/domain/pengaduan/schema'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { ID_SUNGAI_SIALANG } from '../data/desa-demo'
import { ambilDb, ubahDb } from '../db'
import { papanKabupaten } from '../indeks'
import { desaDiKabupaten } from '../kabupaten-angka'

pakaiApiTiruan({ dbSegarTiapUji: true })

const AGUSTUS = { musim: 'bulanan', kode: '2026-08' } as const
const tambahPengaduanBaru = (id: string) =>
  ubahDb((db) => {
    const contoh = db.pengaduan.find((a) => a.desaId === ID_SUNGAI_SIALANG)!
    const baru: Pengaduan = { ...structuredClone(contoh), id, nomor: `ADU-2026-9${id.slice(-2)}`, masukPada: '2026-09-23T08:00:00+07:00', status: 'baru', tanggapanPertamaPada: null, selesaiPada: null, percakapan: [{ jenis: 'warga', id: `${id}_w`, waktu: '2026-09-23T08:00:00+07:00', isi: 'Mohon dicek.', foto: null }] }
    db.pengaduan.push(baru)
  })

async function pesertaSialang() {
  masukSebagai(AKUN_UJI.sekdes)
  const p = await ambilPeringkat({})
  if (!p.peserta) throw new Error('Sungai Sialang seharusnya peserta')
  return p
}

describe('GET /peringkat (SPEC-V0.2 §9.5)', () => {
  it('Sekdes Sungai Sialang tanpa parameter: Agustus 2026, 9 baris kategori, 6 periode tren', async () => {
    const p = await pesertaSialang()
    expect(p.musim).toBe('bulanan')
    expect(p.periode).toMatchObject({ kode: '2026-08', label: 'Agustus 2026', berjalan: false })
    expect(p.desa).toEqual({ nama: 'Sungai Sialang', kecamatan: 'Teluk Meranti', kabupaten: 'Pelalawan' })
    expect(p.kategori.map((k) => k.kategori)).toEqual([...KATEGORI_DESA])
    expect(p.tren.map((t) => t.periode.kode)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'])
    expect(p.saran.length).toBeLessThanOrEqual(5)
  })
  it('posisi kabupaten: dari = banyak desa memenuhi syarat di papan 7C-1, dan ambang juara 3 = ukuran baris ketiga papan', async () => {
    const p = await pesertaSialang()
    const db = ambilDb()
    for (const k of p.kategori) {
      const papan = papanKabupaten(db, '14.05', { musim: 'bulanan', periode: AGUSTUS, kategori: k.kategori, kecamatan: null }, SEKARANG_UJI)
      if (k.kabupaten === null) {
        expect(k.ukuran === null || !papan.peringkat.some((b) => b.desa.id === ID_SUNGAI_SIALANG)).toBe(true)
        continue
      }
      expect(k.kabupaten.dari, k.kategori).toBe(papan.peringkat.length)
      expect(k.kabupaten.ambangJuara3, k.kategori).toBe(papan.peringkat[2]?.ukuran ?? null)
      expect(k.kabupaten.peringkat).toBe(papan.peringkat.find((b) => b.desa.id === ID_SUNGAI_SIALANG)!.peringkat)
    }
    expect(p.kategori.some((k) => k.kabupaten !== null)).toBe(true)
    expect(p.kategori.some((k) => k.kecamatan !== null)).toBe(true)
  })
  it('respons tidak memuat ID atau nama desa lain', async () => {
    const p = await pesertaSialang()
    const teks = JSON.stringify(p)
    expect(teks).not.toMatch(/desa_/)
    for (const d of desaDiKabupaten(ambilDb(), '14.05').filter((x) => x.id !== ID_SUNGAI_SIALANG)) expect(teks.includes(d.nama), d.nama).toBe(false)
  })
  it('Kaur Keuangan dan Kepala Dusun juga bisa membuka', async () => {
    for (const akun of [AKUN_UJI.kaurKeuangan, AKUN_UJI.kadus, AKUN_UJI.kades, AKUN_UJI.operator]) {
      masukSebagai(akun)
      expect((await ambilPeringkat({})).peserta, akun).toBe(true)
    }
  })
  it('Tanjung Lamo (Persiapan) bukan peserta dan mendapat penjelasan', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect(await ambilPeringkat({})).toEqual({
      peserta: false,
      desa: { nama: 'Tanjung Lamo' },
      alasan: 'Desa Tanjung Lamo belum ikut peringkat. Peringkat diikuti desa berstatus Aktif sepanjang periode.',
    })
  })
  it('periode berjalan ditandai; periode tidak dikenal 422 dengan pesan 7C-1', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const berjalan = await ambilPeringkat({ periode: '2026-09' })
    expect(berjalan.peserta && berjalan.periode.berjalan).toBe(true)
    await expect(ambilPeringkat({ periode: '2023-12' })).rejects.toMatchObject({ status: 422, fields: { periode: 'Periode tidak tersedia.' } })
    await expect(ambilPeringkat({ musim: 'triwulan', periode: '2026-T5' })).rejects.toMatchObject({ status: 422, fields: { periode: 'Pilihan tidak dikenal.' } })
  })
  it('musim tahunan: tren hanya memuat tahun yang tersedia', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const p = await ambilPeringkat({ musim: 'tahunan', periode: '2025' })
    expect(p.peserta && p.tren.map((t) => t.periode.kode)).toEqual(['2024', '2025'])
  })
  it('menambah satu pengaduan Baru menaikkan saran "pengaduan belum dibalas" sebesar 1', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    const angka = (p: Awaited<ReturnType<typeof ambilPeringkat>>) => Number(p.peserta ? (p.saran.find((s) => s.kategori === 'responsif')?.kalimat.match(/^([\d.]+) pengaduan/)?.[1] ?? '0').replace('.', '') : -1)
    const sebelum = angka(await ambilPeringkat({}))
    tambahPengaduanBaru('adu_uji_p1')
    expect(angka(await ambilPeringkat({}))).toBe(sebelum + 1)
  })
})

describe('GET /beranda: kartu peringkat', () => {
  it('Sungai Sialang: periode Agustus 2026 dan tautan saran bila ada', async () => {
    masukSebagai(AKUN_UJI.kades)
    const b = await ambilBeranda()
    expect(b.peringkat?.periode).toEqual({ kode: '2026-08', label: 'Agustus 2026' })
    expect(b.peringkat?.kabupaten).toBe('Pelalawan')
  })
  it('Tanjung Lamo: tanpa kartu', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    expect((await ambilBeranda()).peringkat).toBeNull()
  })
})
