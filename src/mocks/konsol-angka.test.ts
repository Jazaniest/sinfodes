import { describe, expect, it } from 'vitest'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { jumlahKelompok } from '@/domain/keuangan/schema'
import { jumlahSelesai, langkahBerikut } from '@/domain/wilayah/persiapan'
import { ID_SUNGAI_SIALANG, ID_TANJUNG_LAMO } from './data/desa-demo'
import { bangkitkanDb } from './generator'
import { angkaKonsolDesa } from './konsol-angka'
import { persiapanDesa } from './persiapan'

const SEKARANG = new Date('2026-09-24T02:00:00Z')
const desa = (db: ReturnType<typeof bangkitkanDb>, id: string) => {
  const d = db.desa.find((x) => x.id === id)
  if (!d) throw new Error(`Desa ${id} tidak ada`)
  return d
}

describe('angka Konsol per desa (SPEC §11)', () => {
  it('Sungai Sialang dihitung dari data panelnya: jiwa, kelengkapan, pengguna aktif, persiapan, surat, masuk, dan kontak', () => {
    const db = bangkitkanDb(SEKARANG)
    const a = angkaKonsolDesa(db, desa(db, ID_SUNGAI_SIALANG), SEKARANG)
    expect(a.jiwa).toBe(2812)
    // 12 penduduk datanya belum lengkap (SPEC §12.3).
    expect(a.kelengkapan).toBeCloseTo(2800 / 2812, 6)
    expect(a.penggunaAktif).toBe(5)
    expect(jumlahSelesai(a.persiapan)).toBe(5)
    expect(a.suratPerBulan.map((b) => b.bulan)).toHaveLength(12)
    expect(a.suratPerBulan.at(-1)?.bulan).toBe('2026-09')
    const terbitSeptember = db.permohonan.filter(
      (p) => p.desaId === ID_SUNGAI_SIALANG && p.terbit !== null && tanggalIsoWib(new Date(p.terbit.pada)).startsWith('2026-09'),
    ).length
    expect(a.suratPerBulan.at(-1)?.jumlah).toBe(terbitSeptember)
    expect(a.masukPerMinggu.at(-1)?.mulai).toBe('2026-09-21')
    expect(a.masukPerMinggu.reduce((n, m) => n + m.jumlah, 0)).toBe(db.riwayatMasuk.filter((m) => m.waktu >= '2026-07-06').length)
    expect(a.aktivitasTerakhir?.slice(0, 10)).toBe('2026-09-24')
    expect(a.kontak).toEqual({
      kades: 'H. Muhammad Nasir',
      operator: { nama: 'Rosmiati', email: 'rosmiati@sungaisialang.desa.id' },
      sekdes: { nama: 'Hendri Saputra', email: 'hendri@sungaisialang.desa.id' },
    })
  })
  it('Tanjung Lamo, desa baru: 0 dari 5 langkah, tanpa penduduk, tanpa aktivitas, kelengkapan kosong (fokus review 4)', () => {
    const db = bangkitkanDb(SEKARANG)
    const a = angkaKonsolDesa(db, desa(db, ID_TANJUNG_LAMO), SEKARANG)
    expect(jumlahSelesai(a.persiapan)).toBe(0)
    expect(a).toMatchObject({ jiwa: 0, kelengkapan: null, penggunaAktif: 0, aktivitasTerakhir: null, suratMingguIni: 0 })
    expect(a.suratPerBulan.every((b) => b.jumlah === 0)).toBe(true)
    expect(a.kontak).toEqual({ kades: null, operator: { nama: 'Yusri', email: 'operator@tanjunglamo.desa.id' }, sekdes: null })
  })
  it('langkah persiapan mengikuti data panel: identitas, dusun, penduduk, pengguna kedua, dan jenis surat aktif (fokus review 5)', () => {
    const db = bangkitkanDb(SEKARANG)
    const tl = desa(db, ID_TANJUNG_LAMO)
    const ss = desa(db, ID_SUNGAI_SIALANG)
    Object.assign(tl, { alamatKantor: 'Jalan Pelabuhan', kodePos: '28384', surel: 'pemdes@tanjunglamo.desa.id', telepon: '081200000000', jamLayanan: ss.jamLayanan })
    expect(langkahBerikut(persiapanDesa(db, tl))).toBe('wilayah')
    db.dusun.push({ ...db.dusun[0], id: 'dsn_tl_1', desaId: tl.id })
    expect(langkahBerikut(persiapanDesa(db, tl))).toBe('impor')
    db.penduduk.push({ ...db.penduduk[0], id: 'pdk_tl_1', desaId: tl.id })
    expect(langkahBerikut(persiapanDesa(db, tl))).toBe('pengguna')
    db.pengguna.push({ ...db.pengguna[0], id: 'pgn_tl_2', desaId: tl.id })
    expect(langkahBerikut(persiapanDesa(db, tl))).toBe('jenis-surat')
    db.jenisSurat.push({ ...db.jenisSurat[0], id: 'jns_tl_1', desaId: tl.id, aktif: true })
    expect(langkahBerikut(persiapanDesa(db, tl))).toBeNull()
  })
  it('desa fiktif memakai angka rekamannya; persiapannya dari jumlah langkah yang selesai', () => {
    const db = bangkitkanDb(SEKARANG)
    const a = angkaKonsolDesa(db, desa(db, 'desa_serapung_laut'), SEKARANG)
    expect(langkahBerikut(a.persiapan)).toBe('impor')
    expect(a).toMatchObject({ jiwa: 0, kelengkapan: null })
  })
  it('angka Pemantauan Sungai Sialang dari data panel: surat Selesai bulan ini, median jam layanan dan tanggapan, belanja APBDes', () => {
    const db = bangkitkanDb(SEKARANG)
    const a = angkaKonsolDesa(db, desa(db, ID_SUNGAI_SIALANG), SEKARANG)
    const selesaiSeptember = db.permohonan.filter(
      (p) => p.desaId === ID_SUNGAI_SIALANG && p.status === 'selesai' && p.terbit && tanggalIsoWib(new Date(p.terbit.pada)).startsWith('2026-09'),
    )
    expect(a.suratBulanIni).toBe(selesaiSeptember.length)
    expect(a.suratBulanIni).toBeGreaterThan(0)
    expect(a.waktuLayananJam).toBeGreaterThan(0)
    expect(a.waktuLayananJam).toBeLessThan(24 * 30)
    expect(a.waktuTanggapanJam).toBeGreaterThan(0)
    const apbdes = db.apbdes.find((x) => x.desaId === ID_SUNGAI_SIALANG && x.tahun === 2026)
    if (!apbdes) throw new Error('APBDes 2026 Sungai Sialang tidak ada')
    expect(a.apbdes).toEqual(jumlahKelompok(apbdes, 'belanja'))
  })
  it('angka Pemantauan desa tanpa data: Tanjung Lamo dan desa fiktif Persiapan kosong, bukan nol palsu (fokus review 3)', () => {
    const db = bangkitkanDb(SEKARANG)
    const kosong = { suratBulanIni: 0, waktuLayananJam: null, waktuTanggapanJam: null, apbdes: null }
    expect(angkaKonsolDesa(db, desa(db, ID_TANJUNG_LAMO), SEKARANG)).toMatchObject(kosong)
    expect(angkaKonsolDesa(db, desa(db, 'desa_serapung_laut'), SEKARANG)).toMatchObject(kosong)
    const gelugur = angkaKonsolDesa(db, desa(db, 'desa_sungai_gelugur'), SEKARANG)
    expect(gelugur.suratBulanIni).toBe(gelugur.suratPerBulan.at(-1)?.jumlah)
    expect(gelugur.apbdes).not.toBeNull()
  })
})
