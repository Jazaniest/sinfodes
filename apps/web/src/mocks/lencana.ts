import { KATEGORI_DESA, formatUkuran } from '@/domain/indeks/kategori'
import {
  PENJELASAN_KATEGORI,
  kalimatLencana,
  type BuktiLencana,
  type LencanaAdmin,
  type LencanaPublik,
} from '@/domain/indeks/lencana'
import { MUSIM, labelPeriode } from '@/domain/indeks/periode'
import { ambilDb, ubahDb } from './db'
import { bekukanBulanTutup } from './indeks'
import type { DbDemo, Lencana } from '@sinfodes/demo/tipe-db'

export { terbitkanLencana, type HasilTerbit } from '@sinfodes/demo/lencana-terbit'
import { terbitkanLencana } from '@sinfodes/demo/lencana-terbit'

/** Paling banyak lencana yang tampil di website desa (rencana 7C-2 butir 3). */
export const MAKS_LENCANA_WEBSITE = 6

/** Terbitkan lencana periode tutup yang belum diproses. Menulis hanya bila ada periode baru, jadi `GET` biasa tidak menulis. */
export function pastikanLencana(sekarang: Date): void {
  bekukanBulanTutup(sekarang)
  const baru = terbitkanLencana(ambilDb(), sekarang)
  if (baru.periode.length === 0) return
  ubahDb((d) => {
    d.lencana.push(...baru.lencana)
    d.periodeLencana.push(...baru.periode)
  })
}

const URUT_MUSIM = [...MUSIM].reverse()

/** Tahunan, triwulan, bulanan; kabupaten sebelum kecamatan; peringkat terkecil; urutan kategori. */
function urutKeputusan3(a: Lencana, b: Lencana): number {
  return (
    URUT_MUSIM.indexOf(a.periode.musim) - URUT_MUSIM.indexOf(b.periode.musim) ||
    (a.tingkat === b.tingkat ? 0 : a.tingkat === 'kabupaten' ? -1 : 1) ||
    a.peringkat - b.peringkat ||
    KATEGORI_DESA.indexOf(a.kategori) - KATEGORI_DESA.indexOf(b.kategori) ||
    a.wilayah.kode.localeCompare(b.wilayah.kode)
  )
}

/** Periode tutup terakhir yang sudah diproses untuk setiap musim; kodenya terurut sebagai teks. */
function periodeTerakhirDiproses(db: DbDemo): Map<string, string> {
  const hasil = new Map<string, string>()
  for (const kunci of db.periodeLencana) {
    const [musim, kode] = kunci.split(':')
    if ((hasil.get(musim) ?? '') < kode) hasil.set(musim, kode)
  }
  return hasil
}

/** Lencana yang tampil di website desa: periode tutup terakhir tiap musim, yang tidak disembunyikan, paling banyak 6. */
export function lencanaTampil(db: DbDemo, desaId: string): Lencana[] {
  const terakhir = periodeTerakhirDiproses(db)
  return db.lencana
    .filter((l) => l.desaId === desaId && l.tampil && terakhir.get(l.periode.musim) === l.periode.kode)
    .sort(urutKeputusan3)
    .slice(0, MAKS_LENCANA_WEBSITE)
}

/** Semua lencana satu desa: periode tutup terbaru dulu, lalu urutan keputusan 3. */
export function lencanaDesa(db: DbDemo, desaId: string): Lencana[] {
  return db.lencana.filter((l) => l.desaId === desaId).sort((a, b) => b.terbitPada.localeCompare(a.terbitPada) || urutKeputusan3(a, b))
}

export function keLencanaPublik(l: Lencana): LencanaPublik {
  return {
    kode: l.kode,
    kalimat: kalimatLencana({ peringkat: l.peringkat, bersama: l.bersama, kategori: l.kategori, tingkat: l.tingkat, wilayahNama: l.wilayah.nama, periode: l.periode }),
    peringkat: l.peringkat,
    bersama: l.bersama,
    kategori: l.kategori,
    tingkat: l.tingkat,
    periode: { musim: l.periode.musim, kode: l.periode.kode, label: labelPeriode(l.periode) },
  }
}

export const keLencanaAdmin = (l: Lencana): LencanaAdmin => ({ ...keLencanaPublik(l), tampil: l.tampil })

/** Isi halaman bukti; `null` bila kode tidak terdaftar. Tanpa tingkatan, Indeks, atau skor desa. */
export function buktiLencana(db: DbDemo, kode: string): BuktiLencana | null {
  const l = db.lencana.find((x) => x.kode === kode)
  const desa = l && db.desa.find((d) => d.id === l.desaId)
  if (!l || !desa) return null
  return {
    ...keLencanaPublik(l),
    desa: { nama: desa.nama, kecamatan: desa.kecamatan.nama, kabupaten: desa.kabupaten.nama, alamat: desa.status !== 'Persiapan' ? desa.slug : null },
    nilai: formatUkuran(l.kategori, l.nilai),
    terbitPada: l.terbitPada,
    penjelasan: PENJELASAN_KATEGORI[l.kategori],
  }
}
