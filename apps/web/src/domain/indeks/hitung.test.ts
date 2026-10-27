import { describe, expect, it } from 'vitest'
import { skorDari } from './kategori'
import { hitungHasilDesa, medianTertimbang, podium, urutkanPeringkat, type HasilDesa, type UkuranBulan } from './hitung'
import type { Periode } from './periode'

const BULANAN: Periode = { musim: 'bulanan', kode: '2026-08' }
const T3: Periode = { musim: 'triwulan', kode: '2026-T3' }
const T2: Periode = { musim: 'triwulan', kode: '2026-T2' }

/** Baris yang memenuhi semua syarat; sisanya ditimpa per uji. */
function baris(ubah: Partial<UkuranBulan> = {}): UkuranBulan {
  return {
    aktif: true,
    layanan: { selesai: 20, medianJam: 10 },
    responsif: { pengaduan: 5, dibalas: 5, dibalas72: 5, medianBalasJam: 6 },
    data: { diimpor: true, kelengkapan: 0.9, mutasi: 4, mutasiTepat: 3 },
    transparan: { punyaApbdes: true, apbdesTerbit: true, realisasiBaru: true, kegiatanBerjalan: 4, kegiatanBerkabar: 2 },
    digital: { masuk: 20, mandiri: 5 },
    website: { tayang: true, minggu: 4, mingguAktif: 3 },
    serapan: { pagu: 1200, realisasi: 100 },
    ...ubah,
  }
}

const bulat = (x: number) => Math.round(x * 10) / 10
const KOSONG_TRANSPARAN = { punyaApbdes: false, apbdesTerbit: false, realisasiBaru: false, kegiatanBerjalan: 0, kegiatanBerkabar: 0 }
const SEPI = {
  layanan: { selesai: 0, medianJam: null },
  responsif: { pengaduan: 0, dibalas: 0, dibalas72: 0, medianBalasJam: null },
  digital: { masuk: 0, mandiri: 0 },
}

describe('medianTertimbang', () => {
  it('bobot menentukan median', () => {
    expect(medianTertimbang([{ nilai: 10, bobot: 1 }, { nilai: 30, bobot: 3 }])).toBe(30)
    expect(medianTertimbang([])).toBeNull()
    expect(medianTertimbang([{ nilai: 5, bobot: 0 }])).toBeNull()
  })
})

describe('hitungHasilDesa', () => {
  it('Layanan: kurang dari 10 surat Selesai belum memenuhi syarat', () => {
    const h = hitungHasilDesa([baris({ layanan: { selesai: 9, medianJam: 10 } })], null, BULANAN)
    expect(h.kategori.layanan).toEqual({ ukuran: null, skor: null, alasan: '9 dari 10 surat Selesai' })
  })
  it('Layanan triwulan memakai median tertimbang', () => {
    const h = hitungHasilDesa(
      [baris({ layanan: { selesai: 5, medianJam: 10 } }), baris({ layanan: { selesai: 15, medianJam: 30 } }), baris({ layanan: { selesai: 0, medianJam: null } })],
      null,
      T3,
    )
    expect(h.kategori.layanan.ukuran).toBe(30)
    expect(h.kategori.layanan.skor).toBe(skorDari('layanan', 30))
  })
  it('Responsif: 60% dibalas 72 jam + 40% skor median', () => {
    const h = hitungHasilDesa([baris({ responsif: { pengaduan: 4, dibalas: 4, dibalas72: 3, medianBalasJam: 12 } })], null, BULANAN)
    expect(h.kategori.responsif.ukuran).toBe(bulat(0.6 * 75 + 0.4 * skorDari('layanan', 12)))
    const kurang = hitungHasilDesa([baris({ responsif: { pengaduan: 2, dibalas: 2, dibalas72: 2, medianBalasJam: 1 } })], null, BULANAN)
    expect(kurang.kategori.responsif.alasan).toBe('2 dari 3 pengaduan')
  })
  it('Responsif tanpa balasan sah memberi nilai 0', () => {
    const h = hitungHasilDesa([baris({ responsif: { pengaduan: 3, dibalas: 0, dibalas72: 0, medianBalasJam: null } })], null, BULANAN)
    expect(h.kategori.responsif.ukuran).toBe(0)
  })
  it('Data: tanpa mutasi kelengkapan saja, dengan mutasi 70/30', () => {
    const tanpa = hitungHasilDesa([baris({ data: { diimpor: true, kelengkapan: 0.935, mutasi: 0, mutasiTepat: 0 } })], null, BULANAN)
    expect(tanpa.kategori.data.ukuran).toBe(93.5)
    const dengan = hitungHasilDesa([baris({ data: { diimpor: true, kelengkapan: 0.9, mutasi: 4, mutasiTepat: 3 } })], null, BULANAN)
    expect(dengan.kategori.data.ukuran).toBe(bulat(0.7 * 90 + 0.3 * 75))
    const belum = hitungHasilDesa([baris({ data: { diimpor: false, kelengkapan: null, mutasi: 0, mutasiTepat: 0 } })], null, BULANAN)
    expect(belum.kategori.data.alasan).toBe('Data penduduk belum diimpor')
  })
  it('Transparan: rata-rata tiga butir, atau dua butir tanpa kegiatan berjalan', () => {
    const tiga = hitungHasilDesa([baris({ transparan: { punyaApbdes: true, apbdesTerbit: true, realisasiBaru: false, kegiatanBerjalan: 4, kegiatanBerkabar: 2 } })], null, BULANAN)
    expect(tiga.kategori.transparan.ukuran).toBe(50)
    const dua = hitungHasilDesa([baris({ transparan: { punyaApbdes: true, apbdesTerbit: true, realisasiBaru: false, kegiatanBerjalan: 0, kegiatanBerkabar: 0 } })], null, BULANAN)
    expect(dua.kategori.transparan.ukuran).toBe(50)
    const satu = hitungHasilDesa([baris({ transparan: { punyaApbdes: true, apbdesTerbit: true, realisasiBaru: true, kegiatanBerjalan: 0, kegiatanBerkabar: 0 } })], null, BULANAN)
    expect(satu.kategori.transparan.ukuran).toBe(100)
    const tanpaApbdes = hitungHasilDesa([baris({ transparan: KOSONG_TRANSPARAN, serapan: null })], null, BULANAN)
    expect(tanpaApbdes.kategori.transparan.alasan).toBe('Belum punya APBDes 2026')
    expect(tanpaApbdes.kategori.serapan.alasan).toBe('Belum punya APBDes 2026')
  })
  it('Digital: persen mandiri, syarat 10 surat masuk', () => {
    expect(hitungHasilDesa([baris({ digital: { masuk: 20, mandiri: 5 } })], null, BULANAN).kategori.digital.ukuran).toBe(25)
    expect(hitungHasilDesa([baris({ digital: { masuk: 9, mandiri: 5 } })], null, BULANAN).kategori.digital.alasan).toBe('9 dari 10 surat masuk')
  })
  it('Website dua bulan: 4 + 5 minggu, 2 + 4 aktif menjadi 66,7', () => {
    const h = hitungHasilDesa([baris({ website: { tayang: true, minggu: 4, mingguAktif: 2 } }), baris({ website: { tayang: true, minggu: 5, mingguAktif: 4 } })], null, T3)
    expect(h.kategori.website.ukuran).toBe(66.7)
    expect(hitungHasilDesa([baris({ website: { tayang: false, minggu: 4, mingguAktif: 0 } })], null, BULANAN).kategori.website.alasan).toBe('Website belum tayang')
  })
  it('Serapan: target bulan ke-n dari 12 kali pagu, paling tinggi 100', () => {
    const tiga = (realisasi: number) => [baris(), baris(), baris({ serapan: { pagu: 1200, realisasi } })]
    expect(hitungHasilDesa(tiga(700), null, T2).kategori.serapan.ukuran).toBe(100)
    expect(hitungHasilDesa(tiga(300), null, T2).kategori.serapan.ukuran).toBe(50)
  })
  it('Indeks dari tujuh skor', () => {
    const h = hitungHasilDesa([baris()], null, BULANAN)
    const skor = (['layanan', 'responsif', 'data', 'transparan', 'digital', 'website', 'serapan'] as const).map((k) => h.kategori[k].skor!)
    expect(h.jumlahSyarat).toBe(7)
    expect(h.indeks).toBe(bulat(skor.reduce((a, b) => a + b, 0) / 7))
    expect(h.tingkatan).not.toBeNull()
    expect(h.kategori.umum.ukuran).toBe(h.indeks)
  })
  it('empat syarat terpenuhi: tanpa Indeks', () => {
    const h = hitungHasilDesa([baris({ ...SEPI, layanan: { selesai: 1, medianJam: 1 } })], null, BULANAN)
    expect(h.jumlahSyarat).toBe(4)
    expect(h.indeks).toBeNull()
    expect(h.tingkatan).toBeNull()
    expect(h.kategori.umum.alasan).toBe('Memenuhi syarat di 4 dari 7 kategori')
  })
  it('lima syarat terpenuhi: Indeks dari lima skor saja', () => {
    const h = hitungHasilDesa([baris({ layanan: { selesai: 1, medianJam: 1 }, digital: { masuk: 0, mandiri: 0 } })], null, BULANAN)
    expect(h.jumlahSyarat).toBe(5)
    const lima = (['responsif', 'data', 'transparan', 'website', 'serapan'] as const).map((k) => h.kategori[k].skor!)
    expect(h.indeks).toBe(bulat(lima.reduce((a, b) => a + b, 0) / 5))
  })
  it('bukan peserta: satu baris tidak aktif', () => {
    const h = hitungHasilDesa([baris({ aktif: false }), baris(), baris()], null, T3)
    expect(h.peserta).toBe(false)
    expect(h.indeks).toBeNull()
    expect(h.kategori.layanan).toEqual({ ukuran: null, skor: null, alasan: null })
    expect(h.kategori.umum).toEqual({ ukuran: null, skor: null, alasan: null })
  })
  it('Paling Meningkat: selisih Indeks, atau alasan bila tanpa pembanding', () => {
    const sekarang = hitungHasilDesa([baris()], null, BULANAN)
    const sebelum = { ...sekarang, indeks: bulat(sekarang.indeks! - 6.2) } as HasilDesa
    const h = hitungHasilDesa([baris()], sebelum, BULANAN)
    expect(h.kategori.meningkat.ukuran).toBe(6.2)
    expect(h.kategori.meningkat.skor).toBeNull()
    expect(sekarang.kategori.meningkat.alasan).toBe('Belum ada Indeks periode sebelumnya')
    const tanpaIndeksIni = hitungHasilDesa([baris(SEPI)], sebelum, BULANAN)
    expect(tanpaIndeksIni.kategori.meningkat.alasan).toBe('Belum ada Indeks periode ini')
  })
})

describe('urutkanPeringkat dan podium', () => {
  const k = (nilai: number[], arah: 'kecil' | 'besar') => urutkanPeringkat(nilai.map((n, i) => ({ item: `d${i}`, nilai: n })), arah)
  it('peringkat kompetisi, besar lebih baik', () => {
    const p = k([90, 80, 80, 70], 'besar')
    expect(p.map((b) => b.peringkat)).toEqual([1, 2, 2, 4])
    expect(p.map((b) => b.bersama)).toEqual([false, true, true, false])
  })
  it('kecil lebih baik, dibulatkan 1 desimal sebelum dibandingkan', () => {
    const p = k([2.04, 2.0, 5], 'kecil')
    expect(p.map((b) => b.peringkat)).toEqual([1, 1, 3])
    expect(p.map((b) => b.nilai)).toEqual([2, 2, 5])
  })
  it('seri mempertahankan urutan masuk', () => {
    expect(k([70, 70], 'besar').map((b) => b.item)).toEqual(['d0', 'd1'])
  })
  it('podium mengambil peringkat sampai 3', () => {
    expect(podium(k([1, 2, 3, 3, 5], 'kecil'))).toHaveLength(4)
  })
})
