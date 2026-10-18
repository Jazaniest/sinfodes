import type { Aktivitas } from '@/domain/aktivitas/schema'
import { hitungUmur, tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import { buatNomorKk } from '@/domain/keluarga/nomor-kk'
import type { Keluarga } from '@/domain/keluarga/schema'
import type {
  AlasanPindah, PenolongKelahiran, SebabKematian, TempatDilahirkan, YangMenerangkanKematian,
} from '@/domain/mutasi/enum'
import type { AlamatWilayah, Mutasi, Pelaku } from '@/domain/mutasi/schema'
import {
  PENDIDIKAN, type HubunganKeluarga, type JenisKelamin, type Pekerjaan, type Pendidikan, type StatusPerkawinan,
} from '@/domain/penduduk/enum'
import { buatNik } from '@/domain/penduduk/nik'
import { LABEL_FIELD, type FieldRiwayat, type Riwayat } from '@/domain/penduduk/riwayat'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import { KABUPATEN, PROVINSI } from '@/domain/wilayah/kode-wilayah'
import { angkatanDari, MARGA_BATAK, NAMA_DEPAN, type Suku } from '../data/nama'
import type { Acak } from '../prng'
import { PERSONA } from './persona'

/** SPEC §12.6: bulan berjalan 3 lahir, 1 meninggal, 2 datang, 4 pindah. */
export const MUTASI_BULAN_INI = { lahir: 3, meninggal: 1, datang: 2, pindah: 4 } as const
/** Bulan berjalan + 23 bulan sebelumnya. */
export const BULAN_RIWAYAT_MUTASI = 24

type Bobot<T> = ReadonlyArray<readonly [T, number]>

const KODE_LOKAL = '140509'
const HARI_MS = 86_400_000
const WIB_MS = 7 * 3_600_000
/** Kejadian hari ini paling awal pukul 07.30 WIB (SPEC §12.7). */
const AWAL_HARI_INI = 7 * 60 + 30
const ID_KK_PERSONA: ReadonlySet<string> = new Set(PERSONA.map((k) => k.id))

const TEMPAT_DILAHIRKAN_BOBOT: Bobot<TempatDilahirkan> = [
  ['Puskesmas', 35], ['RS/RB', 30], ['Polindes', 15], ['Rumah', 15], ['Lainnya', 5],
]
const ALASAN_PINDAH_BOBOT: Bobot<AlasanPindah> = [
  ['Pekerjaan', 55], ['Pendidikan', 20], ['Keluarga', 15], ['Perumahan', 5], ['Lainnya', 5],
]
const TEMPAT_MENINGGAL: Bobot<string> = [
  ['Rumah', 70], ['RSUD Selasih, Pangkalan Kerinci', 20], ['Puskesmas Teluk Meranti', 10],
]
const PENDIDIKAN_LANSIA: Bobot<Pendidikan> = [
  ['Tamat SD/Sederajat', 45], ['Belum Tamat SD/Sederajat', 25], ['Tidak/Belum Sekolah', 15], ['SLTP/Sederajat', 15],
]
const PENDIDIKAN_PERANTAU: Bobot<Pendidikan> = [
  ['SLTA/Sederajat', 60], ['SLTP/Sederajat', 15], ['Diploma IV/Strata I', 15], ['Akademi/Diploma III/Sarjana Muda', 10],
]
const PEKERJAAN_LANSIA: Readonly<Record<JenisKelamin, Bobot<Pekerjaan>>> = {
  L: [['Petani/Pekebun', 60], ['Nelayan/Perikanan', 20], ['Pensiunan', 10], ['Belum/Tidak Bekerja', 10]],
  P: [['Mengurus Rumah Tangga', 70], ['Petani/Pekebun', 25], ['Pedagang', 5]],
}
const PEKERJAAN_PERANTAU: Bobot<Pekerjaan> = [
  ['Karyawan Swasta', 50], ['Buruh Harian Lepas', 25], ['Wiraswasta', 15], ['Belum/Tidak Bekerja', 10],
]
/** Tujuan pindah warga desa. Wilayahnya nyata; alamat jalannya rekaan. */
const TUJUAN_PINDAH: readonly AlamatWilayah[] = [
  { provinsi: 'Riau', kabupaten: 'Kota Pekanbaru', kecamatan: 'Tampan', desa: 'Simpang Baru', alamat: 'Jl. Garuda Sakti Gg. Sepakat No. 14' },
  { provinsi: 'Riau', kabupaten: 'Kota Pekanbaru', kecamatan: 'Marpoyan Damai', desa: 'Maharatu', alamat: 'Jl. Kartama Gg. Bersama No. 7' },
  { provinsi: 'Riau', kabupaten: 'Pelalawan', kecamatan: 'Pangkalan Kerinci', desa: 'Kerinci Kota', alamat: 'RT 003/RW 002' },
  { provinsi: 'Riau', kabupaten: 'Kota Dumai', kecamatan: 'Dumai Timur', desa: 'Bukit Batrem', alamat: 'Jl. Sultan Hasanuddin Gg. Damai No. 21' },
  { provinsi: 'Kepulauan Riau', kabupaten: 'Kota Batam', kecamatan: 'Batam Kota', desa: 'Belian', alamat: 'Perumahan Citra Indah Blok C No. 9' },
  { provinsi: 'Riau', kabupaten: 'Kampar', kecamatan: 'Bangkinang Kota', desa: 'Langgini', alamat: 'Jl. Prof. M. Yamin Gg. Mawar No. 3' },
  { provinsi: 'Sumatera Barat', kabupaten: 'Kota Padang', kecamatan: 'Kuranji', desa: 'Pasar Ambacang', alamat: 'Jl. Raya Kuranji No. 41' },
]
/** Daerah asal pendatang per kode kabupaten di NIK (SPEC §12.5). */
const ASAL_DATANG: Readonly<Record<string, Omit<AlamatWilayah, 'alamat'>>> = {
  '3310': { provinsi: 'Jawa Tengah', kabupaten: 'Klaten', kecamatan: 'Klaten Tengah', desa: 'Sidorejo' },
  '3309': { provinsi: 'Jawa Tengah', kabupaten: 'Boyolali', kecamatan: 'Boyolali', desa: 'Sidomulyo' },
  '1306': { provinsi: 'Sumatera Barat', kabupaten: 'Agam', kecamatan: 'Lubuk Basung', desa: 'Koto Baru' },
  '1202': { provinsi: 'Sumatera Utara', kabupaten: 'Tapanuli Utara', kecamatan: 'Tarutung', desa: 'Hutabarat' },
  '1212': { provinsi: 'Sumatera Utara', kabupaten: 'Toba', kecamatan: 'Balige', desa: 'Sangkar Nihuta' },
  '1401': { provinsi: 'Riau', kabupaten: 'Kampar', kecamatan: 'Bangkinang', desa: 'Muara Uwai' },
}

// --- Tanggal (string "YYYY-MM-DD", dibandingkan secara leksikal) ---
const msTanggal = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const isoTanggal = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const tambahHari = (iso: string, n: number) => isoTanggal(msTanggal(iso) + n * HARI_MS)
const minTanggal = (a: string, b: string) => (a < b ? a : b)
const tanggalDalamBulan = (awal: string, hari: number) => `${awal.slice(0, 8)}${String(hari).padStart(2, '0')}`
function mundurBulan(awal: string, n: number): string {
  const [t, b] = awal.split('-').map(Number)
  return isoTanggal(Date.UTC(t, b - 1 - n, 1))
}
function jumlahHari(awal: string): number {
  const [t, b] = awal.split('-').map(Number)
  return new Date(Date.UTC(t, b, 0)).getUTCDate()
}
/** Jam dinding WIB (menit sejak tengah malam) pada tanggal tertentu → ISO berzona +07:00. */
const waktuPada = (tanggal: string, menit: number) => waktuIsoWib(new Date(msTanggal(tanggal) + menit * 60_000 - WIB_MS))

type Opsi = {
  desaId: string
  penduduk: readonly Penduduk[]
  keluarga: readonly Keluarga[]
  pengguna: readonly Pengguna[]
  acuan: Date
}
export type HasilMutasi = {
  penduduk: Penduduk[]
  keluarga: Keluarga[]
  mutasi: Mutasi[]
  riwayat: Riwayat[]
  aktivitas: Aktivitas[]
}

/** Membangkitkan mutasi 24 bulan, riwayat perubahan, dan buku aktivitas (SPEC §6.1, §12.6, §12.7). */
export function bangkitkanMutasi(acak: Acak, opsi: Opsi): HasilMutasi {
  const { desaId, acuan } = opsi
  const penduduk = opsi.penduduk.map((p) => ({ ...p }))
  const keluarga = opsi.keluarga.map((k) => ({ ...k, anggotaIds: [...k.anggotaIds] }))
  const perId = new Map(penduduk.map((p) => [p.id, p] as const))
  const perKk = new Map(keluarga.map((k) => [k.id, k] as const))
  const kkBiasa = keluarga.filter((k) => !ID_KK_PERSONA.has(k.id))
  const mutasi: Mutasi[] = []
  const riwayat: Riwayat[] = []
  const aktivitas: Aktivitas[] = []

  // --- Waktu ---
  const hariIni = tanggalIsoWib(acuan)
  const bulanIni = `${hariIni.slice(0, 8)}01`
  const menitSekarang = Math.floor(((acuan.getTime() + WIB_MS) % HARI_MS) / 60_000)
  const batasMenit = menitSekarang - 5
  const adaWaktuHariIni = batasMenit >= AWAL_HARI_INI
  /** Kejadian paling akhir yang boleh ada: hari ini kalau sudah lewat 07.35, selain itu kemarin. */
  const hariTerakhir = adaWaktuHariIni ? hariIni : tambahHari(hariIni, -1)
  const maksHariBulanIni = hariTerakhir >= bulanIni ? Number(hariTerakhir.slice(8, 10)) : 0
  const waktuHariIni = () => waktuPada(hariIni, acak.bulat(AWAL_HARI_INI, batasMenit))
  /** Waktu pencatatan: 0..tundaMaks hari setelah kejadian, pada jam kerja. */
  const waktuCatat = (tanggal: string, tundaMaks: number): string => {
    const hari = minTanggal(tambahHari(tanggal, acak.bulat(0, tundaMaks)), hariTerakhir)
    return hari === hariIni ? waktuHariIni() : waktuPada(hari, acak.bulat(8 * 60, 15 * 60))
  }
  const jamAcak = () => `${String(acak.bulat(0, 23)).padStart(2, '0')}:${String(acak.bulat(0, 59)).padStart(2, '0')}`
  const lahirSebelum = (tanggal: string, umur: number): string => {
    const [t, b, h] = tanggal.split('-').map(Number)
    return isoTanggal(Date.UTC(t - umur, b - 1, h) - acak.bulat(1, 364) * HARI_MS)
  }
  const umurTahun = (p: Penduduk) => hitungUmur(p.tanggalLahir, acuan).tahun
  /** Bulan berjalan tepat `bulanIniJumlah`; 23 bulan sebelumnya mengikuti bobot. Hasil urut naik. */
  const jadwal = (bulanIniJumlah: number, bobot: Bobot<number>): string[] => {
    const hasil: string[] = []
    for (let n = BULAN_RIWAYAT_MUTASI - 1; n >= 1; n--) {
      const awal = mundurBulan(bulanIni, n)
      for (let i = acak.berbobot(bobot); i > 0; i--) hasil.push(tanggalDalamBulan(awal, acak.bulat(1, jumlahHari(awal))))
    }
    for (let i = 0; i < bulanIniJumlah && maksHariBulanIni > 0; i++) {
      hasil.push(tanggalDalamBulan(bulanIni, acak.bulat(1, maksHariBulanIni)))
    }
    return hasil.sort()
  }

  // --- Penanda unik ---
  const idTerpakai = new Set<string>([...penduduk.map((p) => p.id), ...keluarga.map((k) => k.id)])
  const idBaru = (awalan: string): string => {
    for (; ;) {
      const id = acak.id(awalan)
      if (!idTerpakai.has(id)) {
        idTerpakai.add(id)
        return id
      }
    }
  }
  const nikTerpakai = new Set(penduduk.flatMap((p) => (p.nik ? [p.nik] : [])))
  const nikBaru = (kodeWilayah: string, tanggalLahir: string, jenisKelamin: JenisKelamin): string => {
    for (let nomorUrut = 8001; nomorUrut <= 9999; nomorUrut++) {
      const nik = buatNik({ kodeWilayah, tanggalLahir, jenisKelamin, nomorUrut })
      if (!nikTerpakai.has(nik)) {
        nikTerpakai.add(nik)
        return nik
      }
    }
    throw new Error('Nomor urut NIK habis')
  }
  const kkTerpakai = new Set(keluarga.map((k) => k.nomorKk))
  const nomorKkBaru = (tanggalTerbit: string): string => {
    for (let nomorUrut = 8001; nomorUrut <= 9999; nomorUrut++) {
      const nomor = buatNomorKk({ kodeWilayah: KODE_LOKAL, tanggalTerbit, nomorUrut })
      if (!kkTerpakai.has(nomor)) {
        kkTerpakai.add(nomor)
        return nomor
      }
    }
    throw new Error('Nomor urut KK habis')
  }

  // --- Petugas pencatat ---
  const petugas = opsi.pengguna.filter((p) => p.desaId === desaId && (p.peran === 'operator' || p.peran === 'sekdes'))
  const operator = petugas.find((p) => p.peran === 'operator')
  if (!operator) throw new Error('Desa demo tidak punya operator')
  const pelaku = (): Pelaku => {
    const p = acak.peluang(0.85) ? operator : acak.pilih(petugas)
    return { id: p.id, nama: p.nama }
  }
  const catat = (jenis: Aktivitas['jenis'], ringkasan: string, waktu: string, oleh: Pelaku, p: Penduduk) => {
    aktivitas.push({
      id: idBaru('akt'), desaId, dusunId: p.dusunId, waktu, jenis, ringkasan, oleh, rujukan: { jenis: 'penduduk', id: p.id },
    })
  }

  // --- Nama dan asal untuk mantan penduduk ---
  const sukuDari = (p: Penduduk): { suku: Suku; marga: string | null } => {
    const kataAkhir = p.nama.split(' ').at(-1) ?? ''
    if ((MARGA_BATAK as readonly string[]).includes(kataAkhir)) return { suku: 'Batak', marga: kataAkhir }
    if (p.nik?.startsWith('33')) return { suku: 'Jawa', marga: null }
    if (p.nik?.startsWith('13')) return { suku: 'Minang', marga: null }
    return { suku: 'Melayu', marga: null }
  }
  const namaAcak = (suku: Suku, jk: JenisKelamin, tahunLahir: number, marga: string | null) =>
    `${acak.pilih(NAMA_DEPAN[suku][angkatanDari(tahunLahir)][jk])}${marga ? ` ${marga}` : ''}`
  const kodeNikDari = (p: Penduduk) => p.nik?.slice(0, 6) ?? KODE_LOKAL

  type DataMantan = {
    kk: Keluarga
    jk: JenisKelamin
    lahir: string
    nama: string
    agama: Penduduk['agama']
    kodeNik: string
    tempatLahir: string
    hubungan: HubunganKeluarga
    statusPerkawinan: StatusPerkawinan
    pendidikan: Pendidikan
    pekerjaan: Pekerjaan
    namaAyah: string
    namaIbu: string
    statusDasar: 'Meninggal' | 'Pindah'
    dibuatPada: string
    diubahPada: string
  }
  /** Mantan penduduk: tercatat di KK lamanya lewat `keluargaId`, tetapi sudah bukan anggota KK. */
  const mantanPenduduk = (d: DataMantan): Penduduk => {
    const p: Penduduk = {
      id: idBaru('pdk'), desaId, nik: nikBaru(d.kodeNik, d.lahir, d.jk), nama: d.nama, jenisKelamin: d.jk,
      golonganDarah: 'Tidak Tahu', agama: d.agama, kewarganegaraan: 'WNI', tempatLahir: d.tempatLahir,
      tanggalLahir: d.lahir, nomorAktaLahir: null, keluargaId: d.kk.id, hubunganKeluarga: d.hubungan,
      namaAyah: d.namaAyah, namaIbu: d.namaIbu, dusunId: d.kk.dusunId, rw: d.kk.rw, rt: d.kk.rt,
      pendidikan: d.pendidikan, pekerjaan: d.pekerjaan, statusPerkawinan: d.statusPerkawinan,
      statusDasar: d.statusDasar, statusPenduduk: 'Tetap', ktpEl: 'Sudah rekam', telepon: null, catatan: null,
      dibuatPada: d.dibuatPada, diubahPada: d.diubahPada,
    }
    penduduk.push(p)
    perId.set(p.id, p)
    return p
  }
  const dibuatLama = (tanggal: string) => waktuPada(tambahHari(tanggal, -acak.bulat(400, 3000)), acak.bulat(8 * 60, 15 * 60))

  // 1. Lahir: bayi < 24 bulan yang sudah ada. Bulan berjalan dibuat tepat 3.
  const bayi = penduduk.filter(
    (p) => p.statusDasar === 'Hidup' && hitungUmur(p.tanggalLahir, acuan).bulan < BULAN_RIWAYAT_MUTASI,
  )
  for (const b of bayi) if (b.tanggalLahir > hariTerakhir) b.tanggalLahir = hariTerakhir
  const urutLahir = (a: Penduduk, b: Penduduk) => a.tanggalLahir.localeCompare(b.tanggalLahir) || a.id.localeCompare(b.id)
  const lahirBulanIni = () => bayi.filter((b) => b.tanggalLahir >= bulanIni).sort(urutLahir)
  for (let ada = lahirBulanIni(); ada.length > MUTASI_BULAN_INI.lahir; ada = lahirBulanIni()) {
    ada[0].tanggalLahir = tambahHari(bulanIni, -acak.bulat(1, 20))
  }
  for (let ada = lahirBulanIni(); maksHariBulanIni > 0 && ada.length < MUTASI_BULAN_INI.lahir; ada = lahirBulanIni()) {
    const calon = bayi.filter((b) => b.tanggalLahir < bulanIni).sort(urutLahir).at(-1)
    if (!calon) break
    calon.tanggalLahir = tanggalDalamBulan(bulanIni, acak.bulat(1, maksHariBulanIni))
    calon.nik = null
    calon.nomorAktaLahir = null
  }
  const lahirTerakhir = lahirBulanIni().at(-1)
  const penolongUntuk = (t: TempatDilahirkan): PenolongKelahiran =>
    t === 'RS/RB'
      ? acak.berbobot<PenolongKelahiran>([['Dokter', 60], ['Bidan/Perawat', 40]])
      : t === 'Rumah'
        ? acak.berbobot<PenolongKelahiran>([['Bidan/Perawat', 70], ['Dukun', 30]])
        : 'Bidan/Perawat'
  for (const b of [...bayi].sort(urutLahir)) {
    const anggota = (perKk.get(b.keluargaId)?.anggotaIds ?? [])
      .map((id) => perId.get(id))
      .filter((a): a is Penduduk => a !== undefined)
    const ibu = anggota.find((a) => a.jenisKelamin === 'P' && a.nama === b.namaIbu) ?? null
    const ayah = anggota.find((a) => a.jenisKelamin === 'L' && a.nama === b.namaAyah) ?? null
    const kakak = anggota.filter((a) => a.id !== b.id && a.namaIbu === b.namaIbu && a.tanggalLahir < b.tanggalLahir)
    const tempat = acak.berbobot(TEMPAT_DILAHIRKAN_BOBOT)
    const dicatatPada = b === lahirTerakhir && adaWaktuHariIni ? waktuHariIni() : waktuCatat(b.tanggalLahir, 14)
    const oleh = pelaku()
    mutasi.push({
      id: idBaru('mts'), desaId, jenis: 'lahir', tanggal: b.tanggalLahir, pendudukIds: [b.id], dicatatOleh: oleh, dicatatPada,
      rincian: {
        jam: jamAcak(), tempatDilahirkan: tempat, tempatLahir: b.tempatLahir, jenisKelahiran: 'Tunggal',
        anakKe: kakak.length + 1, penolong: penolongUntuk(tempat), beratGram: acak.bulat(2600, 3900),
        panjangCm: acak.bulat(46, 53), ibuId: ibu?.id ?? null, ayahId: ayah?.id ?? null,
        pelapor: ayah?.nama ?? ibu?.nama ?? b.namaAyah,
      },
    })
    b.dibuatPada = dicatatPada
    b.diubahPada = dicatatPada
    catat('mutasi-lahir', `Kelahiran dicatat · ${b.nama}`, dicatatPada, oleh, b)
  }

  // 2. Meninggal: orang tua (kebanyakan lansia) dari kepala keluarga yang masih ada.
  for (const tanggal of jadwal(MUTASI_BULAN_INI.meninggal, [[0, 30], [1, 45], [2, 25]])) {
    const umur = acak.peluang(0.8) ? acak.bulat(62, 90) : acak.bulat(45, 61)
    const calonKk = kkBiasa.filter((k) => umurTahun(perId.get(k.kepalaKeluargaId)!) <= umur - 18)
    if (calonKk.length === 0) continue
    const kk = acak.pilih(calonKk)
    const kepala = perId.get(kk.kepalaKeluargaId)!
    const jk: JenisKelamin = acak.peluang(0.5) ? 'L' : 'P'
    const lahir = lahirSebelum(tanggal, umur)
    const tahun = Number(lahir.slice(0, 4))
    const { suku, marga } = sukuDari(kepala)
    const margaSendiri = jk === 'L' ? marga : suku === 'Batak' ? acak.pilih(MARGA_BATAK) : null
    const dicatatPada = waktuCatat(tanggal, 7)
    const almarhum = mantanPenduduk({
      kk, jk, lahir, nama: namaAcak(suku, jk, tahun, margaSendiri), agama: kepala.agama, kodeNik: kodeNikDari(kepala),
      tempatLahir: kodeNikDari(kepala) === KODE_LOKAL ? 'Teluk Meranti' : kepala.tempatLahir, hubungan: 'Orang Tua',
      statusPerkawinan: acak.peluang(0.7) ? 'Cerai Mati' : 'Kawin Tercatat', pendidikan: acak.berbobot(PENDIDIKAN_LANSIA),
      pekerjaan: acak.berbobot(PEKERJAAN_LANSIA[jk]), namaAyah: namaAcak(suku, 'L', tahun - 28, marga),
      namaIbu: namaAcak(suku, 'P', tahun - 25, null), statusDasar: 'Meninggal', dibuatPada: dibuatLama(tanggal),
      diubahPada: dicatatPada,
    })
    const tempat = acak.berbobot(TEMPAT_MENINGGAL)
    const oleh = pelaku()
    mutasi.push({
      id: idBaru('mts'), desaId, jenis: 'meninggal', tanggal, pendudukIds: [almarhum.id], dicatatOleh: oleh, dicatatPada,
      rincian: {
        jam: jamAcak(),
        tempat,
        sebab: umur >= 60
          ? acak.berbobot<SebabKematian>([['Sakit biasa/tua', 90], ['Kecelakaan', 4], ['Lainnya', 6]])
          : acak.berbobot<SebabKematian>([['Sakit biasa/tua', 70], ['Kecelakaan', 20], ['Lainnya', 10]]),
        yangMenerangkan: tempat === 'Rumah'
          ? acak.berbobot<YangMenerangkanKematian>([['Tenaga kesehatan', 60], ['Lainnya', 40]])
          : 'Dokter',
        pelapor: kepala.nama,
      },
    })
    catat('mutasi-meninggal', `Kematian dicatat · ${almarhum.nama}`, dicatatPada, oleh, almarhum)
  }

  // 3. Pindah keluar: anak muda yang merantau (SPEC §12.3, lekukan umur 20-29).
  for (const tanggal of jadwal(MUTASI_BULAN_INI.pindah, [[0, 30], [1, 40], [2, 20], [3, 10]])) {
    const umur = acak.bulat(19, 34)
    const calonKk = kkBiasa.filter((k) => umurTahun(perId.get(k.kepalaKeluargaId)!) >= umur + 20)
    if (calonKk.length === 0) continue
    const kk = acak.pilih(calonKk)
    const kepala = perId.get(kk.kepalaKeluargaId)!
    const istri = kk.anggotaIds.map((id) => perId.get(id)).find((a) => a?.hubunganKeluarga === 'Istri')
    const jk: JenisKelamin = acak.peluang(0.55) ? 'L' : 'P'
    const lahir = lahirSebelum(tanggal, umur)
    const tahun = Number(lahir.slice(0, 4))
    const { suku, marga } = sukuDari(kepala)
    const alasan = acak.berbobot(ALASAN_PINDAH_BOBOT)
    const tujuan = acak.pilih(TUJUAN_PINDAH)
    const dicatatPada = waktuCatat(tanggal, 5)
    const perantau = mantanPenduduk({
      kk, jk, lahir, nama: namaAcak(suku, jk, tahun, kepala.jenisKelamin === 'L' ? marga : null), agama: kepala.agama,
      kodeNik: kodeNikDari(kepala), tempatLahir: kodeNikDari(kepala) === KODE_LOKAL ? 'Teluk Meranti' : kepala.tempatLahir,
      hubungan: 'Anak', statusPerkawinan: acak.peluang(0.75) ? 'Belum Kawin' : 'Kawin Tercatat',
      pendidikan: acak.berbobot(PENDIDIKAN_PERANTAU),
      pekerjaan: alasan === 'Pendidikan' ? 'Pelajar/Mahasiswa' : acak.berbobot(PEKERJAAN_PERANTAU),
      namaAyah: kepala.jenisKelamin === 'L' ? kepala.nama : namaAcak(suku, 'L', tahun - 28, marga),
      namaIbu: istri?.nama ?? (kepala.jenisKelamin === 'P' ? kepala.nama : namaAcak(suku, 'P', tahun - 25, null)),
      statusDasar: 'Pindah', dibuatPada: dibuatLama(tanggal), diubahPada: dicatatPada,
    })
    const oleh = pelaku()
    mutasi.push({
      id: idBaru('mts'), desaId, jenis: 'pindah', tanggal, pendudukIds: [perantau.id], dicatatOleh: oleh, dicatatPada,
      rincian: { tujuan, alasan },
    })
    catat('mutasi-pindah', `Pindah keluar dicatat · ${perantau.nama} ke ${tujuan.kabupaten}`, dicatatPada, oleh, perantau)
  }

  // 4. Datang: KK yang seluruh anggotanya lahir di luar desa. Bulan berjalan diisi lebih dulu.
  const calonDatang = acak.acakUrutan(
    kkBiasa.filter((k) =>
      k.anggotaIds.every((id) => {
        const a = perId.get(id)!
        return a.nik !== null && !a.nik.startsWith(KODE_LOKAL) && hitungUmur(a.tanggalLahir, acuan).bulan > BULAN_RIWAYAT_MUTASI
      }),
    ),
  )
  const idDatang = new Set<string>()
  jadwal(MUTASI_BULAN_INI.datang, [[0, 45], [1, 45], [2, 10]])
    .reverse()
    .forEach((tanggal, i) => {
      const kk = calonDatang.at(i)
      if (!kk) return
      const anggota = kk.anggotaIds.map((id) => perId.get(id)!)
      const kepala = perId.get(kk.kepalaKeluargaId)!
      const dicatatPada = waktuCatat(tanggal, 3)
      kkTerpakai.delete(kk.nomorKk)
      kk.tanggalTerbit = minTanggal(tambahHari(tanggal, acak.bulat(0, 6)), hariTerakhir)
      kk.nomorKk = nomorKkBaru(kk.tanggalTerbit)
      for (const a of anggota) {
        a.dibuatPada = dicatatPada
        a.diubahPada = dicatatPada
        idDatang.add(a.id)
      }
      const kode4 = kodeNikDari(kepala).slice(0, 4)
      const asal = ASAL_DATANG[kode4] ?? {
        provinsi: PROVINSI[kode4.slice(0, 2)] ?? 'Tidak diketahui',
        kabupaten: KABUPATEN[kode4] ?? 'Tidak diketahui',
        kecamatan: 'Tidak diketahui',
        desa: 'Tidak diketahui',
      }
      const oleh = pelaku()
      mutasi.push({
        id: idBaru('mts'), desaId, jenis: 'datang', tanggal, pendudukIds: anggota.map((a) => a.id), dicatatOleh: oleh,
        dicatatPada,
        rincian: {
          nomorSkpwni: `${kode4}/SKPWNI/${tanggal.slice(8, 10)}${tanggal.slice(5, 7)}${tanggal.slice(0, 4)}/${String(acak.bulat(1, 999)).padStart(4, '0')}`,
          asal: { ...asal, alamat: `RT 00${acak.bulat(1, 9)}/RW 00${acak.bulat(1, 5)}` },
          keluargaId: kk.id,
        },
      })
      catat('mutasi-datang', `Kedatangan dicatat · ${kepala.nama} (${anggota.length} orang)`, dicatatPada, oleh, kepala)
    })

  // 5. Riwayat perubahan field (SPEC §6.1), termasuk dua perubahan hari ini.
  const sudahBerubah = new Set<string>()
  const dewasa = penduduk.filter((p) => p.statusDasar === 'Hidup' && !idDatang.has(p.id) && umurTahun(p) >= 17)
  const nomorHpLama = () => `08${acak.pilih(['12', '13', '52', '53', '81', '82'])}${String(acak.bulat(0, 99_999_999)).padStart(8, '0')}`
  const perubahan = (p: Penduduk): { field: FieldRiwayat; lama: string | null; baru: string | null } | null => {
    const umur = umurTahun(p)
    if (umur <= 30 && p.pekerjaan !== null && p.pekerjaan !== 'Pelajar/Mahasiswa' && p.pekerjaan !== 'Belum/Tidak Bekerja') {
      return { field: 'pekerjaan', lama: 'Pelajar/Mahasiswa', baru: p.pekerjaan }
    }
    if (p.ktpEl === 'Sudah rekam' && umur <= 25) return { field: 'ktpEl', lama: 'Belum rekam', baru: 'Sudah rekam' }
    if (p.telepon !== null) return { field: 'telepon', lama: nomorHpLama(), baru: p.telepon }
    const i = p.pendidikan === null ? -1 : PENDIDIKAN.indexOf(p.pendidikan)
    return i > 0 ? { field: 'pendidikan', lama: PENDIDIKAN[i - 1], baru: p.pendidikan } : null
  }
  const ubahPenduduk = (p: Penduduk, waktu: string): boolean => {
    const u = perubahan(p)
    if (!u) return false
    const oleh = pelaku()
    riwayat.push({ id: idBaru('rwy'), desaId, pendudukId: p.id, field: u.field, nilaiLama: u.lama, nilaiBaru: u.baru, oleh, waktu })
    if (waktu > p.diubahPada) p.diubahPada = waktu
    sudahBerubah.add(p.id)
    catat('penduduk-ubah', `Data penduduk diubah · ${p.nama} (${LABEL_FIELD[u.field]})`, waktu, oleh, p)
    return true
  }
  for (const p of dewasa) if (p.diubahPada > p.dibuatPada && acak.peluang(0.1)) ubahPenduduk(p, p.diubahPada)
  if (adaWaktuHariIni) {
    let n = 0
    for (const p of acak.acakUrutan(dewasa)) {
      if (n === 2) break
      if (!sudahBerubah.has(p.id) && ubahPenduduk(p, waktuHariIni())) n += 1
    }
  }

  return {
    penduduk,
    keluarga,
    mutasi: mutasi.sort((a, b) => a.dicatatPada.localeCompare(b.dicatatPada)),
    riwayat: riwayat.sort((a, b) => a.waktu.localeCompare(b.waktu)),
    aktivitas: aktivitas.sort((a, b) => a.waktu.localeCompare(b.waktu)),
  }
}
