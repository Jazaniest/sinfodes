import { tanggalIsoWib } from '@sinfodes/kontrak/format/tanggal'
import type { HitunganSaran } from '@sinfodes/kontrak/indeks/peringkat-desa'
import { dataBelumLengkap } from '@sinfodes/kontrak/penduduk/filter'
import { hitungHasilDesa, podium, urutkanPeringkat, type HasilDesa } from '@sinfodes/kontrak/indeks/hitung'
import { KATEGORI_DESA, KATEGORI_SKOR, TINGKATAN, bulat1, lebihBaik, type KategoriDesa, type KategoriKabupaten, type Tingkatan } from '@sinfodes/kontrak/indeks/kategori'
import {
  bulanPeriode,
  labelPeriode,
  periodeBerjalan,
  periodeSebelumnya,
  periodeTerakhirTutup,
  tutupPada,
  type Musim,
  type Periode,
} from '@sinfodes/kontrak/indeks/periode'
import type { PapanIndeks, PodiumLaporan, RingkasIndeks } from '@sinfodes/kontrak/indeks/schema'
import { JUMLAH_DESA_KABUPATEN } from '@sinfodes/kontrak/kabupaten/jumlah-desa'
import { akhirBulan } from '@sinfodes/kontrak/kabupaten/laporan'
import { median } from '@sinfodes/kontrak/kabupaten/pemantauan'
import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
import { BARIS_KOSONG, bulanAwalIndeks, tangguhBeririsan } from './indeks-dasar'
import { barisBeku, punyaRekaman, ukuranBulanPanel } from './indeks-panel'
import { bergabungPada, desaDiKabupaten } from './kabupaten-angka'
import type { DbDemo, UkuranBulanIndeks } from './tipe-db'

export { aktifSepanjang, bulanAwalIndeks, jumlahSenin } from './indeks-dasar'
export { bekukanPanel, ukuranBulanPanel } from './indeks-panel'

/**
 * Baris jejak `desa` untuk `bulan` yang diminta: baris beku bila ada. Desa panel menghitung bulan berjalan dan bulan tutup
 * yang belum beku. Bulan sebelum periode paling awal dan bulan sesudah bulan berjalan dilewati.
 */
export function barisUkuran(db: DbDemo, desa: Desa, bulan: readonly string[], sekarang: Date): UkuranBulanIndeks[] {
  const awal = bulanAwalIndeks(sekarang)
  const sekarangBulan = tanggalIsoWib(sekarang).slice(0, 7)
  const hasil: UkuranBulanIndeks[] = []
  for (const b of bulan) {
    if (b < awal || b > sekarangBulan) continue
    const beku = barisBeku(db, desa.id, b)
    if (beku && b < sekarangBulan) hasil.push(beku)
    else if (punyaRekaman(db, desa)) {
      const baris = beku ?? { ...structuredClone(BARIS_KOSONG), desaId: desa.id, bulan: b, aktif: false }
      // Bulan berjalan desa rekaman ikut penangguhan terbaru; bulan yang sudah beku tidak diubah.
      const ditangguhkan = b === sekarangBulan && baris.aktif && tangguhBeririsan(db.riwayatStatusDesa.filter((r) => r.desaId === desa.id), `${b}-01`, tanggalIsoWib(sekarang))
      hasil.push(ditangguhkan ? { ...baris, aktif: false } : baris)
    }
    else hasil.push(ukuranBulanPanel(db, desa, b, sekarang))
  }
  return hasil
}

/** Hasil satu desa untuk satu periode; Paling Meningkat memakai hasil periode sebelumnya bila periode itu masih tersedia. */
export function hasilDesaPeriode(db: DbDemo, desa: Desa, p: Periode, sekarang: Date): HasilDesa {
  const sebelumnya = periodeSebelumnya(p)
  const adaSebelumnya = bulanPeriode(sebelumnya)[0] >= bulanAwalIndeks(sekarang)
  return hitungPeriode(db, desa, p, adaSebelumnya ? hitungPeriode(db, desa, sebelumnya, null, sekarang) : null, sekarang)
}

function hitungPeriode(db: DbDemo, desa: Desa, p: Periode, sebelumnya: HasilDesa | null, sekarang: Date): HasilDesa {
  const bulan = bulanPeriode(p).filter((b) => b <= tanggalIsoWib(sekarang).slice(0, 7))
  return hitungHasilDesa(barisUkuran(db, desa, bulan, sekarang), sebelumnya, p)
}

export type CakupanPapan = { musim: Musim; periode: Periode; kategori: KategoriDesa; kecamatan: string | null }

type Papan = Omit<PapanIndeks, 'provinsi' | 'daftarPeriode' | 'daftarKecamatan' | 'kabupaten'>

const urutNama = (a: { nama: string }, b: { nama: string }): number => a.nama.localeCompare(b.nama, 'id')

export function susunPapan(hasil: readonly { desa: Desa; h: HasilDesa }[], c: CakupanPapan, sekarang: Date): Papan {
  const kandidat = hasil.filter(({ h }) => h.peserta && h.kategori[c.kategori].ukuran !== null).sort((a, b) => urutNama(a.desa, b.desa))
  const peringkat = urutkanPeringkat(kandidat.map((k) => ({ item: k, nilai: k.h.kategori[c.kategori].ukuran! })), lebihBaik(c.kategori)).map((b) => ({
    peringkat: b.peringkat,
    bersama: b.bersama,
    desa: { id: b.item.desa.id, nama: b.item.desa.nama, kecamatan: b.item.desa.kecamatan.nama },
    ukuran: b.nilai,
    skor: (KATEGORI_SKOR as readonly string[]).includes(c.kategori) ? b.item.h.kategori[c.kategori].skor : null,
    tingkatan: c.kategori === 'umum' ? b.item.h.tingkatan : null,
  }))
  const kecamatan = hasil.find(({ desa }) => desa.kecamatan.kode === c.kecamatan)?.desa.kecamatan ?? null
  return {
    musim: c.musim,
    periode: {
      kode: c.periode.kode,
      label: labelPeriode(c.periode),
      berjalan: c.periode.kode === periodeBerjalan(c.musim, sekarang).kode,
      tutupPada: tutupPada(c.periode),
    },
    kategori: c.kategori,
    kecamatan: kecamatan ? { kode: kecamatan.kode, nama: kecamatan.nama } : null,
    peringkat,
    belumMemenuhi: hasil
      .filter(({ h }) => h.peserta && h.kategori[c.kategori].ukuran === null)
      .sort((a, b) => urutNama(a.desa, b.desa))
      .map(({ desa, h }) => ({ desa: { id: desa.id, nama: desa.nama, kecamatan: desa.kecamatan.nama }, alasan: h.kategori[c.kategori].alasan ?? '' })),
    tidakIkut: hasil.filter(({ h }) => !h.peserta).length,
    podiumKecamatan: c.kecamatan === null ? null : peringkat.length >= 3,
  }
}

export function hasilDesaKabupaten(db: DbDemo, kabupatenKode: string, c: Pick<CakupanPapan, 'periode' | 'kecamatan'>, sekarang: Date) {
  return desaDiKabupaten(db, kabupatenKode)
    .filter((d) => c.kecamatan === null || d.kecamatan.kode === c.kecamatan)
    .map((desa) => ({ desa, h: hasilDesaPeriode(db, desa, c.periode, sekarang) }))
}

/** Papan satu kategori untuk satu periode: hanya desa di `kabupatenKode`, atau satu kecamatannya bila `kecamatan` diisi. */
export function papanKabupaten(db: DbDemo, kabupatenKode: string, c: CakupanPapan, sekarang: Date): Papan {
  return susunPapan(hasilDesaKabupaten(db, kabupatenKode, c, sekarang), c, sekarang)
}

/** Podium semua kategori desa bulan itu, untuk Laporan bulanan dan 7C-2. Kategori tanpa pemenang berisi daftar kosong. */
export function podiumKabupaten(db: DbDemo, kabupatenKode: string, p: Periode, sekarang: Date): PodiumLaporan {
  const hasil = hasilDesaKabupaten(db, kabupatenKode, { periode: p, kecamatan: null }, sekarang)
  return KATEGORI_DESA.map((kategori) => {
    const papan = susunPapan(hasil, { musim: p.musim, periode: p, kategori, kecamatan: null }, sekarang)
    const juara = podium(papan.peringkat.map((b) => ({ item: b, peringkat: b.peringkat, bersama: b.bersama, nilai: b.ukuran })))
    return { kategori, juara: juara.map((j) => ({ peringkat: j.peringkat, bersama: j.bersama, nama: j.item.desa.nama, kecamatan: j.item.desa.kecamatan, nilai: j.nilai })) }
  })
}

export type PeringkatKabupaten = {
  kabupaten: { kode: string; nama: string }
  desaBerIndeks: number
  /** Median Indeks desa ber-Indeks; null bila kurang dari 3 desa ber-Indeks. */
  umum: number | null
  /** Persen desa yang sudah bergabung dari jumlah desa resmi kabupaten; null bila jumlah desa resmi tidak diketahui. */
  merata: number | null
}

const SYARAT_DESA_KABUPATEN = 3

/** Nilai semua kabupaten yang punya desa di DB (mitra maupun bukan) pada periode `p`, untuk peringkat se-provinsi. */
export function peringkatProvinsi(db: DbDemo, provinsiKode: string, p: Periode, sekarang: Date): PeringkatKabupaten[] {
  const kabupaten = new Map<string, { kode: string; nama: string }>()
  for (const d of db.desa) if (d.provinsi.kode === provinsiKode && !kabupaten.has(d.kabupaten.kode)) kabupaten.set(d.kabupaten.kode, { kode: d.kabupaten.kode, nama: d.kabupaten.nama })
  const akhirPeriode = akhirBulan(bulanPeriode(p).at(-1)!)
  return [...kabupaten.values()]
    .sort(urutNama)
    .map((kab) => {
      const desa = desaDiKabupaten(db, kab.kode)
      const indeks = desa.flatMap((d) => {
        const h = hasilDesaPeriode(db, d, p, sekarang)
        return h.indeks === null ? [] : [h.indeks]
      })
      const bergabung = desa.filter((d) => (d.status === 'Aktif' || d.status === 'Uji coba') && bergabungPada(db, d, akhirPeriode)).length
      const resmi = JUMLAH_DESA_KABUPATEN[kab.kode] ?? desa.length
      return {
        kabupaten: kab,
        desaBerIndeks: indeks.length,
        umum: indeks.length >= SYARAT_DESA_KABUPATEN ? bulat1(median(indeks)!) : null,
        merata: resmi > 0 ? bulat1(Math.min(100, (bergabung / resmi) * 100)) : null,
      }
    })
}

const SYARAT_KABUPATEN = 3

/** Posisi kabupaten sesi dan podium satu kategori kabupaten; kabupaten lain di luar podium tidak dikirim. */
export function kategoriProvinsi(kategori: KategoriKabupaten, semua: readonly PeringkatKabupaten[], kodeSaya: string): PapanIndeks['provinsi']['kategori'][number] {
  const nilai = (k: PeringkatKabupaten) => (kategori === 'umum' ? k.umum : k.merata)
  const layak = semua.filter((k) => nilai(k) !== null).sort((a, b) => nilai(b)! - nilai(a)! || a.kabupaten.nama.localeCompare(b.kabupaten.nama, 'id'))
  const peringkat = layak.map((k) => ({
    k,
    peringkat: layak.findIndex((x) => nilai(x) === nilai(k)) + 1,
    bersama: layak.filter((x) => nilai(x) === nilai(k)).length > 1,
  }))
  const saya = peringkat.find((p) => p.k.kabupaten.kode === kodeSaya)
  const sayaMentah = semua.find((k) => k.kabupaten.kode === kodeSaya)
  return {
    kategori,
    posisi: saya ? { peringkat: saya.peringkat, bersama: saya.bersama, dari: layak.length, nilai: nilai(saya.k)! } : null,
    alasan: saya ? null : kategori === 'umum' ? `${sayaMentah?.desaBerIndeks ?? 0} dari ${SYARAT_KABUPATEN} desa ber-Indeks` : 'Jumlah desa resmi kabupaten belum diketahui',
    podium: peringkat.filter((p) => p.peringkat <= 3).map((p) => ({ peringkat: p.peringkat, bersama: p.bersama, kabupaten: p.k.kabupaten, nilai: nilai(p.k)! })),
  }
}


/** Ringkasan Indeks bulan terakhir tutup untuk Beranda dasbor kabupaten (SPEC-V0.2 §8.3 butir 1). */
export function ringkasIndeksKabupaten(db: DbDemo, kabupatenKode: string, sekarang: Date): RingkasIndeks {
  const p = periodeTerakhirTutup('bulanan', sekarang)
  const desa = desaDiKabupaten(db, kabupatenKode)
  const hasil = desa.map((d) => ({ d, h: hasilDesaPeriode(db, d, p, sekarang) }))
  const indeks = hasil.flatMap(({ h }) => (h.indeks === null ? [] : [h.indeks]))
  const sebaran = Object.fromEntries(TINGKATAN.map((t) => [t, hasil.filter(({ h }) => h.tingkatan === t).length])) as Record<Tingkatan, number>
  const provinsi = desa[0]?.provinsi
  const umum = provinsi ? kategoriProvinsi('umum', peringkatProvinsi(db, provinsi.kode, p, sekarang), kabupatenKode) : null
  return {
    periode: { kode: p.kode, label: labelPeriode(p) },
    rataRata: indeks.length > 0 ? bulat1(indeks.reduce((n, x) => n + x, 0) / indeks.length) : null,
    sebaran,
    tanpaIndeks: hasil.filter(({ d, h }) => (d.status === 'Aktif' || d.status === 'Uji coba') && h.indeks === null).length,
    posisiProvinsi: umum?.posisi && provinsi ? { peringkat: umum.posisi.peringkat, dari: umum.posisi.dari, provinsi: provinsi.nama } : null,
  }
}

const JAM_MS = 3_600_000
const HARI_MS = 86_400_000
const KARAKTER_KABAR = 300

/** Tanggal "YYYY-MM-DD" Senin pada atau sebelum `tanggal`. */
function seninMingguIni(tanggal: string): string {
  const w = new Date(`${tanggal}T00:00:00Z`)
  return new Date(w.getTime() - ((w.getUTCDay() + 6) % 7) * HARI_MS).toISOString().slice(0, 10)
}

/** Angka mentah dari data desa saat ini untuk saran naik di halaman Peringkat (rencana 7C-2 butir 9). Hanya untuk desa panel. */
export function hitunganSaran(db: DbDemo, desa: Desa, sekarang: Date): HitunganSaran {
  const hariIni = tanggalIsoWib(sekarang)
  const bulan = hariIni.slice(0, 7)
  const panel = ukuranBulanPanel(db, desa, bulan, sekarang)
  const lebihDari = (iso: string, jam: number): boolean => sekarang.getTime() - Date.parse(iso) > jam * JAM_MS
  const permohonan = db.permohonan.filter((p) => p.desaId === desa.id)
  const diajukanTtd = (riwayat: readonly { kejadian: string; waktu: string }[]): string | null => [...riwayat].reverse().find((r) => r.kejadian === 'ajukan-ttd')?.waktu ?? null
  const senin = seninMingguIni(hariIni)
  const kabar = db.artikel.some(
    (a) => a.desaId === desa.id && a.status === 'terbit' && a.isi.join('').length >= KARAKTER_KABAR && tanggalIsoWib(new Date(a.tanggal)) >= senin && tanggalIsoWib(new Date(a.tanggal)) <= hariIni,
  )
  const pengumuman = db.pengumuman.some((p) => p.desaId === desa.id && p.mulai >= senin && p.mulai <= hariIni)
  const klasemen = hasilDesaPeriode(db, desa, periodeBerjalan('bulanan', sekarang), sekarang)
  return {
    suratTtdLama: permohonan.filter((p) => {
      const waktu = p.status === 'perlu-ttd' ? diajukanTtd(p.riwayat) : null
      return waktu !== null && lebihDari(waktu, 48)
    }).length,
    suratMenungguLama: permohonan.filter((p) => p.status === 'menunggu' && lebihDari(p.masukPada, 24)).length,
    pengaduanBaru: db.pengaduan.filter((a) => a.desaId === desa.id && a.status === 'baru').length,
    pendudukBelumLengkap: db.penduduk.filter((p) => p.desaId === desa.id && p.statusDasar === 'Hidup' && dataBelumLengkap(p, sekarang)).length,
    apbdesSinkron: db.apbdes.find((a) => a.desaId === desa.id && a.tahun === Number(bulan.slice(0, 4)))?.sinkronPada ?? null,
    kegiatanTanpaKabar: panel.transparan.kegiatanBerjalan - panel.transparan.kegiatanBerkabar,
    suratMasukBulanIni: panel.digital.masuk,
    persenOnline: panel.digital.masuk > 0 ? (panel.digital.mandiri / panel.digital.masuk) * 100 : 0,
    adaKabarMingguIni: kabar || pengumuman,
    serapan: klasemen.kategori.serapan.ukuran,
  }
}
