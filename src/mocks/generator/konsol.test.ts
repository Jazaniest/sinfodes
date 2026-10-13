import { describe, expect, it } from 'vitest'
import { hitungPerhatian, statusTagihan } from '@/domain/konsol/aturan'
import { HARGA_TRIWULAN, langgananSchema, penggunaKonsolSchema } from '@/domain/konsol/schema'
import { langkahBerikut, persiapanBerurutan } from '@/domain/wilayah/persiapan'
import { desaSchema } from '@/domain/wilayah/schema'
import { DESA_ASLI_PELALAWAN } from '../data/desa-asli-pelalawan'
import { ID_SUNGAI_SIALANG } from '../data/desa-demo'
import { bangkitkanDb } from './index'

const SEKARANG = new Date('2026-09-24T02:00:00Z')
const db = bangkitkanDb(SEKARANG)
const jumlahStatus = (s: string) => db.desa.filter((d) => d.status === s).length

describe('data Konsol (SPEC §12.8, §11)', () => {
  it('40 desa: Aktif 26, Persiapan 7, Uji coba 5, Ditangguhkan 2', () => {
    expect(db.desa).toHaveLength(40)
    expect([jumlahStatus('Aktif'), jumlahStatus('Persiapan'), jumlahStatus('Uji coba'), jumlahStatus('Ditangguhkan')]).toEqual([26, 7, 5, 2])
    for (const d of db.desa) expect(desaSchema.parse(d)).toEqual(d)
    expect(new Set(db.desa.map((d) => d.id)).size).toBe(40)
    expect(new Set(db.desa.map((d) => d.slug)).size).toBe(40)
    expect(new Set(db.desa.map((d) => d.kodeDesa)).size).toBe(40)
  })
  it('32 desa di 12 kecamatan Pelalawan; 8 desa di Kampar, Siak, Indragiri Hilir, dan Kuantan Singingi', () => {
    const pelalawan = db.desa.filter((d) => d.kabupaten.kode === '14.05')
    expect(pelalawan).toHaveLength(32)
    expect(new Set(pelalawan.map((d) => d.kecamatan.kode)).size).toBe(12)
    const luar = db.desa.filter((d) => d.kabupaten.kode !== '14.05')
    expect(new Set(luar.map((d) => d.kabupaten.nama))).toEqual(new Set(['Kampar', 'Siak', 'Indragiri Hilir', 'Kuantan Singingi']))
    expect(luar).toHaveLength(8)
    expect(db.desa.every((d) => d.kodeDesa.startsWith(`${d.kecamatan.kode}.`))).toBe(true)
  })
  it('nama desa fiktif tidak sama dengan 104 desa asli Pelalawan (Lampiran A)', () => {
    expect(new Set(DESA_ASLI_PELALAWAN).size).toBe(104)
    const asli = new Set(DESA_ASLI_PELALAWAN.map((n) => n.toLowerCase()))
    for (const d of db.desa) expect(asli.has(d.nama.toLowerCase()), d.nama).toBe(false)
  })
  it('setiap desa satu langganan; desa Persiapan dan Uji coba belum ditagih; tagihan per triwulan seharga paketnya', () => {
    expect(db.langganan).toHaveLength(40)
    expect(new Set(db.langganan.map((l) => l.desaId))).toEqual(new Set(db.desa.map((d) => d.id)))
    for (const l of db.langganan) {
      expect(langgananSchema.parse(l)).toEqual(l)
      const desa = db.desa.find((d) => d.id === l.desaId)
      if (desa?.status === 'Persiapan') expect(l).toMatchObject({ mulai: null, sampai: null, tagihan: [] })
      if (desa?.status === 'Uji coba') expect(l.tagihan).toEqual([])
      if (desa?.status === 'Aktif') expect(l.tagihan.length).toBeGreaterThan(0)
      for (const t of l.tagihan) {
        expect(t.jumlah).toBe(HARGA_TRIWULAN[l.paket])
        expect(t.periode).toMatch(/^Triwulan (I|II|III|IV) \d{4}$/)
        expect(t.terbit < t.jatuhTempo).toBe(true)
        expect(t.terbit <= '2026-09-24').toBe(true)
      }
    }
  })
  it('desa tanpa data panel: Perlu perhatian 3 tidak aktif, 2 berhenti di impor; seluruh platform 1 tagihan lewat', () => {
    expect(db.rekamDesa).toHaveLength(38)
    const keadaan = db.rekamDesa.map((r) => ({
      status: db.desa.find((d) => d.id === r.desaId)?.status ?? 'Aktif',
      aktivitasTerakhir: r.aktivitasTerakhir,
      langkahBerikut: langkahBerikut(persiapanBerurutan(r.langkahSelesai)),
    }))
    const lewat = db.langganan.flatMap((l) => l.tagihan).filter((t) => statusTagihan(t, '2026-09-24') === 'lewat-jatuh-tempo').length
    expect(hitungPerhatian(keadaan, lewat, SEKARANG)).toEqual([
      { jenis: 'tidak-aktif', jumlah: 3 },
      { jenis: 'berhenti-impor', jumlah: 2 },
      { jenis: 'tagihan-lewat', jumlah: 1 },
    ])
  })
  it('angka desa tanpa data panel masuk akal: 12 bulan dan 12 minggu; desa Persiapan tanpa surat; penduduk baru ada sesudah impor', () => {
    for (const r of db.rekamDesa) {
      const desa = db.desa.find((d) => d.id === r.desaId)
      expect(r.suratPerBulan.map((b) => b.bulan).at(-1)).toBe('2026-09')
      expect(r.suratPerBulan).toHaveLength(12)
      expect(r.masukPerMinggu.map((m) => m.mulai).at(-1)).toBe('2026-09-21')
      if (desa?.status === 'Persiapan') expect(r.suratPerBulan.every((b) => b.jumlah === 0)).toBe(true)
      expect(r.jiwa === 0).toBe(r.kelengkapan === null)
      if (r.langkahSelesai < 3) expect(r.jiwa).toBe(0)
      if (r.kelengkapan !== null) expect(r.kelengkapan).toBeGreaterThan(0.5)
      if (r.aktivitasTerakhir) expect(r.aktivitasTerakhir < '2026-09-24T09:00:00+07:00').toBe(true)
    }
  })
  it('riwayat masuk Sungai Sialang: 12 minggu ke belakang, tidak di masa depan, hanya akun Sungai Sialang', () => {
    expect(db.riwayatMasuk.length).toBeGreaterThan(100)
    expect(db.riwayatMasuk.every((m) => m.desaId === ID_SUNGAI_SIALANG)).toBe(true)
    expect(db.riwayatMasuk.every((m) => new Date(m.waktu) < SEKARANG)).toBe(true)
    expect(db.riwayatMasuk.every((m) => new Date(m.waktu).getTime() > SEKARANG.getTime() - 85 * 86_400_000)).toBe(true)
  })
  it('akun konsol: Tim Sinfodes dan pemantau Kabupaten Pelalawan (SPEC §12.9)', () => {
    expect(db.penggunaKonsol.map((p) => penggunaKonsolSchema.parse(p))).toEqual([
      expect.objectContaining({ nama: 'Dina', peran: 'tim', wilayah: null }),
      expect.objectContaining({ nama: 'Dinas PMD Kabupaten Pelalawan', peran: 'pemantau', wilayah: { kode: '14.05', nama: 'Pelalawan' } }),
    ])
  })
  it('angka Pemantauan desa fiktif: Persiapan dan Ditangguhkan kosong; yang lain dalam rentang wajar', () => {
    for (const r of db.rekamDesa) {
      const status = db.desa.find((d) => d.id === r.desaId)?.status
      if (status === 'Persiapan' || status === 'Ditangguhkan') {
        expect(r).toMatchObject({ waktuLayananJam: null, waktuTanggapanJam: null, apbdes: null })
        continue
      }
      expect(r.apbdes).not.toBeNull()
      const rasio = (r.apbdes?.realisasi ?? 0) / (r.apbdes?.anggaran ?? 1)
      expect(rasio).toBeGreaterThanOrEqual(0.45)
      expect(rasio).toBeLessThanOrEqual(0.85)
      if (r.waktuLayananJam !== null) expect(r.waktuLayananJam).toBeGreaterThanOrEqual(18)
      if (r.waktuTanggapanJam !== null) expect(r.waktuTanggapanJam).toBeGreaterThanOrEqual(4)
    }
    // Uji coba Bukit Pelangi diam 30 hari: tidak ada surat 30 hari terakhir, jadi median layanannya kosong.
    expect(db.rekamDesa.find((r) => r.desaId === 'desa_bukit_pelangi')?.waktuLayananJam).toBeNull()
  })
})
