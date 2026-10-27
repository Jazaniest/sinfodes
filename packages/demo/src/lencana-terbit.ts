import { kodeLencana } from '@sinfodes/kontrak/indeks/lencana'
import { KATEGORI_DESA } from '@sinfodes/kontrak/indeks/kategori'
import { MUSIM, daftarPeriode, periodeBerjalan, tutupPada, type Periode } from '@sinfodes/kontrak/indeks/periode'
import { bulanAwalIndeks } from './indeks-dasar'
import { hasilDesaKabupaten, susunPapan } from './indeks-hitung'
import type { DbDemo, Lencana } from './tipe-db'

/** Podium kecamatan hanya dibuat bila paling sedikit tiga desa memenuhi syarat (SPEC-V0.2 §9.4). */
const MIN_DESA_PODIUM_KECAMATAN = 3

export const kunciPeriodeLencana = (p: Periode): string => `${p.musim}:${p.kode}`

/** Periode tutup, ketiga musim, yang belum diproses; yang terlama dulu supaya urutan terbit stabil. */
function periodeBelumDiproses(db: DbDemo, sekarang: Date): Periode[] {
  const diproses = new Set(db.periodeLencana)
  return MUSIM.flatMap((musim) => {
    const berjalan = periodeBerjalan(musim, sekarang).kode
    return daftarPeriode(musim, bulanAwalIndeks(sekarang), sekarang)
      .filter((p) => p.kode !== berjalan && !diproses.has(kunciPeriodeLencana(p)))
      .reverse()
  })
}

export type HasilTerbit = { lencana: Lencana[]; periode: string[] }

/**
 * Lencana baru untuk periode tutup yang belum ada di `db.periodeLencana` (rencana 7C-2 butir 1 dan 2): juara 1-3 tiap
 * kategori di kabupaten, dan di setiap kecamatan yang punya paling sedikit tiga desa memenuhi syarat. Seri sama-sama terbit.
 * Fungsi murni: pemanggil menyimpan `lencana` dan `periode`.
 */
export function terbitkanLencana(db: DbDemo, sekarang: Date): HasilTerbit {
  const lencana: Lencana[] = []
  const periode = periodeBelumDiproses(db, sekarang)
  const kabupaten = [...new Set(db.desa.map((d) => d.kabupaten.kode))]
  for (const p of periode) {
    const terbitPada = tutupPada(p)
    for (const kab of kabupaten) {
      const hasil = hasilDesaKabupaten(db, kab, { periode: p, kecamatan: null }, sekarang)
      const namaKab = hasil[0]?.desa.kabupaten.nama
      if (!namaKab) continue
      const kecamatan = [...new Map(hasil.map(({ desa }) => [desa.kecamatan.kode, desa.kecamatan])).values()]
      for (const kategori of KATEGORI_DESA) {
        const tambah = (tingkat: Lencana['tingkat'], wilayah: Lencana['wilayah'], baris: typeof hasil, kecamatanKode: string | null) => {
          const papan = susunPapan(baris, { musim: p.musim, periode: p, kategori, kecamatan: kecamatanKode }, sekarang)
          if (tingkat === 'kecamatan' && papan.peringkat.length < MIN_DESA_PODIUM_KECAMATAN) return
          for (const b of papan.peringkat.filter((x) => x.peringkat <= 3)) {
            lencana.push({
              kode: kodeLencana({ desaId: b.desa.id, kategori, tingkat, wilayahKode: wilayah.kode, musim: p.musim, periode: p.kode }),
              desaId: b.desa.id,
              kategori,
              peringkat: b.peringkat,
              bersama: b.bersama,
              tingkat,
              wilayah,
              periode: { musim: p.musim, kode: p.kode },
              nilai: b.ukuran,
              terbitPada,
              tampil: true,
            })
          }
        }
        tambah('kabupaten', { kode: kab, nama: namaKab }, hasil, null)
        for (const kec of kecamatan) tambah('kecamatan', { kode: kec.kode, nama: kec.nama }, hasil.filter(({ desa }) => desa.kecamatan.kode === kec.kode), kec.kode)
      }
    }
  }
  return { lencana, periode: periode.map(kunciPeriodeLencana) }
}
