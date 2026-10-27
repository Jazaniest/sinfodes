import { KATEGORI_DESA, KATEGORI_SKOR } from '@/domain/indeks/kategori'
import { alasanBukanPeserta, susunSaran, type KartuPeringkat, type PeringkatDesa, type Posisi, type Saran, type Tren } from '@/domain/indeks/peringkat-desa'
import { daftarPeriode, labelPeriode, periodeBerjalan, periodeSebelumnya, periodeTerakhirTutup, bulanPeriode, tutupPada, type Musim, type Periode } from '@/domain/indeks/periode'
import type { Desa } from '@/domain/wilayah/schema'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { bulanAwalIndeks } from '@sinfodes/demo/indeks-dasar'
import { hasilDesaKabupaten, hasilDesaPeriode, hitunganSaran, susunPapan } from '@sinfodes/demo/indeks-hitung'
import type { DbDemo } from '@sinfodes/demo/tipe-db'

/** Desa yang ikut peringkat di panel: hanya yang berstatus Aktif (SPEC-V0.2 §9.2). */
export const desaPeserta = (desa: Desa): boolean => desa.status === 'Aktif'

type Papan = ReturnType<typeof susunPapan>

function posisiDi(papan: Papan, desaId: string): Posisi {
  const baris = papan.peringkat.find((b) => b.desa.id === desaId)
  if (!baris) return null
  return { peringkat: baris.peringkat, bersama: baris.bersama, dari: papan.peringkat.length, ambangJuara3: papan.peringkat[2]?.ukuran ?? null }
}

/** Posisi desa di kecamatan dan kabupatennya untuk satu periode, semua kategori; nama desa lain tidak ikut. */
function posisiSemuaKategori(db: DbDemo, desa: Desa, musim: Musim, periode: Periode, sekarang: Date) {
  const hasil = hasilDesaKabupaten(db, desa.kabupaten.kode, { periode, kecamatan: null }, sekarang)
  const hasilKecamatan = hasil.filter((x) => x.desa.kecamatan.kode === desa.kecamatan.kode)
  const saya = hasil.find((x) => x.desa.id === desa.id)!.h
  return KATEGORI_DESA.map((kategori) => {
    const papanKab = susunPapan(hasil, { musim, periode, kategori, kecamatan: null }, sekarang)
    const papanKec = susunPapan(hasilKecamatan, { musim, periode, kategori, kecamatan: desa.kecamatan.kode }, sekarang)
    const k = saya.kategori[kategori]
    return {
      kategori,
      ukuran: k.ukuran,
      skor: (KATEGORI_SKOR as readonly string[]).includes(kategori) ? k.skor : null,
      alasan: saya.peserta ? k.alasan : 'Desa belum ikut peringkat pada periode ini.',
      kecamatan: posisiDi(papanKec, desa.id),
      kabupaten: posisiDi(papanKab, desa.id),
    }
  })
}

function sarannya(db: DbDemo, desa: Desa, sekarang: Date): Saran {
  const klasemen = hasilDesaPeriode(db, desa, periodeBerjalan('bulanan', sekarang), sekarang)
  const skor = Object.fromEntries(KATEGORI_SKOR.map((k) => [k, klasemen.kategori[k].skor]))
  return susunSaran(hitunganSaran(db, desa, sekarang), skor, tanggalIsoWib(sekarang))
}

const JUMLAH_TREN = 6

function trenDesa(db: DbDemo, desa: Desa, periode: Periode, sekarang: Date): Tren {
  const hasil: Tren = []
  for (let p = periode; hasil.length < JUMLAH_TREN && bulanPeriode(p)[0] >= bulanAwalIndeks(sekarang); p = periodeSebelumnya(p)) {
    hasil.unshift({ periode: { kode: p.kode, label: labelPeriode(p) }, indeks: hasilDesaPeriode(db, desa, p, sekarang).indeks })
  }
  return hasil
}

/** Isi halaman Peringkat panel desa (SPEC-V0.2 §9.5). Desa yang bukan peserta mendapat penjelasan. */
export function susunPeringkatDesa(db: DbDemo, desa: Desa, musim: Musim, periode: Periode, sekarang: Date): PeringkatDesa {
  if (!desaPeserta(desa)) return { peserta: false, desa: { nama: desa.nama }, alasan: alasanBukanPeserta(desa.nama) }
  const saya = hasilDesaPeriode(db, desa, periode, sekarang)
  const berjalan = periodeBerjalan(musim, sekarang).kode
  return {
    peserta: true,
    desa: { nama: desa.nama, kecamatan: desa.kecamatan.nama, kabupaten: desa.kabupaten.nama },
    musim,
    periode: { kode: periode.kode, label: labelPeriode(periode), berjalan: periode.kode === berjalan, tutupPada: tutupPada(periode) },
    daftarPeriode: daftarPeriode(musim, bulanAwalIndeks(sekarang), sekarang).map((p) => ({ kode: p.kode, label: labelPeriode(p), berjalan: p.kode === berjalan })),
    indeks: saya.indeks,
    tingkatan: saya.tingkatan,
    kategori: posisiSemuaKategori(db, desa, musim, periode, sekarang),
    tren: trenDesa(db, desa, periode, sekarang),
    saran: sarannya(db, desa, sekarang),
  }
}

/** Kartu Beranda: bulan terakhir tutup, tanpa tabel; null bagi desa yang bukan peserta (rencana 7C-2 butir 10). */
export function kartuPeringkatDesa(db: DbDemo, desa: Desa, sekarang: Date): KartuPeringkat | null {
  if (!desaPeserta(desa)) return null
  const periode = periodeTerakhirTutup('bulanan', sekarang)
  const saya = hasilDesaPeriode(db, desa, periode, sekarang)
  const hasil = hasilDesaKabupaten(db, desa.kabupaten.kode, { periode, kecamatan: null }, sekarang)
  const umum = susunPapan(hasil, { musim: 'bulanan', periode, kategori: 'umum', kecamatan: null }, sekarang)
  return {
    periode: { kode: periode.kode, label: labelPeriode(periode) },
    indeks: saya.indeks,
    tingkatan: saya.tingkatan,
    umumKabupaten: posisiDi(umum, desa.id),
    alasanUmum: saya.kategori.umum.ukuran === null ? (saya.kategori.umum.alasan ?? alasanBukanPeserta(desa.nama)) : null,
    kabupaten: desa.kabupaten.nama,
    saran: sarannya(db, desa, sekarang)[0] ?? null,
  }
}
