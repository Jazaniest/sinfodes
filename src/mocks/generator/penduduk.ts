import { hitungUmur, tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { buatNomorKk } from '@/domain/keluarga/nomor-kk'
import type { Keluarga } from '@/domain/keluarga/schema'
import type {
  Agama, GolonganDarah, HubunganKeluarga, JenisKelamin, KtpEl, Pekerjaan, Pendidikan, StatusPerkawinan,
} from '@/domain/penduduk/enum'
import { buatNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Dusun } from '@/domain/wilayah/schema'
import { angkatanDari, MARGA_BATAK, NAMA_DEPAN, type Suku } from '../data/nama'
import type { Acak } from '../prng'
import { PERSONA, type KeluargaPersona } from './persona'

/** SPEC §12.3 */
export const TARGET_PENDUDUK = { jiwa: 2812, laki: 1431, perempuan: 1381, kk: 806 } as const

/** [umur minimal, umur maksimal, persen] — SPEC §12.3. Kelompok 75+ dibangkitkan sampai 92 tahun. */
export const KELOMPOK_UMUR: ReadonlyArray<readonly [number, number, number]> = [
  [0, 4, 7.5], [5, 9, 9.5], [10, 14, 9.5], [15, 19, 9], [20, 24, 7], [25, 29, 7], [30, 34, 7.5], [35, 39, 8],
  [40, 44, 7.5], [45, 49, 7], [50, 54, 6], [55, 59, 5], [60, 64, 4], [65, 69, 2.5], [70, 74, 1.5], [75, 92, 1.5],
]

const KODE_LOKAL = '140509'
const HARI_MS = 86_400_000

type Bobot<T> = ReadonlyArray<readonly [T, number]>
type Asal = { kode: string; kota: string }

const BOBOT_DUSUN: Bobot<number> = [[1, 28], [2, 26], [3, 24], [4, 22]]
const SUKU_PER_DUSUN: Readonly<Record<number, Bobot<Suku>>> = {
  1: [['Melayu', 80], ['Jawa', 8], ['Minang', 7], ['Batak', 3], ['Lainnya', 2]],
  2: [['Melayu', 40], ['Jawa', 45], ['Minang', 7], ['Batak', 6], ['Lainnya', 2]],
  3: [['Melayu', 75], ['Jawa', 10], ['Minang', 8], ['Batak', 5], ['Lainnya', 2]],
  4: [['Melayu', 70], ['Jawa', 15], ['Minang', 8], ['Batak', 5], ['Lainnya', 2]],
}
const AGAMA_PER_SUKU: Readonly<Record<Suku, Bobot<Agama>>> = {
  Melayu: [['Islam', 1]],
  Jawa: [['Islam', 97], ['Kristen', 3]],
  Minang: [['Islam', 1]],
  Batak: [['Kristen', 75], ['Katolik', 15], ['Islam', 10]],
  Lainnya: [['Islam', 45], ['Kristen', 35], ['Katolik', 20]],
}
/** SPEC §12.5 — kode kabupaten nyata (diverifikasi 25 Sep 2026) dengan kecamatan 01-20. */
const ASAL_PER_SUKU: Readonly<Record<Suku, Bobot<Asal>>> = {
  Melayu: [[{ kode: '140107', kota: 'Bangkinang' }, 1]],
  Jawa: [[{ kode: '331007', kota: 'Klaten' }, 55], [{ kode: '330912', kota: 'Boyolali' }, 45]],
  Minang: [[{ kode: '130604', kota: 'Lubuk Basung' }, 1]],
  Batak: [[{ kode: '120203', kota: 'Tarutung' }, 55], [{ kode: '121205', kota: 'Balige' }, 45]],
  Lainnya: [[{ kode: '140107', kota: 'Bangkinang' }, 1]],
}
const PELUANG_PENDATANG: Readonly<Record<Suku, number>> = { Melayu: 0.1, Jawa: 1, Minang: 1, Batak: 1, Lainnya: 0.5 }
const TEMPAT_LAHIR_LOKAL: Bobot<string> = [['Teluk Meranti', 80], ['Pangkalan Kerinci', 15], ['Pekanbaru', 5]]
const GOLONGAN_DARAH_BOBOT: Bobot<GolonganDarah> = [['Tidak Tahu', 40], ['O', 23], ['B', 17], ['A', 15], ['AB', 5]]
const PREFIKS_HP = ['12', '13', '21', '22', '52', '53', '77', '78', '81', '82', '95', '96'] as const

const PENDIDIKAN_MUDA: Bobot<Pendidikan> = [
  ['SLTA/Sederajat', 50], ['SLTP/Sederajat', 20], ['Tamat SD/Sederajat', 10], ['Diploma IV/Strata I', 12],
  ['Akademi/Diploma III/Sarjana Muda', 5], ['Diploma I/II', 3],
]
const PENDIDIKAN_TENGAH: Bobot<Pendidikan> = [
  ['Tamat SD/Sederajat', 30], ['SLTP/Sederajat', 25], ['SLTA/Sederajat', 33], ['Diploma IV/Strata I', 7],
  ['Akademi/Diploma III/Sarjana Muda', 3], ['Diploma I/II', 2],
]
const PENDIDIKAN_TUA: Bobot<Pendidikan> = [
  ['Tidak/Belum Sekolah', 10], ['Belum Tamat SD/Sederajat', 20], ['Tamat SD/Sederajat', 45], ['SLTP/Sederajat', 15],
  ['SLTA/Sederajat', 8], ['Diploma IV/Strata I', 2],
]
const PEKERJAAN_PRIA: Bobot<Pekerjaan> = [
  ['Petani/Pekebun', 38], ['Karyawan Swasta', 12], ['Wiraswasta', 11], ['Nelayan/Perikanan', 10],
  ['Buruh Harian Lepas', 9], ['Buruh Tani/Perkebunan', 4], ['Belum/Tidak Bekerja', 4], ['Pedagang', 3], ['Sopir', 2],
  ['Tukang Kayu', 2], ['Karyawan Honorer', 2], ['Lainnya', 3],
]
const PEKERJAAN_WANITA: Bobot<Pekerjaan> = [
  ['Mengurus Rumah Tangga', 48], ['Petani/Pekebun', 20], ['Pedagang', 6], ['Wiraswasta', 6], ['Belum/Tidak Bekerja', 5],
  ['Karyawan Swasta', 4], ['Buruh Harian Lepas', 3], ['Karyawan Honorer', 3], ['Tukang Jahit', 2], ['Lainnya', 3],
]
const PEKERJAAN_SARJANA_PRIA: Bobot<Pekerjaan> = [['Guru', 40], ['Pegawai Negeri Sipil', 40], ['Karyawan BUMN', 20]]
const PEKERJAAN_SARJANA_WANITA: Bobot<Pekerjaan> = [['Guru', 50], ['Bidan', 20], ['Perawat', 15], ['Pegawai Negeri Sipil', 15]]

type Calon = { umur: number; jk: JenisKelamin }
type Anggota = Calon & { hubungan: HubunganKeluarga }
type Rumah = { kepala: Calon; istri: Calon | null; anggota: Anggota[] }

/** Jumlah orang per kelompok umur dengan metode sisa terbesar (totalnya persis). */
export function hitungJumlahPerKelompok(total: number): number[] {
  const mentah = KELOMPOK_UMUR.map(([, , persen]) => (total * persen) / 100)
  const hasil = mentah.map((m) => Math.floor(m))
  let sisa = total - hasil.reduce((a, b) => a + b, 0)
  const urutan = mentah.map((m, i) => [m - Math.floor(m), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1])
  for (const [, i] of urutan) {
    if (sisa === 0) break
    hasil[i] += 1
    sisa -= 1
  }
  return hasil
}

function indeksKelompok(umur: number): number {
  const i = KELOMPOK_UMUR.findIndex(([min, max]) => umur >= min && umur <= max)
  return i === -1 ? KELOMPOK_UMUR.length - 1 : i
}

function pendidikanUntuk(umur: number, tahunLahir: number, acak: Acak): Pendidikan {
  if (umur <= 6) return 'Tidak/Belum Sekolah'
  if (umur <= 12) return 'Belum Tamat SD/Sederajat'
  if (umur <= 15) return 'Tamat SD/Sederajat'
  if (umur <= 18) return 'SLTP/Sederajat'
  if (tahunLahir >= 1990) return acak.berbobot(PENDIDIKAN_MUDA)
  if (tahunLahir >= 1970) return acak.berbobot(PENDIDIKAN_TENGAH)
  return acak.berbobot(PENDIDIKAN_TUA)
}

function pekerjaanUntuk(umur: number, jk: JenisKelamin, pendidikan: Pendidikan, acak: Acak): Pekerjaan {
  if (umur < 5) return 'Belum/Tidak Bekerja'
  if (umur <= 18) return acak.peluang(0.95) ? 'Pelajar/Mahasiswa' : 'Belum/Tidak Bekerja'
  if (umur <= 22 && acak.peluang(0.35)) return 'Pelajar/Mahasiswa'
  if (umur >= 65) {
    if (acak.peluang(0.5)) return 'Belum/Tidak Bekerja'
    if (acak.peluang(0.1)) return 'Pensiunan'
  }
  const sarjana = pendidikan === 'Diploma IV/Strata I' || pendidikan === 'Akademi/Diploma III/Sarjana Muda'
  if (sarjana && acak.peluang(0.4)) return acak.berbobot(jk === 'P' ? PEKERJAAN_SARJANA_WANITA : PEKERJAAN_SARJANA_PRIA)
  return acak.berbobot(jk === 'P' ? PEKERJAAN_WANITA : PEKERJAAN_PRIA)
}

/** Wajib KTP-el: umur ≥ 17 atau pernah kawin. Tanpa `acak` (persona): selalu sudah rekam. */
function statusKtpEl(umur: number, kawin: StatusPerkawinan, acak: Acak | null): KtpEl {
  if (umur < 17 && kawin === 'Belum Kawin') return 'Belum wajib'
  if (!acak) return 'Sudah rekam'
  const peluangBelum = umur <= 19 ? 0.2 : umur >= 75 ? 0.15 : 0.04
  return acak.peluang(peluangBelum) ? 'Belum rekam' : 'Sudah rekam'
}

/** Kerangka umur, jenis kelamin, dan susunan rumah tangga (lihat "Cara kerja pembangkit" di rencana). */
function buatKerangka(acak: Acak, acuan: Date): Rumah[] {
  const jumlah = hitungJumlahPerKelompok(TARGET_PENDUDUK.jiwa)
  let personaLaki = 0
  for (const k of PERSONA) {
    for (const a of k.anggota) {
      jumlah[indeksKelompok(hitungUmur(a.tanggalLahir, acuan).tahun)] -= 1
      if (a.jenisKelamin === 'L') personaLaki += 1
    }
  }
  const pool: Calon[] = []
  jumlah.forEach((n, i) => {
    const [min, max] = KELOMPOK_UMUR[i]
    for (let k = 0; k < n; k++) pool.push({ umur: acak.bulat(min, max), jk: 'L' })
  })
  const jumlahLaki = TARGET_PENDUDUK.laki - personaLaki
  acak.acakUrutan(pool).forEach((c, i) => {
    c.jk = i < jumlahLaki ? 'L' : 'P'
  })

  // Pasangan suami-istri.
  const targetKk = TARGET_PENDUDUK.kk - PERSONA.length
  const targetPasangan = Math.round(targetKk * 0.84)
  const terpakai = new Set<Calon>()
  const wanitaTersedia = new Set(pool.filter((c) => c.jk === 'P' && c.umur >= 18))
  const rumah: Rumah[] = []
  const peluangMenikah = (u: number) => (u < 25 ? 0.35 : u < 30 ? 0.7 : u < 65 ? 0.93 : 0.8)
  const cariIstri = (suami: Calon): Calon | null => {
    let terbaik: Calon | null = null
    let jarakTerbaik = Infinity
    for (const w of wanitaTersedia) {
      if (w.umur < Math.max(18, suami.umur - 12) || w.umur > suami.umur + 3) continue
      const jarak = Math.abs(w.umur - (suami.umur - 4))
      if (jarak < jarakTerbaik) {
        terbaik = w
        jarakTerbaik = jarak
        if (jarak === 0) break
      }
    }
    return terbaik
  }
  const pria = acak.acakUrutan(pool.filter((c) => c.jk === 'L' && c.umur >= 21))
  for (const putaranKedua of [false, true]) {
    for (const p of pria) {
      if (rumah.length >= targetPasangan) break
      if (terpakai.has(p)) continue
      if (putaranKedua ? p.umur < 25 || p.umur > 70 : !acak.peluang(peluangMenikah(p.umur))) continue
      const istri = cariIstri(p)
      if (!istri) continue
      wanitaTersedia.delete(istri)
      terpakai.add(p).add(istri)
      rumah.push({ kepala: p, istri, anggota: [] })
    }
  }

  // KK tanpa pasangan.
  const sisaDewasa = pool.filter((c) => !terpakai.has(c) && c.umur >= 21)
  const antrean: Bobot<Calon[]> = [
    [acak.acakUrutan(sisaDewasa.filter((c) => c.jk === 'P' && c.umur >= 50)), 55],
    [acak.acakUrutan(sisaDewasa.filter((c) => c.jk === 'L' && c.umur >= 30)), 30],
    [acak.acakUrutan(sisaDewasa.filter((c) => (c.jk === 'P' && c.umur < 50) || (c.jk === 'L' && c.umur < 30))), 15],
  ]
  while (rumah.length < targetKk) {
    const tersedia = antrean.filter(([daftar]) => daftar.length > 0)
    if (tersedia.length === 0) throw new Error(`Gagal membentuk ${targetKk} KK (baru ${rumah.length})`)
    const kepala = acak.berbobot(tersedia).pop()
    if (!kepala) continue
    terpakai.add(kepala)
    rumah.push({ kepala, istri: null, anggota: [] })
  }

  // Sisanya menjadi anggota KK.
  const ibuDari = (r: Rumah) => r.istri ?? (r.kepala.jk === 'P' ? r.kepala : null)
  const ayahDari = (r: Rumah) => (r.kepala.jk === 'L' ? r.kepala : null)
  const jumlahDengan = (r: Rumah, h: HubunganKeluarga) => r.anggota.filter((a) => a.hubungan === h).length
  const ukuran = (r: Rumah) => 1 + (r.istri ? 1 : 0) + r.anggota.length
  for (const c of pool.filter((x) => !terpakai.has(x)).sort((a, b) => b.umur - a.umur)) {
    let tempat: Rumah | null = null
    let hubungan: HubunganKeluarga = 'Famili Lain'
    if (c.umur >= 55) {
      const calon = rumah.filter(
        (r) =>
          r.kepala.umur <= c.umur - 18 && ukuran(r) < 8 && jumlahDengan(r, 'Orang Tua') + jumlahDengan(r, 'Mertua') < 2,
      )
      if (calon.length > 0) {
        tempat = acak.pilih(calon)
        hubungan = tempat.istri && acak.peluang(0.5) ? 'Mertua' : 'Orang Tua'
      }
    }
    if (!tempat) {
      const calon = rumah.filter((r) => {
        const ibu = ibuDari(r)
        const ayah = ayahDari(r)
        if (ibu && (ibu.umur - c.umur < 17 || ibu.umur - c.umur > 44)) return false
        if (ayah && ayah.umur - c.umur < 17) return false
        return jumlahDengan(r, 'Anak') < 7 && ukuran(r) < 10
      })
      if (calon.length > 0) {
        tempat = acak.berbobot(calon.map((r) => [r, 1 / (1 + jumlahDengan(r, 'Anak')) ** 2] as const))
        hubungan = 'Anak'
      }
    }
    if (!tempat) {
      const calon = rumah.filter((r) => r.kepala.umur - c.umur >= 36 && ukuran(r) < 9)
      if (calon.length > 0) {
        tempat = acak.pilih(calon)
        hubungan = 'Cucu'
      }
    }
    if (!tempat) {
      const calon = rumah.filter((r) => ukuran(r) < 8)
      tempat = acak.pilih(calon.length > 0 ? calon : rumah)
      hubungan = 'Famili Lain'
    }
    tempat.anggota.push({ ...c, hubungan })
  }
  return rumah
}

type Opsi = { desaId: string; dusun: readonly Dusun[]; acuan: Date }

const URUTAN_HUBUNGAN: readonly HubunganKeluarga[] = [
  'Kepala Keluarga', 'Istri', 'Anak', 'Menantu', 'Cucu', 'Orang Tua', 'Mertua', 'Famili Lain',
]

/** Membangkitkan seluruh penduduk dan KK satu desa (SPEC §12.3-12.5). Seed + acuan sama → hasil sama. */
export function bangkitkanPenduduk(acak: Acak, opsi: Opsi): { penduduk: Penduduk[]; keluarga: Keluarga[] } {
  const { desaId, dusun, acuan } = opsi
  const rumah = buatKerangka(acak, acuan)
  const hariIniIso = tanggalIsoWib(acuan)
  const msHariIni = Date.parse(`${hariIniIso}T00:00:00Z`)
  const awalKerja = Date.parse(`${hariIniIso}T08:00:00+07:00`)
  const tahunAcuan = Number(hariIniIso.slice(0, 4))
  const nikTerpakai = new Set<string>()
  const urutNik = new Map<string, number>()
  const kkTerpakai = new Set<string>()
  const penduduk: Penduduk[] = []
  const keluarga: Keluarga[] = []

  const dusunDari = (nomor: number): Dusun => {
    const d = dusun.find((x) => x.nomor === nomor)
    if (!d) throw new Error(`Dusun ${nomor} tidak ada`)
    return d
  }
  const nikBaru = (kode: string, lahir: string, jk: JenisKelamin): string => {
    const kunci = `${kode}|${lahir}|${jk}`
    let urut = urutNik.get(kunci) ?? 8001
    for (; ;) {
      const nik = buatNik({ kodeWilayah: kode, tanggalLahir: lahir, jenisKelamin: jk, nomorUrut: urut })
      urut += 1
      if (!nikTerpakai.has(nik)) {
        urutNik.set(kunci, urut)
        nikTerpakai.add(nik)
        return nik
      }
    }
  }
  const kkBaru = (tanggalTerbit: string): string => {
    for (let urut = 8001; ; urut++) {
      const nomor = buatNomorKk({ kodeWilayah: KODE_LOKAL, tanggalTerbit, nomorUrut: urut })
      if (!kkTerpakai.has(nomor)) {
        kkTerpakai.add(nomor)
        return nomor
      }
    }
  }
  const lahirDari = (umur: number): string => {
    const ulangTahun = new Date(msHariIni - acak.bulat(0, 364) * HARI_MS)
    return new Date(Date.UTC(ulangTahun.getUTCFullYear() - umur, ulangTahun.getUTCMonth(), ulangTahun.getUTCDate()))
      .toISOString()
      .slice(0, 10)
  }
  const waktuCatat = () => {
    const hariLalu = acak.bulat(200, 1500)
    const dibuat = awalKerja - hariLalu * HARI_MS + acak.bulat(0, 420) * 60_000
    const diubah = Math.max(dibuat, awalKerja - acak.bulat(1, hariLalu) * HARI_MS + acak.bulat(0, 420) * 60_000)
    return { dibuatPada: waktuIsoWib(new Date(dibuat)), diubahPada: waktuIsoWib(new Date(diubah)) }
  }
  const nomorAkta = (kode: string, lahir: string, umur: number): string | null => {
    if (!acak.peluang(umur <= 17 ? 0.92 : 0.6)) return null
    const daftar = Math.min(Date.parse(`${lahir}T00:00:00Z`) + acak.bulat(7, 400) * HARI_MS, msHariIni)
    const [t, b, h] = new Date(daftar).toISOString().slice(0, 10).split('-')
    return `${kode.slice(0, 4)}-LT-${h}${b}${t}-${String(acak.bulat(1, 9999)).padStart(4, '0')}`
  }
  const nomorHp = () => `08${acak.pilih(PREFIKS_HP)}${String(acak.bulat(0, 99_999_999)).padStart(8, '0')}`

  // Keluarga persona lebih dulu, supaya NIK dan nomor KK-nya tidak dipakai orang lain.
  const tambahPersona = (k: KeluargaPersona) => {
    const d = dusunDari(k.dusunNomor)
    const nomorKk = buatNomorKk({ kodeWilayah: KODE_LOKAL, tanggalTerbit: k.tanggalTerbitKk, nomorUrut: k.nomorUrutKk })
    kkTerpakai.add(nomorKk)
    const anggota = k.anggota.map((a): Penduduk => {
      const nik = buatNik({ kodeWilayah: KODE_LOKAL, tanggalLahir: a.tanggalLahir, jenisKelamin: a.jenisKelamin, nomorUrut: a.nomorUrutNik })
      nikTerpakai.add(nik)
      return {
        id: a.id, desaId, nik, nama: a.nama, jenisKelamin: a.jenisKelamin, golonganDarah: a.golonganDarah, agama: a.agama,
        kewarganegaraan: 'WNI', tempatLahir: a.tempatLahir, tanggalLahir: a.tanggalLahir, nomorAktaLahir: a.nomorAktaLahir,
        keluargaId: k.id, hubunganKeluarga: a.hubungan, namaAyah: a.namaAyah, namaIbu: a.namaIbu, dusunId: d.id,
        rw: k.rw, rt: k.rt, pendidikan: a.pendidikan, pekerjaan: a.pekerjaan, statusPerkawinan: a.statusPerkawinan,
        statusDasar: 'Hidup', statusPenduduk: 'Tetap',
        ktpEl: statusKtpEl(hitungUmur(a.tanggalLahir, acuan).tahun, a.statusPerkawinan, null),
        telepon: a.telepon, catatan: null, ...waktuCatat(),
      }
    })
    penduduk.push(...anggota)
    keluarga.push({
      id: k.id, desaId, nomorKk, kepalaKeluargaId: anggota[0].id, dusunId: d.id, rw: k.rw, rt: k.rt,
      tanggalTerbit: k.tanggalTerbitKk, anggotaIds: anggota.map((p) => p.id),
    })
  }
  PERSONA.forEach(tambahPersona)

  for (const r of rumah) {
    const nomorDusun = acak.berbobot(BOBOT_DUSUN)
    const d = dusunDari(nomorDusun)
    const { rw, rt } = acak.pilih(d.rw.flatMap((w) => w.rt.map((t) => ({ rw: w.nomor, rt: t.nomor }))))
    const suku = acak.berbobot(SUKU_PER_DUSUN[nomorDusun])
    const agama = acak.berbobot(AGAMA_PER_SUKU[suku])
    const asal = acak.berbobot(ASAL_PER_SUKU[suku])
    const tahunPindah = acak.peluang(PELUANG_PENDATANG[suku])
      ? Math.max(tahunAcuan - acak.bulat(3, 30), tahunAcuan - r.kepala.umur + 18)
      : -Infinity
    const margaKepala = suku === 'Batak' ? acak.pilih(MARGA_BATAK) : null
    const margaLain = () => (suku === 'Batak' ? acak.pilih(MARGA_BATAK.filter((m) => m !== margaKepala)) : null)
    const margaAnak = suku === 'Batak' ? (r.kepala.jk === 'L' ? margaKepala : margaLain()) : null
    const kawinPasangan: StatusPerkawinan = acak.peluang(0.94) ? 'Kawin Tercatat' : 'Kawin Belum Tercatat'
    const namaDari = (jk: JenisKelamin, tahunLahir: number, marga: string | null) =>
      `${acak.pilih(NAMA_DEPAN[suku][angkatanDari(tahunLahir)][jk])}${marga ? ` ${marga}` : ''}`
    const statusKawin = (a: Anggota): StatusPerkawinan => {
      if (a.hubungan === 'Istri' || (a.hubungan === 'Kepala Keluarga' && r.istri)) return kawinPasangan
      if (a.hubungan === 'Kepala Keluarga') {
        if (a.jk === 'P') {
          return a.umur >= 45
            ? acak.berbobot<StatusPerkawinan>([['Cerai Mati', 85], ['Cerai Hidup', 15]])
            : acak.berbobot<StatusPerkawinan>([['Cerai Hidup', 65], ['Cerai Mati', 25], ['Belum Kawin', 10]])
        }
        return a.umur >= 50
          ? acak.berbobot<StatusPerkawinan>([['Cerai Mati', 60], ['Cerai Hidup', 40]])
          : acak.berbobot<StatusPerkawinan>([['Belum Kawin', 60], ['Cerai Hidup', 40]])
      }
      if (a.hubungan === 'Orang Tua' || a.hubungan === 'Mertua') {
        return acak.berbobot<StatusPerkawinan>([['Cerai Mati', 90], ['Cerai Hidup', 10]])
      }
      return a.umur < 19 ? 'Belum Kawin' : acak.berbobot<StatusPerkawinan>([['Belum Kawin', 90], ['Cerai Hidup', 10]])
    }

    const anggotaMentah: Anggota[] = [
      { ...r.kepala, hubungan: 'Kepala Keluarga' as const },
      ...(r.istri ? [{ ...r.istri, hubungan: 'Istri' as const }] : []),
      ...r.anggota,
    ].sort((a, b) => URUTAN_HUBUNGAN.indexOf(a.hubungan) - URUTAN_HUBUNGAN.indexOf(b.hubungan) || b.umur - a.umur)

    const keluargaId = acak.id('kk')
    const anggotaPenduduk: Penduduk[] = []
    let namaKepala = ''
    let namaIstri = ''
    for (const a of anggotaMentah) {
      const lahir = lahirDari(a.umur)
      const tahunLahir = Number(lahir.slice(0, 4))
      const lahirDiLuar = tahunLahir < tahunPindah
      const kode = lahirDiLuar ? asal.kode : KODE_LOKAL
      const bayiBaru = hitungUmur(lahir, acuan).bulan < 3
      const keturunan = a.hubungan === 'Anak' || a.hubungan === 'Cucu'
      const marga = a.hubungan === 'Kepala Keluarga' ? margaKepala
        : keturunan ? margaAnak
          : a.hubungan === 'Orang Tua' && a.jk === 'L' ? margaKepala
            : margaLain()
      const gelarHaji = !keturunan && tahunLahir <= 1971 && (suku === 'Melayu' || suku === 'Minang') && acak.peluang(0.08)
      const nama = `${gelarHaji ? (a.jk === 'L' ? 'H. ' : 'Hj. ') : ''}${namaDari(a.jk, tahunLahir, marga)}`
      if (a.hubungan === 'Kepala Keluarga') namaKepala = nama
      if (a.hubungan === 'Istri') namaIstri = nama
      const anak = a.hubungan === 'Anak'
      const namaAyah = anak && r.kepala.jk === 'L' ? namaKepala : namaDari('L', tahunLahir - 28, marga)
      const namaIbu = anak && (r.istri || r.kepala.jk === 'P')
        ? (r.istri ? namaIstri : namaKepala)
        : namaDari('P', tahunLahir - 25, margaLain())
      const statusPerkawinan = statusKawin(a)
      const pendidikan = pendidikanUntuk(a.umur, tahunLahir, acak)
      anggotaPenduduk.push({
        id: acak.id('pdk'),
        desaId,
        nik: bayiBaru ? null : nikBaru(kode, lahir, a.jk),
        nama,
        jenisKelamin: a.jk,
        golonganDarah: acak.berbobot(GOLONGAN_DARAH_BOBOT),
        agama,
        kewarganegaraan: 'WNI',
        tempatLahir: lahirDiLuar ? asal.kota : acak.berbobot(TEMPAT_LAHIR_LOKAL),
        tanggalLahir: lahir,
        nomorAktaLahir: bayiBaru ? null : nomorAkta(kode, lahir, a.umur),
        keluargaId,
        hubunganKeluarga: a.hubungan,
        namaAyah,
        namaIbu,
        dusunId: d.id,
        rw,
        rt,
        pendidikan,
        pekerjaan: pekerjaanUntuk(a.umur, a.jk, pendidikan, acak),
        statusPerkawinan,
        statusDasar: 'Hidup',
        statusPenduduk:
          a.hubungan === 'Famili Lain' && a.umur >= 18 && a.umur <= 40 && acak.peluang(0.3) ? 'Sementara' : 'Tetap',
        ktpEl: statusKtpEl(a.umur, statusPerkawinan, acak),
        telepon: a.umur >= 17 && acak.peluang(0.65) ? nomorHp() : null,
        catatan: null,
        ...waktuCatat(),
      })
    }

    // Tanggal terbit KK: setelah anggota termuda lahir, paling lambat kemarin.
    const msTermuda = Math.max(...anggotaPenduduk.map((p) => Date.parse(`${p.tanggalLahir}T00:00:00Z`)))
    const kandidat = Math.max(msTermuda + acak.bulat(0, 60) * HARI_MS, msHariIni - acak.bulat(30, 3650) * HARI_MS)
    const tanggalTerbit = new Date(Math.max(msTermuda, Math.min(kandidat, msHariIni - HARI_MS))).toISOString().slice(0, 10)
    penduduk.push(...anggotaPenduduk)
    keluarga.push({
      id: keluargaId, desaId, nomorKk: kkBaru(tanggalTerbit), kepalaKeluargaId: anggotaPenduduk[0].id,
      dusunId: d.id, rw, rt, tanggalTerbit, anggotaIds: anggotaPenduduk.map((p) => p.id),
    })
  }

  // Tepat 12 penduduk dewasa (bukan persona) dengan data belum lengkap (SPEC §12.3).
  const idPersona = new Set(PERSONA.flatMap((k) => k.anggota.map((a) => a.id)))
  const calonKosong = acak.acakUrutan(
    penduduk.filter((p) => !idPersona.has(p.id) && p.nik !== null && hitungUmur(p.tanggalLahir, acuan).tahun >= 19),
  )
  calonKosong.slice(0, 8).forEach((p) => {
    p.pekerjaan = null
  })
  calonKosong.slice(8, 12).forEach((p) => {
    p.pendidikan = null
  })

  return { penduduk, keluarga }
}
