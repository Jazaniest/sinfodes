import {
  KATEGORI_DESA,
  KATEGORI_SKOR,
  bulat1,
  skorDari,
  tingkatanDari,
  type KategoriDesa,
  type KategoriSkor,
  type Tingkatan,
} from './kategori'
import { bulanPeriode, type Periode } from './periode'

/** Jejak satu desa dalam satu bulan kalender WIB (keputusan 6). Rasio disimpan 0-1. */
export type UkuranBulan = {
  aktif: boolean
  layanan: { selesai: number; medianJam: number | null }
  responsif: { pengaduan: number; dibalas: number; dibalas72: number; medianBalasJam: number | null }
  data: { diimpor: boolean; kelengkapan: number | null; mutasi: number; mutasiTepat: number }
  transparan: { punyaApbdes: boolean; apbdesTerbit: boolean; realisasiBaru: boolean; kegiatanBerjalan: number; kegiatanBerkabar: number }
  digital: { masuk: number; mandiri: number }
  website: { tayang: boolean; minggu: number; mingguAktif: number }
  serapan: { pagu: number; realisasi: number } | null
}

export type HasilKategori = { ukuran: number | null; skor: number | null; alasan: string | null }

export type HasilDesa = {
  peserta: boolean
  kategori: Record<KategoriDesa, HasilKategori>
  indeks: number | null
  tingkatan: Tingkatan | null
  jumlahSyarat: number
}

const SYARAT_LAYANAN = 10
const SYARAT_PENGADUAN = 3
const SYARAT_MASUK = 10
const SYARAT_KATEGORI = 5

const jumlah = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/** Median dengan bobot; nilai dengan bobot ≤ 0 diabaikan. Bobot sama besar: nilai bawah dari dua yang tengah. */
export function medianTertimbang(pasangan: readonly { nilai: number; bobot: number }[]): number | null {
  const ada = pasangan.filter((p) => p.bobot > 0).sort((a, b) => a.nilai - b.nilai)
  const total = jumlah(ada.map((p) => p.bobot))
  if (total === 0) return null
  let kumulatif = 0
  for (const p of ada) {
    kumulatif += p.bobot
    if (kumulatif >= total / 2) return p.nilai
  }
  return null
}

const BELUM = (alasan: string): HasilKategori => ({ ukuran: null, skor: null, alasan })
const ADA = (ukuran: number, skor: number | null): HasilKategori => ({ ukuran: bulat1(ukuran), skor, alasan: null })
const adaSkor = (k: KategoriSkor, ukuran: number): HasilKategori => ADA(ukuran, skorDari(k, bulat1(ukuran)))

function hitungKategori(baris: readonly UkuranBulan[], p: Periode): Record<KategoriSkor, HasilKategori> {
  const bulan = bulanPeriode(p)
  const terakhir = baris[baris.length - 1]
  const tahun = bulan[bulan.length - 1].slice(0, 4)
  const bulanTerakhir = Number(bulan[Math.min(baris.length, bulan.length) - 1].slice(5, 7))
  const tanpaApbdes = BELUM(`Belum punya APBDes ${tahun}`)

  const selesai = jumlah(baris.map((b) => b.layanan.selesai))
  const layanan =
    selesai < SYARAT_LAYANAN
      ? BELUM(`${selesai} dari ${SYARAT_LAYANAN} surat Selesai`)
      : adaSkor(
          'layanan',
          medianTertimbang(baris.filter((b) => b.layanan.medianJam !== null).map((b) => ({ nilai: b.layanan.medianJam!, bobot: b.layanan.selesai }))) ?? 72,
        )

  const pengaduan = jumlah(baris.map((b) => b.responsif.pengaduan))
  let responsif: HasilKategori
  if (pengaduan < SYARAT_PENGADUAN) responsif = BELUM(`${pengaduan} dari ${SYARAT_PENGADUAN} pengaduan`)
  else {
    const persen72 = (jumlah(baris.map((b) => b.responsif.dibalas72)) / pengaduan) * 100
    const median = medianTertimbang(baris.filter((b) => b.responsif.medianBalasJam !== null).map((b) => ({ nilai: b.responsif.medianBalasJam!, bobot: b.responsif.dibalas })))
    responsif = adaSkor('responsif', 0.6 * persen72 + 0.4 * (median === null ? 0 : skorDari('layanan', median)))
  }

  let data: HasilKategori
  if (!terakhir.data.diimpor) data = BELUM('Data penduduk belum diimpor')
  else {
    const kelengkapan = (terakhir.data.kelengkapan ?? 0) * 100
    const mutasi = jumlah(baris.map((b) => b.data.mutasi))
    const tepat = jumlah(baris.map((b) => b.data.mutasiTepat))
    data = adaSkor('data', mutasi > 0 ? 0.7 * kelengkapan + 0.3 * (tepat / mutasi) * 100 : kelengkapan)
  }

  let transparan: HasilKategori
  if (!terakhir.transparan.punyaApbdes) transparan = tanpaApbdes
  else {
    const butir = [terakhir.transparan.apbdesTerbit ? 1 : 0, terakhir.transparan.realisasiBaru ? 1 : 0]
    const berjalan = jumlah(baris.map((b) => b.transparan.kegiatanBerjalan))
    if (berjalan > 0) butir.push(jumlah(baris.map((b) => b.transparan.kegiatanBerkabar)) / berjalan)
    transparan = adaSkor('transparan', (jumlah(butir) / butir.length) * 100)
  }

  const masuk = jumlah(baris.map((b) => b.digital.masuk))
  const digital =
    masuk < SYARAT_MASUK
      ? BELUM(`${masuk} dari ${SYARAT_MASUK} surat masuk`)
      : adaSkor('digital', (jumlah(baris.map((b) => b.digital.mandiri)) / masuk) * 100)

  const minggu = jumlah(baris.map((b) => b.website.minggu))
  const website = !terakhir.website.tayang
    ? BELUM('Website belum tayang')
    : adaSkor('website', minggu === 0 ? 0 : (jumlah(baris.map((b) => b.website.mingguAktif)) / minggu) * 100)

  let serapan: HasilKategori
  if (terakhir.serapan === null) serapan = tanpaApbdes
  else {
    const target = (bulanTerakhir / 12) * terakhir.serapan.pagu
    serapan = adaSkor('serapan', target <= 0 ? 0 : Math.min(100, (terakhir.serapan.realisasi / target) * 100))
  }

  return { layanan, responsif, data, transparan, digital, website, serapan }
}

/**
 * Hasil satu desa untuk satu periode dari baris-baris bulannya (SPEC-V0.2 §9.2). `baris` dimulai dari bulan pertama periode
 * dan berhenti di bulan terakhir yang sudah dimulai; bulan sebelum desa berlangganan diisi baris `aktif: false`.
 */
export function hitungHasilDesa(baris: readonly UkuranBulan[], sebelumnya: HasilDesa | null, p: Periode): HasilDesa {
  const peserta = baris.length > 0 && baris.every((b) => b.aktif)
  if (!peserta) {
    const kosong = Object.fromEntries(KATEGORI_DESA.map((k) => [k, { ukuran: null, skor: null, alasan: null }])) as Record<KategoriDesa, HasilKategori>
    return { peserta: false, kategori: kosong, indeks: null, tingkatan: null, jumlahSyarat: 0 }
  }
  const skorKategori = hitungKategori(baris, p)
  const terpenuhi = KATEGORI_SKOR.filter((k) => skorKategori[k].ukuran !== null)
  const jumlahSyarat = terpenuhi.length
  const indeks = jumlahSyarat >= SYARAT_KATEGORI ? bulat1(jumlah(terpenuhi.map((k) => skorKategori[k].skor!)) / jumlahSyarat) : null

  const umum: HasilKategori = indeks === null ? BELUM(`Memenuhi syarat di ${jumlahSyarat} dari 7 kategori`) : { ukuran: indeks, skor: null, alasan: null }
  let meningkat: HasilKategori
  if (indeks === null) meningkat = BELUM('Belum ada Indeks periode ini')
  else if (sebelumnya?.indeks == null) meningkat = BELUM('Belum ada Indeks periode sebelumnya')
  else meningkat = { ukuran: bulat1(indeks - sebelumnya.indeks), skor: null, alasan: null }

  return {
    peserta: true,
    kategori: { ...skorKategori, meningkat, umum },
    indeks,
    tingkatan: indeks === null ? null : tingkatanDari(indeks),
    jumlahSyarat,
  }
}

export type BarisPapan<T> = { item: T; peringkat: number; bersama: boolean; nilai: number }

/**
 * Peringkat kompetisi (1, 1, 3) atas nilai yang sudah dibulatkan 1 desimal. Bila seri, urutan masuk dipertahankan:
 * pemanggil mengurutkan menurut nama lebih dulu.
 */
export function urutkanPeringkat<T>(item: readonly { item: T; nilai: number }[], arah: 'kecil' | 'besar'): BarisPapan<T>[] {
  const bulat = item.map((i) => ({ item: i.item, nilai: bulat1(i.nilai) }))
  const urut = [...bulat].sort((a, b) => (arah === 'kecil' ? a.nilai - b.nilai : b.nilai - a.nilai))
  return urut.map((b) => {
    const pertama = urut.findIndex((x) => x.nilai === b.nilai)
    return { item: b.item, nilai: b.nilai, peringkat: pertama + 1, bersama: urut.filter((x) => x.nilai === b.nilai).length > 1 }
  })
}

/** Peringkat 1-3; bisa berisi lebih dari tiga baris bila ada seri. */
export function podium<T>(baris: readonly BarisPapan<T>[]): BarisPapan<T>[] {
  return baris.filter((b) => b.peringkat <= 3)
}
