import { usulanAlamatDesa } from '@/domain/alamat/alamat'
import { daftarBulanTerakhir, tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { daftarMingguTerakhir, labelTriwulan, slugDesa } from '@/domain/konsol/aturan'
import { HARGA_TRIWULAN, type Langganan, type Paket, type PenggunaKonsol, type Tagihan } from '@/domain/konsol/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import { bertitik, wilayahKecamatan } from '@/domain/wilayah/kode-wilayah'
import type { Desa } from '@/domain/wilayah/schema'
import { DESA_KONSOL, DESA_KONSOL_TAMBAHAN, NAMA_KADES, NAMA_OPERATOR, NAMA_SEKDES, PAKET_DESA_DEMO, PENGGUNA_KONSOL_DEMO, type RencanaDesaKonsol } from '../data/desa-konsol'
import type { Acak } from '../prng'
import type { MasukPanel, RekamDesa } from '../tipe-db'
import { belanjaBulananFiktif, komposisiFiktif } from './rekam-kabupaten'

const HARI_MS = 86_400_000
const JAM_LAYANAN = [
  { hari: 'Senin-Kamis', buka: '08.00', tutup: '15.00' },
  { hari: 'Jumat', buka: '08.00', tutup: '11.30' },
]

const tambahHari = (tanggal: string, hari: number) => new Date(Date.parse(`${tanggal}T00:00:00Z`) + hari * HARI_MS).toISOString().slice(0, 10)
const awalTriwulan = (t: string) => `${t.slice(0, 4)}-${String(Math.floor((Number(t.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, '0')}-01`
function tambahBulan(t: string, n: number): string {
  const u = Number(t.slice(0, 4)) * 12 + Number(t.slice(5, 7)) - 1 + n
  return `${Math.floor(u / 12)}-${String((u % 12) + 1).padStart(2, '0')}-01`
}
const akhirTriwulan = (t: string) => tambahHari(tambahBulan(awalTriwulan(t), 3), -1)

/** Tagihan per triwulan dari triwulan `mulai` sampai triwulan `batas`; yang jatuh temponya lewat sudah dibayar, kecuali `menunggak`. */
function tagihanTriwulan(acak: Acak, o: { paket: Paket; mulai: string; batas: string; hariIni: string; nomorDesa: string; menunggak: boolean }): Tagihan[] {
  const daftar: Tagihan[] = []
  for (let q = awalTriwulan(o.mulai); q <= awalTriwulan(o.batas); q = tambahBulan(q, 3)) {
    const jatuhTempo = tambahHari(q, 30)
    daftar.push({
      nomor: `SFD/${q.slice(0, 4)}/T${Math.ceil(Number(q.slice(5, 7)) / 3)}/${o.nomorDesa}`,
      periode: labelTriwulan(q),
      jumlah: HARGA_TRIWULAN[o.paket],
      terbit: q,
      jatuhTempo,
      dibayar: jatuhTempo < o.hariIni ? tambahHari(jatuhTempo, -acak.bulat(2, 20)) : null,
    })
  }
  if (o.menunggak) {
    const terakhirJatuhTempo = daftar.filter((t) => t.jatuhTempo < o.hariIni).at(-1)
    if (terakhirJatuhTempo) terakhirJatuhTempo.dibayar = null
  }
  return daftar
}

function desaFiktif(r: RencanaDesaKonsol, urutan: number): Desa {
  const wilayah = wilayahKecamatan(bertitik(r.kecamatan))
  if (!wilayah) throw new Error(`Kecamatan ${r.kecamatan} tidak ada di tabel wilayah`)
  const slug = slugDesa(r.nama)
  const identitas = r.status !== 'Persiapan' || (r.langkah ?? 0) >= 1
  return {
    id: `desa_${slug.replaceAll('-', '_')}`,
    slug,
    nama: r.nama,
    // Kode fiktif mulai 2051, supaya tidak menyerupai kode desa asli yang dimulai dari 2001.
    kodeDesa: `${wilayah.kecamatan.kode}.${2051 + urutan}`,
    kecamatan: wilayah.kecamatan,
    kabupaten: wilayah.kabupaten,
    provinsi: wilayah.provinsi,
    kodePos: '',
    alamatKantor: identitas ? `Kantor Desa ${r.nama}, Kecamatan ${wilayah.kecamatan.nama}` : '',
    surel: identitas ? `pemdes@${slug.replaceAll('-', '')}.desa.id` : '',
    telepon: '',
    jamLayanan: identitas ? JAM_LAYANAN.map((j) => ({ ...j })) : [],
    luasKm2: null,
    batas: null,
    istilahWilayah: { dusun: 'Dusun', rw: 'RW', rt: 'RT' },
    kodeSurat: r.nama
      .split(' ')
      .map((k) => k[0])
      .join('')
      .toUpperCase(),
    status: r.status,
  }
}

/** Rentang pemakaian desa: sejak kapan desa memakai Sinfodes sampai aktivitas terakhirnya; null bila belum memakai. */
function rentangPakai(acak: Acak, r: RencanaDesaKonsol, acuan: Date): { mulai: number; akhir: number } | null {
  const akhir = acuan.getTime() - r.diam * HARI_MS
  if (r.status === 'Persiapan') return null
  if (r.status === 'Uji coba') return { mulai: acuan.getTime() - Math.max(r.diam + 10, acak.bulat(25, 55)) * HARI_MS, akhir }
  return { mulai: acuan.getTime() - acak.bulat(400, 900) * HARI_MS, akhir }
}

type AngkaPemantauanRekam = Pick<RekamDesa, 'waktuLayananJam' | 'waktuTanggapanJam' | 'apbdes'>
/** Rekaman tanpa angka Pemantauan dan tanpa Sekretaris Desa; keduanya dari aliran acaknya sendiri (tahap 6B dan 6C). */
type RekamDasar = Omit<RekamDesa, keyof AngkaPemantauanRekam | 'kontak' | 'belanjaBulanan' | 'komposisi'> & { kontak: Omit<RekamDesa['kontak'], 'sekdes'> }

function rekamDesa(acak: Acak, r: RencanaDesaKonsol, desa: Desa, acuan: Date): RekamDasar {
  const hariIni = tanggalIsoWib(acuan)
  const pakai = rentangPakai(acak, r, acuan)
  const langkahSelesai = r.status === 'Persiapan' ? (r.langkah ?? 0) : 5
  const punyaPenduduk = langkahSelesai >= 3
  const dalamRentang = (dari: number, sampai: number) => pakai !== null && sampai >= pakai.mulai && dari <= pakai.akhir
  const dasarSurat = r.status === 'Uji coba' ? acak.bulat(6, 20) : acak.bulat(25, 75)
  const suratPerBulan = daftarBulanTerakhir(acuan, 12)
    .reverse()
    .map((bulan) => {
      const awal = Date.parse(`${bulan}-01T00:00:00+07:00`)
      const akhir = Date.parse(`${tambahBulan(`${bulan}-01`, 1)}T00:00:00+07:00`) - 1
      if (!dalamRentang(awal, akhir)) return { bulan, jumlah: 0 }
      const penuh = Math.max(1, Math.round(dasarSurat * (0.75 + acak.angka() * 0.5)))
      // Bulan berjalan baru terisi sebagian.
      return { bulan, jumlah: bulan === hariIni.slice(0, 7) ? Math.round((penuh * Number(hariIni.slice(8, 10))) / 30) : penuh }
    })
  const masukPerMinggu = daftarMingguTerakhir(acuan, 12).map((mulai) => {
    const awal = Date.parse(`${mulai}T00:00:00+07:00`)
    const akhir = awal + 7 * HARI_MS - 1
    if (r.status === 'Persiapan') {
      const terakhir = acuan.getTime() - r.diam * HARI_MS
      return { mulai, jumlah: awal <= terakhir && akhir >= acuan.getTime() - 56 * HARI_MS ? acak.bulat(1, 3) : 0 }
    }
    if (!dalamRentang(awal, akhir)) return { mulai, jumlah: 0 }
    return { mulai, jumlah: r.status === 'Uji coba' ? acak.bulat(3, 12) : acak.bulat(8, 35) }
  })
  const aktifSepekan = pakai !== null && pakai.akhir >= acuan.getTime() - 7 * HARI_MS
  const bulanLalu = suratPerBulan.at(-2)?.jumlah ?? 0
  const slug = desa.slug.replaceAll('-', '')
  return {
    desaId: desa.id,
    jiwa: punyaPenduduk ? acak.bulat(650, 4200) : 0,
    kelengkapan: punyaPenduduk ? Math.round((r.status === 'Persiapan' ? 0.55 + acak.angka() * 0.25 : 0.82 + acak.angka() * 0.17) * 1000) / 1000 : null,
    penggunaAktif: r.diam > 30 ? 0 : r.status === 'Aktif' ? acak.bulat(3, 8) : r.status === 'Uji coba' ? acak.bulat(2, 4) : langkahSelesai >= 4 ? 2 : 1,
    aktivitasTerakhir: waktuIsoWib(new Date(acuan.getTime() - r.diam * HARI_MS - acak.bulat(1, 6) * 3_600_000)),
    langkahSelesai,
    suratPerBulan,
    masukPerMinggu,
    suratMingguIni: aktifSepekan ? Math.round(bulanLalu / 4.3) : 0,
    kontak: {
      kades: langkahSelesai >= 1 ? acak.pilih(NAMA_KADES) : null,
      operator: { nama: acak.pilih(NAMA_OPERATOR), email: `operator@${slug}.desa.id` },
    },
  }
}

function langgananDesa(acak: Acak, o: { desa: Desa; paket: Paket; rencana: RencanaDesaKonsol | null; acuan: Date; nomorDesa: string }): Langganan {
  const hariIni = tanggalIsoWib(o.acuan)
  const dasar = { desaId: o.desa.id, paket: o.paket }
  const diam = o.rencana?.diam ?? 0
  switch (o.desa.status) {
    case 'Persiapan':
      return { ...dasar, mulai: null, sampai: null, tagihan: [] }
    case 'Uji coba': {
      const mulai = tambahHari(hariIni, -Math.max(diam + 10, acak.bulat(25, 55)))
      return { ...dasar, mulai, sampai: tambahHari(mulai, 60), tagihan: [] }
    }
    case 'Ditangguhkan': {
      const mulai = awalTriwulan(tambahHari(hariIni, -700))
      const sampai = akhirTriwulan(tambahHari(hariIni, -diam - 40))
      return { ...dasar, mulai, sampai, tagihan: tagihanTriwulan(acak, { paket: o.paket, mulai, batas: sampai, hariIni, nomorDesa: o.nomorDesa, menunggak: false }) }
    }
    case 'Aktif': {
      const mulai = awalTriwulan(tambahHari(hariIni, -acak.bulat(200, 900)))
      return {
        ...dasar,
        mulai,
        sampai: akhirTriwulan(hariIni),
        tagihan: tagihanTriwulan(acak, { paket: o.paket, mulai, batas: hariIni, hariIni, nomorDesa: o.nomorDesa, menunggak: o.rencana?.menunggak === true }),
      }
    }
  }
}

const satuDesimal = (n: number) => Math.round(n * 10) / 10

/**
 * Angka Pemantauan wilayah desa fiktif (SPEC §11). Desa Persiapan belum memakai layanan, dan desa Ditangguhkan berhenti
 * memakainya, jadi keduanya kosong. Desa yang diam 30 hari atau lebih tidak punya surat 30 hari terakhir.
 */
export function angkaPemantauanFiktif(acak: Acak, r: RencanaDesaKonsol): AngkaPemantauanRekam {
  if (r.status === 'Persiapan' || r.status === 'Ditangguhkan') return { waktuLayananJam: null, waktuTanggapanJam: null, apbdes: null }
  const ujiCoba = r.status === 'Uji coba'
  const anggaran = acak.bulat(900, 2600) * 1_000_000
  return {
    waktuLayananJam: r.diam < 30 ? satuDesimal(ujiCoba ? 30 + acak.angka() * 90 : 18 + acak.angka() * 54) : null,
    waktuTanggapanJam: acak.peluang(0.15) ? null : satuDesimal(ujiCoba ? 12 + acak.angka() * 108 : 4 + acak.angka() * 68),
    apbdes: { anggaran, realisasi: Math.round(anggaran * (ujiCoba ? 0.45 + acak.angka() * 0.3 : 0.55 + acak.angka() * 0.3)) },
  }
}

/**
 * Sekretaris Desa desa fiktif (tahap 6C). Desa Persiapan yang belum sampai langkah Tambah pengguna baru punya akun admin
 * pertamanya, jadi belum punya Sekretaris Desa.
 */
export function sekdesFiktif(acak: Acak, desa: Desa, langkahSelesai: number): RekamDesa['kontak']['sekdes'] {
  if (desa.status === 'Persiapan' && langkahSelesai < 4) return null
  return { nama: acak.pilih(NAMA_SEKDES), email: `sekdes@${desa.slug.replaceAll('-', '')}.desa.id` }
}

/**
 * Data Konsol (SPEC §11, §12.8): 38 desa fiktif (45 dengan tujuh desa tambahan 7C-1) dengan angka pemakaiannya, langganan dan tagihan semua desa, dan akun konsol.
 * `desaPanel` adalah desa yang punya data panel (Sungai Sialang, Tanjung Lamo); angkanya dihitung langsung, bukan dari sini.
 */
export function bangkitkanKonsol(
  acak: Acak,
  o: { acuan: Date; desaPanel: readonly Desa[]; acakPemantauan: Acak; acakKontak: Acak; acakBelanja: Acak; acakKomposisi: Acak; acakTambahan?: Acak },
): { desa: Desa[]; rekam: RekamDesa[]; langganan: Langganan[]; penggunaKonsol: PenggunaKonsol[] } {
  // Alamat subdomain (SPEC-V0.2 §4.2) dibagikan berurutan setelah desa panel; ID tetap dari slug v0.1 supaya stabil.
  const terpakai = new Set(o.desaPanel.map((d) => d.slug))
  // Desa tambahan (7C-1) diproses setelah 38 desa lama dan memakai aliran acaknya sendiri; tanpa `acakTambahan` tidak ada.
  const rencana: readonly RencanaDesaKonsol[] = o.acakTambahan ? [...DESA_KONSOL, ...DESA_KONSOL_TAMBAHAN] : DESA_KONSOL
  const acakDesa = (i: number, lama: Acak): Acak => (i < DESA_KONSOL.length ? lama : o.acakTambahan!)
  const desa = rencana.map((r, i) => {
    const d = desaFiktif(r, i)
    const slug = usulanAlamatDesa({ nama: d.nama, kecamatan: d.kecamatan.nama, kabupaten: d.kabupaten.nama }, terpakai)
    if (!slug) throw new Error(`Alamat untuk desa ${d.nama} habis`)
    terpakai.add(slug)
    return { ...d, slug }
  })
  const nomor = (i: number) => String(i + 1).padStart(3, '0')
  const langganan = [
    ...o.desaPanel.map((d, i) => langgananDesa(acak, { desa: d, paket: PAKET_DESA_DEMO[d.id] ?? 'Dasar', rencana: null, acuan: o.acuan, nomorDesa: nomor(i) })),
    ...rencana.map((r, i) =>
      langgananDesa(acakDesa(i, acak), { desa: desa[i], paket: r.paket, rencana: r, acuan: o.acuan, nomorDesa: nomor(o.desaPanel.length + i) }),
    ),
  ]
  return {
    desa,
    // Aliran acak terpisah: angka Pemantauan (6B), Sekretaris Desa (6C), belanja bulanan dan komposisi (7B-2) tidak menggeser angka lain.
    rekam: rencana.map((r, i) => {
      const dasar = rekamDesa(acakDesa(i, acak), r, desa[i], o.acuan)
      const pemantauan = angkaPemantauanFiktif(acakDesa(i, o.acakPemantauan), r)
      return {
        ...dasar,
        ...pemantauan,
        kontak: { ...dasar.kontak, sekdes: sekdesFiktif(acakDesa(i, o.acakKontak), desa[i], dasar.langkahSelesai) },
        belanjaBulanan: belanjaBulananFiktif(acakDesa(i, o.acakBelanja), pemantauan.apbdes, o.acuan),
        komposisi: komposisiFiktif(acakDesa(i, o.acakKomposisi), dasar.jiwa, r.status),
      }
    }),
    langganan,
    penggunaKonsol: PENGGUNA_KONSOL_DEMO.map((p) => structuredClone(p)),
  }
}

/** Peluang masuk per hari kerja menurut peran: operator paling sering, Kepala Desa dan Kaur Keuangan lebih jarang. */
const PELUANG_MASUK: Readonly<Record<Pengguna['peran'], number>> = { operator: 0.8, sekdes: 0.6, kades: 0.4, 'kaur-keuangan': 0.3, kadus: 0.35 }

/** Riwayat masuk panel 12 minggu ke belakang (tanpa hari ini dan Minggu) untuk akun desa yang punya data panel. */
export function bangkitkanRiwayatMasuk(acak: Acak, o: { pengguna: readonly Pengguna[]; acuan: Date }): MasukPanel[] {
  const hasil: MasukPanel[] = []
  const hariIni = tanggalIsoWib(o.acuan)
  for (let mundur = 84; mundur >= 1; mundur--) {
    const tanggal = tambahHari(hariIni, -mundur)
    if (new Date(`${tanggal}T00:00:00Z`).getUTCDay() === 0) continue
    for (const p of o.pengguna) {
      if (!p.aktif || !acak.peluang(PELUANG_MASUK[p.peran])) continue
      const menit = acak.bulat(7 * 60 + 30, 10 * 60 + 30)
      const jam = `${String(Math.floor(menit / 60)).padStart(2, '0')}:${String(menit % 60).padStart(2, '0')}`
      hasil.push({ penggunaId: p.id, desaId: p.desaId, waktu: `${tanggal}T${jam}:00+07:00` })
    }
  }
  return hasil
}
