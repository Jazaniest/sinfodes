import { formatAngka } from '../format/angka'
import { pad2, tanggalValid } from '../format/kalender'
import { angkaRomawi } from '../format/romawi'
import { hitungUmur, tanggalIsoWib } from '../format/tanggal'
import {
  AGAMA, GOLONGAN_DARAH, HUBUNGAN_KELUARGA, PEKERJAAN, PENDIDIKAN, STATUS_PERKAWINAN, type JenisKelamin,
} from '../penduduk/enum'
import type { Biodata } from '../penduduk/masukan'
import { kelompokkanNik, periksaNik } from '../penduduk/nik'
import { selisihDenganNik } from '../penduduk/selisih-nik'
import { namaDusun } from '../wilayah/alamat'
import type { Desa, Dusun } from '../wilayah/schema'
import { FIELD_IMPOR_WAJIB, LABEL_FIELD_IMPOR, type FieldImpor, type Pemetaan } from './kolom'
import type { LaporanImpor } from './schema'

/** Jenis masalah, dalam urutan penyebutan di ringkasan. */
export const MASALAH_IMPOR = [
  'isian-kosong', 'nik-format', 'nik-ganda-berkas', 'nik-ganda-data', 'tanggal-tidak-valid', 'hubungan-tidak-valid',
  'nomor-kk-format', 'kk-terdaftar', 'kk-kepala', 'wilayah-tidak-dikenal', 'nilai-tidak-dikenal',
] as const
export type JenisMasalah = (typeof MASALAH_IMPOR)[number]

export const LABEL_MASALAH: Readonly<Record<JenisMasalah, string>> = {
  'isian-kosong': 'isian wajib kosong',
  'nik-format': 'NIK tidak valid',
  'nik-ganda-berkas': 'NIK ganda di berkas',
  'nik-ganda-data': 'NIK sudah terdaftar',
  'tanggal-tidak-valid': 'tanggal tidak valid',
  'hubungan-tidak-valid': 'hubungan keluarga tidak valid',
  'nomor-kk-format': 'nomor KK tidak valid',
  'kk-terdaftar': 'nomor KK sudah terdaftar',
  'kk-kepala': 'kepala keluarga tidak tepat',
  'wilayah-tidak-dikenal': 'wilayah tidak dikenal',
  'nilai-tidak-dikenal': 'isian tidak dikenal',
}

export type Masalah = { jenis: JenisMasalah; field: FieldImpor; pesan: string }
export type NilaiBaris = Partial<Record<FieldImpor, string>>
export type Wilayah = { dusunId: string; rw: string; rt: string }
/** Baris yang lolos pemeriksaan, siap dibuat sebagai penduduk. */
export type BarisSiap = { nomor: number; biodata: Biodata; nomorKk: string; wilayah: Wilayah }
export type HasilBaris = {
  nomor: number
  nilai: NilaiBaris
  masalah: Masalah[]
  /** Tidak menghalangi impor, mis. tanggal lahir berbeda dengan NIK. */
  peringatan: string[]
  dilewati: boolean
  siap: BarisSiap | null
}
export type HasilPeriksa = {
  baris: HasilBaris[]
  siap: number
  bermasalah: number
  dilewati: number
  /** Jumlah baris per jenis masalah (satu baris bisa punya beberapa jenis). */
  perJenis: Partial<Record<JenisMasalah, number>>
}
export type PilihanImpor = {
  pemetaan: Pemetaan
  /** Kunci: nomor baris sebagai teks. */
  perbaikan: Readonly<Record<string, NilaiBaris>>
  lewati: readonly number[]
}
export type KonteksImpor = { hariIni: Date; dusun: readonly Dusun[]; istilah: Desa['istilahWilayah'] }

const normal = (teks: string) => teks.toLowerCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim()
const angkaSaja = (teks: string) => teks.replace(/[\s.-]/g, '')

/** Nilai enum tanpa peduli huruf besar-kecil dan spasi di sekitar garis miring ("slta / sederajat"). */
export function cocokEnum<T extends string>(daftar: readonly T[], teks: string): T | null {
  const n = normal(teks)
  return daftar.find((d) => normal(d) === n) ?? null
}

/** "12/03/1991", "12-3-1991", atau "1991-03-12" → "1991-03-12"; tanggal mustahil → null. */
export function bacaTanggal(teks: string): string | null {
  const t = teks.trim()
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  const bagian = dmy ? [dmy[3], dmy[2], dmy[1]] : ymd ? [ymd[1], ymd[2], ymd[3]] : null
  if (!bagian) return null
  const [tahun, bulan, hari] = bagian.map(Number)
  return tanggalValid(tahun, bulan, hari) ? `${tahun}-${pad2(bulan)}-${pad2(hari)}` : null
}

export function bacaJenisKelamin(teks: string): JenisKelamin | null {
  const n = normal(teks)
  if (['l', 'lk', 'laki-laki', 'laki laki', 'pria'].includes(n)) return 'L'
  if (['p', 'pr', 'perempuan', 'wanita'].includes(n)) return 'P'
  return null
}

/** Dusun boleh ditulis "3", "III", "Dusun III", "Teluk Rengas", atau lengkap; RT/RW "12" dibaca "012". */
export function bacaWilayah(nilai: NilaiBaris, dusun: readonly Dusun[], istilah: Desa['istilahWilayah']): Wilayah | null {
  const n = normal(nilai.dusun ?? '')
  const awalan = istilah.dusun.toLowerCase()
  const d = dusun.find((x) => {
    const romawi = angkaRomawi(x.nomor).toLowerCase()
    return [String(x.nomor), romawi, `${awalan} ${x.nomor}`, `${awalan} ${romawi}`, normal(x.nama), normal(namaDusun(x, istilah))].includes(n)
  })
  const rw = (nilai.rw ?? '').trim().padStart(3, '0')
  const rt = (nilai.rt ?? '').trim().padStart(3, '0')
  if (!d || !/^\d{3}$/.test(rw) || !/^\d{3}$/.test(rt)) return null
  return d.rw.some((w) => w.nomor === rw && w.rt.some((x) => x.nomor === rt)) ? { dusunId: d.id, rw, rt } : null
}

/** Nilai satu baris menurut pemetaan kolom, ditimpa perbaikan dari pengguna. */
export function nilaiBaris(sel: readonly string[], pemetaan: Pemetaan, perbaikan: NilaiBaris = {}): NilaiBaris {
  const nilai: NilaiBaris = {}
  pemetaan.forEach((field, i) => {
    if (field) nilai[field] = (sel[i] ?? '').trim()
  })
  return { ...nilai, ...perbaikan }
}

type KonteksBaris = KonteksImpor & {
  nikTerdaftar: ReadonlySet<string>
  kkTerdaftar: ReadonlySet<string>
  /** NIK yang sudah dipakai baris sebelumnya → nomor baris itu. */
  nikDipakai: Map<string, number>
}

function periksaBaris(nomor: number, nilai: NilaiBaris, ctx: KonteksBaris): Pick<HasilBaris, 'masalah' | 'peringatan' | 'siap'> {
  const masalah: Masalah[] = []
  const peringatan: string[] = []
  const salah = (jenis: JenisMasalah, field: FieldImpor, pesan: string) => masalah.push({ jenis, field, pesan })
  const teks = (f: FieldImpor) => nilai[f]?.trim() ?? ''
  /** Nilai pilihan (agama, pendidikan, …); kosong boleh, isi yang tidak dikenal menjadi masalah. */
  const pilihan = <T extends string>(f: FieldImpor, daftar: readonly T[]): T | null => {
    if (teks(f) === '') return null
    const hasil = cocokEnum(daftar, teks(f))
    if (!hasil) salah('nilai-tidak-dikenal', f, `${LABEL_FIELD_IMPOR[f]} “${teks(f)}” tidak dikenal`)
    return hasil
  }

  for (const f of FIELD_IMPOR_WAJIB) if (teks(f) === '') salah('isian-kosong', f, `${LABEL_FIELD_IMPOR[f]} kosong`)

  const jenisKelamin = teks('jenisKelamin') === '' ? null : bacaJenisKelamin(teks('jenisKelamin'))
  if (teks('jenisKelamin') !== '' && !jenisKelamin) salah('nilai-tidak-dikenal', 'jenisKelamin', 'Jenis kelamin ditulis L atau P')

  const hariIni = tanggalIsoWib(ctx.hariIni)
  const tanggalTerbaca = teks('tanggalLahir') === '' ? null : bacaTanggal(teks('tanggalLahir'))
  const tanggalLahir = tanggalTerbaca && tanggalTerbaca <= hariIni ? tanggalTerbaca : null
  if (teks('tanggalLahir') !== '' && !tanggalLahir) {
    salah('tanggal-tidak-valid', 'tanggalLahir', `Tanggal lahir “${teks('tanggalLahir')}” tidak valid`)
  }

  const nik = angkaSaja(teks('nik'))
  if (nik !== '') {
    const hasil = periksaNik(nik, ctx.hariIni)
    if (!/^\d{16}$/.test(nik)) salah('nik-format', 'nik', `NIK harus 16 angka (tertulis ${nik.replace(/\D/g, '').length})`)
    else if (hasil.status !== 'valid') salah('nik-format', 'nik', hasil.status === 'kosong' ? 'NIK kosong' : hasil.pesan)
    else if (ctx.nikTerdaftar.has(nik)) salah('nik-ganda-data', 'nik', 'NIK sudah terdaftar di Sinfodes')
    else if (ctx.nikDipakai.has(nik)) salah('nik-ganda-berkas', 'nik', `NIK sama dengan baris ${ctx.nikDipakai.get(nik)}`)
    else {
      ctx.nikDipakai.set(nik, nomor)
      if (jenisKelamin && tanggalLahir) peringatan.push(...selisihDenganNik(hasil, { jenisKelamin, tanggalLahir }))
    }
  }

  const hubungan = teks('hubunganKeluarga') === '' ? null : cocokEnum(HUBUNGAN_KELUARGA, teks('hubunganKeluarga'))
  if (teks('hubunganKeluarga') !== '' && !hubungan) {
    salah('hubungan-tidak-valid', 'hubunganKeluarga', `Hubungan “${teks('hubunganKeluarga')}” tidak dikenal`)
  }

  const nomorKk = angkaSaja(teks('nomorKk'))
  if (nomorKk !== '' && !/^\d{16}$/.test(nomorKk)) salah('nomor-kk-format', 'nomorKk', 'Nomor KK harus 16 angka')
  else if (nomorKk !== '' && ctx.kkTerdaftar.has(nomorKk)) {
    salah('kk-terdaftar', 'nomorKk', 'Nomor KK sudah terdaftar. Tambahkan anggotanya lewat halaman KK.')
  }

  const wilayah = teks('dusun') === '' ? null : bacaWilayah(nilai, ctx.dusun, ctx.istilah)
  if (teks('dusun') !== '' && !wilayah) {
    salah(
      'wilayah-tidak-dikenal', 'dusun',
      `${ctx.istilah.dusun} “${teks('dusun')}” ${ctx.istilah.rt} ${teks('rt')}/${ctx.istilah.rw} ${teks('rw')} tidak ada di desa ini`,
    )
  }

  const agama = pilihan('agama', AGAMA)
  const pendidikan = pilihan('pendidikan', PENDIDIKAN)
  const pekerjaan = pilihan('pekerjaan', PEKERJAAN)
  const statusPerkawinan = pilihan('statusPerkawinan', STATUS_PERKAWINAN)
  const golonganDarah = pilihan('golonganDarah', GOLONGAN_DARAH)
  const telepon = teks('telepon').replace(/[\s-]/g, '')
  if (telepon !== '' && !/^08\d{8,11}$/.test(telepon)) salah('nilai-tidak-dikenal', 'telepon', 'Nomor telepon diawali 08, 10–13 angka')

  if (masalah.length > 0 || !jenisKelamin || !tanggalLahir || !agama || !hubungan || !wilayah) {
    return { masalah, peringatan, siap: null }
  }
  return {
    masalah,
    peringatan,
    siap: {
      nomor,
      nomorKk,
      wilayah,
      biodata: {
        nik, nama: teks('nama'), jenisKelamin, golonganDarah: golonganDarah ?? 'Tidak Tahu', agama, kewarganegaraan: 'WNI',
        tempatLahir: teks('tempatLahir'), tanggalLahir, nomorAktaLahir: null, hubunganKeluarga: hubungan,
        namaAyah: teks('namaAyah'), namaIbu: teks('namaIbu'), pendidikan, pekerjaan, statusPerkawinan, statusPenduduk: 'Tetap',
        // Sama dengan alur Datang: penduduk dewasa dianggap sudah merekam KTP-el; datanya bisa diperbaiki lewat Ubah.
        ktpEl: hitungUmur(tanggalLahir, ctx.hariIni).tahun >= 17 ? 'Sudah rekam' : 'Belum wajib',
        telepon: telepon === '' ? null : telepon, catatan: null,
      },
    },
  }
}

/** Setiap nomor KK di berkas harus punya tepat satu kepala keluarga di antara baris yang tidak dilewati. */
function periksaKepalaKeluarga(baris: HasilBaris[]): void {
  const perKk = new Map<string, HasilBaris[]>()
  for (const b of baris) {
    const nomor = angkaSaja(b.nilai.nomorKk ?? '')
    if (b.dilewati || !/^\d{16}$/.test(nomor)) continue
    perKk.set(nomor, [...(perKk.get(nomor) ?? []), b])
  }
  for (const [nomor, anggota] of perKk) {
    const kepala = anggota.filter((b) => cocokEnum(HUBUNGAN_KELUARGA, b.nilai.hubunganKeluarga ?? '') === 'Kepala Keluarga').length
    if (kepala === 1) continue
    const pesan = kepala === 0
      ? `KK ${kelompokkanNik(nomor)} belum punya kepala keluarga`
      : `KK ${kelompokkanNik(nomor)} punya ${kepala} kepala keluarga`
    for (const b of anggota) {
      b.masalah.push({ jenis: 'kk-kepala', field: 'hubunganKeluarga', pesan })
      b.siap = null
    }
  }
}

/**
 * Periksa seluruh baris berkas (SPEC §6.8). Dipakai layar (langkah Periksa) dan API tiruan (saat konfirmasi), jadi
 * keduanya selalu sepakat. Baris yang dilewati tidak diperiksa dan tidak dihitung untuk NIK ganda maupun kepala KK.
 */
export function periksaImpor(laporan: LaporanImpor, pilihan: PilihanImpor, ctx: KonteksImpor): HasilPeriksa {
  const lewati = new Set(pilihan.lewati)
  const ctxBaris: KonteksBaris = {
    ...ctx, nikTerdaftar: new Set(laporan.nikTerdaftar), kkTerdaftar: new Set(laporan.nomorKkTerdaftar), nikDipakai: new Map(),
  }
  const baris = laporan.baris.map((b): HasilBaris => {
    const nilai = nilaiBaris(b.sel, pilihan.pemetaan, pilihan.perbaikan[String(b.nomor)])
    if (lewati.has(b.nomor)) return { nomor: b.nomor, nilai, masalah: [], peringatan: [], dilewati: true, siap: null }
    return { nomor: b.nomor, nilai, dilewati: false, ...periksaBaris(b.nomor, nilai, ctxBaris) }
  })
  periksaKepalaKeluarga(baris)
  const perJenis: Partial<Record<JenisMasalah, number>> = {}
  for (const b of baris) for (const j of new Set(b.masalah.map((m) => m.jenis))) perJenis[j] = (perJenis[j] ?? 0) + 1
  return {
    baris,
    siap: baris.filter((b) => b.siap !== null).length,
    bermasalah: baris.filter((b) => !b.dilewati && b.masalah.length > 0).length,
    dilewati: baris.filter((b) => b.dilewati).length,
    perJenis,
  }
}

/** "12 siap · 5 bermasalah (1 NIK tidak valid, …) · 2 dilewati" (SPEC §6.8). */
export function kalimatPeriksa(h: HasilPeriksa): string {
  const rincian = MASALAH_IMPOR.flatMap((j) => {
    const n = h.perJenis[j]
    return n ? [`${formatAngka(n)} ${LABEL_MASALAH[j]}`] : []
  })
  return [
    `${formatAngka(h.siap)} siap`,
    ...(h.bermasalah > 0 ? [`${formatAngka(h.bermasalah)} bermasalah (${rincian.join(', ')})`] : []),
    ...(h.dilewati > 0 ? [`${formatAngka(h.dilewati)} dilewati`] : []),
  ].join(' · ')
}
