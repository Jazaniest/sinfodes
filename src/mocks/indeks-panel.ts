import { tanggalIsoWib } from '@/domain/format/tanggal'
import { dataBelumLengkap } from '@/domain/penduduk/filter'
import { geserBulan } from '@/domain/indeks/periode'
import { akhirBulan } from '@/domain/kabupaten/laporan'
import { bulatJam, median } from '@/domain/kabupaten/pemantauan'
import type { Desa } from '@/domain/wilayah/schema'
import { aktifSepanjang, bulanAwalIndeks, hariSenin } from './indeks-dasar'
import { apbdesDesa, realisasiSampai } from './kabupaten-angka'
import type { DbDemo, UkuranBulanIndeks } from './tipe-db'

const HARI_MS = 86_400_000
const JAM_MS = 3_600_000
const SYARAT_BALASAN = 20
const TEPAT_WAKTU_HARI = 30
const SEGAR_SINKRON_HARI = 35
const MINGGU_AKTIF_KARAKTER = 300

const normalisasi = (teks: string): string => teks.trim().replace(/\s+/g, ' ').toLowerCase()
const tambahHariTanggal = (tanggal: string, hari: number): string => new Date(Date.parse(`${tanggal}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)

/** Desa yang datanya (penduduk, surat, pengaduan, dan seterusnya) ada di DB, bukan hanya rekaman angka. */
export const punyaRekaman = (db: DbDemo, desa: Desa): boolean => db.rekamDesa.some((r) => r.desaId === desa.id)

/**
 * Jejak satu desa dengan data panel untuk satu bulan kalender WIB (keputusan rencana 7C-1 butir 6). Bulan berjalan dihitung
 * sampai `sekarang`. Desa rekaman memakai baris yang sudah dibangkitkan, bukan fungsi ini.
 */
export function ukuranBulanPanel(db: DbDemo, desa: Desa, bulan: string, sekarang: Date): UkuranBulanIndeks {
  const hariIni = tanggalIsoWib(sekarang)
  const awalTanggal = `${bulan}-01`
  const akhirTanggal = akhirBulan(bulan) < hariIni ? akhirBulan(bulan) : hariIni
  const awalMs = Date.parse(`${awalTanggal}T00:00:00+07:00`)
  const batasMs = Math.min(Date.parse(`${geserBulan(bulan, 1)}-01T00:00:00+07:00`) - 1, sekarang.getTime())
  const dalam = (iso: string): boolean => {
    const t = Date.parse(iso)
    return t >= awalMs && t <= batasMs
  }
  const langganan = db.langganan.find((l) => l.desaId === desa.id)
  const aktif = aktifSepanjang(desa, langganan, awalTanggal, akhirTanggal, db.riwayatStatusDesa.filter((r) => r.desaId === desa.id))
  const tayang = desa.status === 'Aktif' || desa.status === 'Uji coba' || desa.status === 'Ditangguhkan'

  // Layanan Tercepat dan Warga Paling Digital.
  const permohonan = db.permohonan.filter((p) => p.desaId === desa.id)
  const selesai = permohonan.flatMap((p) => (p.status === 'selesai' && p.terbit && dalam(p.terbit.pada) ? [(Date.parse(p.terbit.pada) - Date.parse(p.masukPada)) / JAM_MS] : []))
  const masuk = permohonan.filter((p) => dalam(p.masukPada))

  // Paling Responsif: balasan sah = paling sedikit 20 karakter dan bukan salinan balasan desa yang lebih awal.
  const balasanSah = new Set<string>()
  const salinan = new Set<string>()
  const semuaBalasan = db.pengaduan
    .filter((a) => a.desaId === desa.id)
    .flatMap((a) => a.percakapan.flatMap((e) => (e.jenis === 'desa' ? [{ id: e.id, waktu: e.waktu, isi: e.isi }] : [])))
    .sort((a, b) => Date.parse(a.waktu) - Date.parse(b.waktu) || a.id.localeCompare(b.id))
  const sudahAda = new Set<string>()
  for (const b of semuaBalasan) {
    const norm = normalisasi(b.isi)
    if (b.isi.trim().length >= SYARAT_BALASAN && !sudahAda.has(norm)) balasanSah.add(b.id)
    else salinan.add(b.id)
    sudahAda.add(norm)
  }
  const pengaduan = db.pengaduan.filter((a) => a.desaId === desa.id && dalam(a.masukPada))
  const jamBalas = pengaduan.flatMap((a) => {
    const pertama = a.percakapan.find((e) => e.jenis === 'desa' && balasanSah.has(e.id))
    return pertama ? [(Date.parse(pertama.waktu) - Date.parse(a.masukPada)) / JAM_MS] : []
  })

  // Data Terlengkap.
  const hidup = db.penduduk.filter((p) => p.desaId === desa.id && p.statusDasar === 'Hidup')
  const mutasi = db.mutasi.filter((m) => m.desaId === desa.id && dalam(m.dicatatPada))
  const mutasiTepat = mutasi.filter((m) => tanggalIsoWib(new Date(m.dicatatPada)) <= tambahHariTanggal(m.tanggal, TEPAT_WAKTU_HARI))

  // Paling Transparan dan Serapan Dana Desa.
  const tahun = Number(bulan.slice(0, 4))
  const apbdesMentah = db.apbdes.find((a) => a.desaId === desa.id && a.tahun === tahun)
  const apbdes = apbdesDesa(db, desa, tahun)
  const bulanBerjalan = bulan === hariIni.slice(0, 7)
  const realisasiBaru =
    apbdesMentah !== undefined &&
    (apbdesMentah.bulanan.some((b) => b.bulan === bulan && b.belanja > 0) ||
      (bulanBerjalan && sekarang.getTime() - Date.parse(apbdesMentah.sinkronPada) <= SEGAR_SINKRON_HARI * HARI_MS))
  const kegiatanBerjalan = db.kegiatan.filter(
    (k) => k.desaId === desa.id && k.mulai !== null && k.mulai <= akhirTanggal && !k.dokumentasi.some((d) => d.persen === 100 && d.tanggal < awalTanggal),
  )
  const kegiatanBerkabar = kegiatanBerjalan.filter((k) => k.dokumentasi.some((d) => d.tanggal >= awalTanggal && d.tanggal <= akhirTanggal))

  // Website Teraktif: minggu mulai Senin, milik bulan tempat Seninnya jatuh.
  const senin = hariSenin(bulan, hariIni)
  const kabar = db.artikel.filter((a) => a.desaId === desa.id && a.status === 'terbit' && a.isi.join('').length >= MINGGU_AKTIF_KARAKTER)
  const pengumuman = db.pengumuman.filter((p) => p.desaId === desa.id)
  const mingguAktif = senin.filter((hari) => {
    const sampai = tambahHariTanggal(hari, 6)
    return (
      kabar.some((a) => {
        const t = tanggalIsoWib(new Date(a.tanggal))
        return t >= hari && t <= sampai
      }) || pengumuman.some((p) => p.mulai >= hari && p.mulai <= sampai)
    )
  }).length

  return {
    desaId: desa.id,
    bulan,
    aktif,
    layanan: { selesai: selesai.length, medianJam: bulatJam(median(selesai)) },
    responsif: {
      pengaduan: pengaduan.length,
      dibalas: jamBalas.length,
      dibalas72: jamBalas.filter((j) => j <= 72).length,
      medianBalasJam: bulatJam(median(jamBalas)),
    },
    data: {
      diimpor: db.penduduk.some((p) => p.desaId === desa.id),
      kelengkapan: hidup.length > 0 ? hidup.filter((p) => !dataBelumLengkap(p, sekarang)).length / hidup.length : null,
      mutasi: mutasi.length,
      mutasiTepat: mutasiTepat.length,
    },
    transparan: {
      punyaApbdes: apbdes !== null,
      apbdesTerbit: apbdes !== null && tayang,
      realisasiBaru,
      kegiatanBerjalan: kegiatanBerjalan.length,
      kegiatanBerkabar: kegiatanBerkabar.length,
    },
    digital: { masuk: masuk.length, mandiri: masuk.filter((p) => p.kanal === 'online').length },
    website: { tayang, minggu: senin.length, mingguAktif },
    serapan: apbdes ? { pagu: apbdes.anggaran, realisasi: realisasiSampai(apbdes.bulanan, bulan) } : null,
  }
}

export function barisBeku(db: DbDemo, desaId: string, bulan: string): UkuranBulanIndeks | undefined {
  return db.ukuranIndeks.find((u) => u.desaId === desaId && u.bulan === bulan)
}

/**
 * Membekukan baris bulan tutup desa panel yang belum tersimpan, langsung pada `db` (tanpa `ubahDb`): dipakai pembangkit data
 * dan `bekukanBulanTutup`. Mengembalikan banyak baris yang ditambahkan.
 */
export function bekukanPanel(db: DbDemo, sekarang: Date): number {
  const terakhirTutup = geserBulan(tanggalIsoWib(sekarang).slice(0, 7), -1)
  let ditambah = 0
  for (const desa of db.desa) {
    if (punyaRekaman(db, desa)) continue
    for (let b = bulanAwalIndeks(sekarang); b <= terakhirTutup; b = geserBulan(b, 1)) {
      if (barisBeku(db, desa.id, b)) continue
      db.ukuranIndeks.push(ukuranBulanPanel(db, desa, b, sekarang))
      ditambah++
    }
  }
  return ditambah
}
