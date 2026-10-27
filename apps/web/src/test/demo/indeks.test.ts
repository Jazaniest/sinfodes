import { describe, expect, it } from 'vitest'
import { hitungHasilDesa, type HasilDesa } from '@/domain/indeks/hitung'
import { bulanPeriode, type Periode } from '@/domain/indeks/periode'
import { SEKARANG_UJI } from '@/test/api-tiruan'
import { DESA_ASLI_INDRAGIRI_HILIR } from '@sinfodes/demo/data/desa-asli-indragiri-hilir'
import { DESA_ASLI_KAMPAR } from '@sinfodes/demo/data/desa-asli-kampar'
import { DESA_ASLI_PELALAWAN } from '@sinfodes/demo/data/desa-asli-pelalawan'
import { DESA_ASLI_SIAK } from '@sinfodes/demo/data/desa-asli-siak'
import { DESA_DEMO } from '@sinfodes/demo/data/desa-demo'
import { DESA_KONSOL_TAMBAHAN } from '@sinfodes/demo/data/desa-konsol'
import { buatAcak } from '@sinfodes/demo/prng'
import { bangkitkanDb, SEED_DEMO } from '@sinfodes/demo/generator/index'
import { bangkitkanKonsol } from '@sinfodes/demo/generator/konsol'

const db = bangkitkanDb(SEKARANG_UJI)
const AGUSTUS: Periode = { musim: 'bulanan', kode: '2026-08' }
const T2: Periode = { musim: 'triwulan', kode: '2026-T2' }

function hasilRekam(desaId: string, p: Periode): HasilDesa {
  const baris = bulanPeriode(p).map((bulan) => db.ukuranIndeks.find((u) => u.desaId === desaId && u.bulan === bulan)!)
  return hitungHasilDesa(baris, null, p)
}
const desaRekam = db.rekamDesa.map((r) => db.desa.find((d) => d.id === r.desaId)!)

describe('desa tambahan peringkat (SPEC-V0.2 §9.7)', () => {
  it('47 desa; tujuh desa tambahan di akhir sesuai tabel', () => {
    expect(db.desa).toHaveLength(47)
    const tambahan = db.desa.slice(-7)
    expect(tambahan.map((d) => [d.nama, d.kecamatan.kode, d.status])).toEqual(
      DESA_KONSOL_TAMBAHAN.map((r) => [r.nama, `${r.kecamatan.slice(0, 2)}.${r.kecamatan.slice(2, 4)}.${r.kecamatan.slice(4)}`, 'Aktif']),
    )
    expect(new Set(db.desa.map((d) => d.nama.toLowerCase())).size).toBe(47)
    expect(new Set(db.desa.map((d) => d.slug)).size).toBe(47)
    expect(new Set(db.desa.map((d) => d.kodeDesa)).size).toBe(47)
    expect(db.rekamDesa).toHaveLength(45)
    expect(db.langganan).toHaveLength(47)
  })
  it('nama fiktif tidak sama dengan desa asli Pelalawan, Siak, Kampar, dan Indragiri Hilir', () => {
    const asli = new Set([...DESA_ASLI_PELALAWAN, ...DESA_ASLI_SIAK, ...DESA_ASLI_KAMPAR, ...DESA_ASLI_INDRAGIRI_HILIR].map((n) => n.toLowerCase()))
    for (const d of db.desa) expect(asli.has(d.nama.toLowerCase()), d.nama).toBe(false)
  })
  it('angka 38 desa lama tidak bergeser', () => {
    const o = (tambahan: boolean) =>
      bangkitkanKonsol(buatAcak(SEED_DEMO + 9), {
        acuan: SEKARANG_UJI,
        desaPanel: DESA_DEMO,
        acakPemantauan: buatAcak(SEED_DEMO + 11),
        acakKontak: buatAcak(SEED_DEMO + 12),
        acakBelanja: buatAcak(SEED_DEMO + 13),
        acakKomposisi: buatAcak(SEED_DEMO + 14),
        acakTambahan: tambahan ? buatAcak(SEED_DEMO + 17) : undefined,
      })
    const lama = o(false)
    const baru = o(true)
    expect(baru.rekam.slice(0, 38)).toEqual(lama.rekam)
    expect(baru.langganan.slice(0, 40)).toEqual(lama.langganan)
    expect(baru.desa.slice(0, 38)).toEqual(lama.desa)
  })
})

describe('riwayat jejak desa rekaman', () => {
  it('33 baris per desa rekaman, 2024-01 sampai 2026-09, berurutan tanpa ganda', () => {
    const bulan = db.ukuranIndeks.filter((u) => u.desaId === db.rekamDesa[0].desaId).map((u) => u.bulan)
    expect(bulan).toHaveLength(33)
    expect(bulan[0]).toBe('2024-01')
    expect(bulan.at(-1)).toBe('2026-09')
    expect(new Set(bulan).size).toBe(33)
    expect([...bulan].sort()).toEqual(bulan)
    expect(db.ukuranIndeks).toHaveLength(45 * 33 + 2 * 32)
    expect(new Set(db.ukuranIndeks.map((u) => `${u.desaId}|${u.bulan}`)).size).toBe(45 * 33 + 2 * 32)
  })
  it('sesuai rekaman: surat 12 bulan terakhir, serapan tahun berjalan, dan kelengkapan bulan acuan', () => {
    for (const r of db.rekamDesa) {
      for (const s of r.suratPerBulan) {
        const baris = db.ukuranIndeks.find((u) => u.desaId === r.desaId && u.bulan === s.bulan)!
        if (baris.aktif && s.jumlah > 0) expect(baris.layanan.selesai, `${r.desaId} ${s.bulan}`).toBe(s.jumlah)
      }
      const acuan = db.ukuranIndeks.find((u) => u.desaId === r.desaId && u.bulan === '2026-09')!
      if (acuan.data.diimpor && r.kelengkapan !== null && acuan.data.kelengkapan !== null) expect(acuan.data.kelengkapan).toBe(r.kelengkapan)
      if (r.apbdes && r.belanjaBulanan) {
        const agustus = db.ukuranIndeks.find((u) => u.desaId === r.desaId && u.bulan === '2026-08')!
        if (agustus.serapan) {
          expect(agustus.serapan.pagu).toBe(r.apbdes.anggaran)
          expect(agustus.serapan.realisasi).toBe(r.belanjaBulanan.filter((b) => b.bulan <= '2026-08').reduce((n, b) => n + b.belanja, 0))
        }
      }
    }
  })
  it('desa Persiapan dan Uji coba tidak pernah aktif; desa Ditangguhkan berhenti aktif sesudah masa langganan', () => {
    for (const d of desaRekam) {
      const baris = db.ukuranIndeks.filter((u) => u.desaId === d.id)
      if (d.status === 'Persiapan' || d.status === 'Uji coba') expect(baris.every((u) => !u.aktif), d.nama).toBe(true)
      if (d.status === 'Ditangguhkan') {
        const sampai = db.langganan.find((l) => l.desaId === d.id)!.sampai!
        expect(baris.filter((u) => u.aktif && `${u.bulan}-01` > sampai)).toEqual([])
      }
    }
  })
  it('Agustus 2026: Pelalawan punya desa ber-Indeks di empat tingkatan, dan paling sedikit 70% desa Aktif ber-Indeks', () => {
    const aktif = desaRekam.filter((d) => d.kabupaten.kode === '14.05' && d.status === 'Aktif')
    const hasil = aktif.map((d) => hasilRekam(d.id, AGUSTUS))
    const tingkatan = new Set(hasil.flatMap((h) => (h.tingkatan ? [h.tingkatan] : [])))
    expect([...tingkatan].sort()).toEqual(['berkembang', 'maju', 'mandiri', 'rintisan'])
    expect(hasil.filter((h) => h.indeks !== null).length / aktif.length).toBeGreaterThanOrEqual(0.7)
  })
  it('Agustus dan Triwulan II 2026: empat kabupaten Riau punya paling sedikit 3 desa ber-Indeks, Kuantan Singingi tidak', () => {
    for (const p of [AGUSTUS, T2]) {
      const perKabupaten = new Map<string, number>()
      for (const d of desaRekam) {
        if (hasilRekam(d.id, p).indeks !== null) perKabupaten.set(d.kabupaten.kode, (perKabupaten.get(d.kabupaten.kode) ?? 0) + 1)
      }
      for (const kode of ['14.05', '14.08', '14.01', '14.04']) expect(perKabupaten.get(kode) ?? 0, `${kode} ${p.kode}`).toBeGreaterThanOrEqual(3)
      expect(perKabupaten.get('14.09') ?? 0).toBe(0)
    }
  })
  it('seed sama menghasilkan jejak sama', () => {
    expect(bangkitkanDb(SEKARANG_UJI).ukuranIndeks).toEqual(db.ukuranIndeks)
  })
})
