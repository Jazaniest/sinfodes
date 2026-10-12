import type { Aktivitas, JenisAktivitas } from '@/domain/aktivitas/schema'
import { pad2 } from '@/domain/format/kalender'
import { formatTanggal, hitungUmur, tanggalIsoWib, waktuIsoWib } from '@/domain/format/tanggal'
import type { Mutasi, Pelaku } from '@/domain/mutasi/schema'
import type { Pekerjaan } from '@/domain/penduduk/enum'
import { buatNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Pengguna, Peran } from '@/domain/pengguna/schema'
import { JENIS_SURAT_BAWAAN } from '@/domain/surat/bawaan'
import type { JenisSurat } from '@/domain/surat/jenis'
import { susunLembar } from '@/domain/surat/lembar'
import { FORMAT_NOMOR_BAWAAN, formatNomorSurat } from '@/domain/surat/nomor-surat'
import type { EntriRiwayatSurat, Kanal, KejadianSurat, Lampiran, Permohonan } from '@/domain/surat/permohonan'
import { buatKodeVerifikasi } from '@/domain/surat/verifikasi'
import { berlakuSampai } from '@/domain/surat/waktu'
import { alamatLengkap } from '@/domain/wilayah/alamat'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import type { Acak } from '../prng'
import { PERSONA } from './persona'

/** SPEC §12.6: antrean saat ini. */
export const ANTREAN_SURAT = { menunggu: 7, diproses: 5, 'perlu-ttd': 3 } as const
/** Permohonan 12 bulan ke belakang. */
export const HARI_RIWAYAT_SURAT = 365

const HARI_MS = 86_400_000
const MENIT_MS = 60_000
const WIB_MS = 7 * 3_600_000
const BUKA = 8 * 60
/** Kejadian hari ini paling awal pukul 07.30 WIB (SPEC §12.7). */
const AWAL_HARI_INI = 7 * 60 + 30

type Bobot<T> = ReadonlyArray<readonly [T, number]>
/** Sebaran jenis (SPEC §12.6) tanpa SKL, SKM, dan SPP: ketiganya dibuat dari mutasi yang memang tercatat. */
const BOBOT_JENIS: Bobot<string> = [
  ['SKD', 22], ['SKTM', 18], ['SKU', 15], ['SPCK', 12], ['SKP', 8], ['SKBM', 5], ['SKH', 3], ['SPN', 3], ['SKBN', 2],
]
/** Di akhir pekan hanya permohonan online yang masuk. */
const BOBOT_ONLINE = BOBOT_JENIS.filter(([kode]) => JENIS_SURAT_BAWAAN.some((j) => j.kode === kode && j.online))
/** Rata-rata permohonan per hari menurut hari dalam pekan (Minggu = 0); ditambah surat dari mutasi ≈ 65 per 30 hari. */
const RATA_HARIAN = [0.3, 2.6, 2.6, 2.6, 2.6, 2.6, 0.6] as const

const KEPERLUAN_SKD = ['pendaftaran sekolah anak', 'persyaratan melamar pekerjaan', 'pembukaan rekening bank', 'pengurusan BPJS Kesehatan', 'pengajuan kredit usaha rakyat']
const KEPERLUAN_SPCK = ['melamar pekerjaan', 'persyaratan kerja di perusahaan perkebunan', 'pendaftaran calon anggota TNI/Polri', 'persyaratan kerja ke luar negeri']
const KEPERLUAN_SKBM = ['persyaratan melamar pekerjaan', 'pendaftaran sekolah kedinasan', 'persyaratan administrasi bank']
const KEPERLUAN_SKP = ['pengajuan beasiswa anak', 'persyaratan keringanan biaya sekolah', 'pengajuan kredit usaha rakyat']
type KeperluanSktm = 'Pendidikan' | 'Kesehatan' | 'Lainnya'
const INSTANSI_SKTM: Readonly<Record<KeperluanSktm, readonly string[]>> = {
  Pendidikan: ['SMA Negeri 1 Teluk Meranti', 'SMP Negeri 2 Teluk Meranti', 'Universitas Riau'],
  Kesehatan: ['RSUD Selasih Pangkalan Kerinci', 'Puskesmas Teluk Meranti'],
  Lainnya: ['Dinas Sosial Kabupaten Pelalawan'],
}
const USAHA: readonly (readonly [string, string])[] = [
  ['Warung Sembako Berkah', 'Perdagangan eceran'], ['Ikan Salai Kampar', 'Pengolahan ikan'], ['Bengkel Motor Jaya', 'Jasa servis sepeda motor'],
  ['Kedai Kopi Simpang Tiga', 'Usaha makanan dan minuman'], ['Kerupuk Ikan Selais', 'Industri rumah tangga'], ['Toko Tani Subur', 'Perdagangan sarana pertanian'],
]
const PASANGAN_L = ['Rahmat Hidayat', 'Dedi Kurniawan', 'Andi Saputra', 'Fajar Ramadhan', 'Rizky Pratama']
const PASANGAN_P = ['Putri Ayu Lestari', 'Nurul Hidayah', 'Dewi Sartika', 'Rina Wulandari', 'Fitri Handayani']
const ALAMAT_PASANGAN = [
  'Jl. Garuda Sakti Gg. Sepakat No. 14, Simpang Baru, Tampan, Kota Pekanbaru',
  'RT 003/RW 002, Kerinci Kota, Pangkalan Kerinci, Pelalawan',
  'Jl. Prof. M. Yamin Gg. Mawar No. 3, Langgini, Bangkinang Kota, Kampar',
]
const DOKUMEN_BEDA = ['Ijazah SD', 'Akta Kelahiran', 'Buku Nikah', 'Kartu BPJS Kesehatan']
const BARANG_HILANG = ['KTP elektronik', 'Kartu Keluarga', 'Buku tabungan BRI', 'STNK sepeda motor', 'Ijazah SMA']
const TEMPAT_HILANG = ['Pasar Teluk Meranti', 'perjalanan ke Pangkalan Kerinci', 'dermaga penyeberangan Teluk Meranti', 'sekitar rumah']
const ALASAN_TOLAK = [
  'Foto KTP tidak terbaca. Silakan unggah ulang dengan cahaya yang cukup.',
  'Pengantar RT belum dilampirkan.',
  'Nama di KK berbeda dengan KTP; ajukan Surat Keterangan Beda Nama lebih dulu.',
  'Permohonan ganda; surat yang sama sudah diproses.',
]
const ALASAN_BATAL = ['Salah ketik pada isian; diganti surat baru.', 'Pemohon membatalkan keperluannya.', 'Keperluan tertulis keliru; diganti surat baru.']
const BERPENGHASILAN: ReadonlySet<Pekerjaan> = new Set<Pekerjaan>([
  'Petani/Pekebun', 'Nelayan/Perikanan', 'Pedagang', 'Wiraswasta', 'Buruh Harian Lepas', 'Buruh Tani/Perkebunan',
  'Karyawan Swasta', 'Sopir', 'Tukang Kayu', 'Tukang Jahit', 'Peternak',
])

// --- Waktu dinding WIB: hari = hari kalender sejak 1970-01-01, menit = menit sejak tengah malam ---
const pada = (hari: number, menit: number) => hari * HARI_MS + menit * MENIT_MS - WIB_MS
const hariDari = (ms: number) => Math.floor((ms + WIB_MS) / HARI_MS)
const menitDari = (ms: number) => Math.floor(((ms + WIB_MS) % HARI_MS) / MENIT_MS)
const hariDalamPekan = (hari: number) => new Date(hari * HARI_MS).getUTCDay()
const hariKerja = (hari: number) => hariDalamPekan(hari) !== 0 && hariDalamPekan(hari) !== 6
const hariTanggal = (tanggal: string) => Math.round(Date.parse(`${tanggal}T00:00:00Z`) / HARI_MS)
const iso = (ms: number) => waktuIsoWib(new Date(ms))
/** Hari kerja ke-n sesudah (n > 0) atau sebelum (n < 0) `hari`. */
function geserHariKerja(hari: number, n: number): number {
  let h = hari
  for (let sisa = Math.abs(n); sisa > 0; ) {
    h += Math.sign(n)
    if (hariKerja(h)) sisa--
  }
  return h
}
const slug = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const pelaku = (x: { id: string; nama: string }): Pelaku => ({ id: x.id, nama: x.nama })

type Opsi = {
  desa: Desa
  dusun: readonly Dusun[]
  penduduk: readonly Penduduk[]
  mutasi: readonly Mutasi[]
  pengguna: readonly Pengguna[]
  acuan: Date
}
export type HasilSurat = { jenisSurat: JenisSurat[]; permohonan: Permohonan[]; aktivitas: Aktivitas[] }
type Draf = { p: Permohonan; ttd: { ms: number; oleh: Pengguna } | null }

/** Membangkitkan jenis surat, permohonan 12 bulan, antrean saat ini, dan Buku hari ini untuk surat (SPEC §12.6, §12.7). */
export function bangkitkanSurat(acak: Acak, o: Opsi): HasilSurat {
  const desaId = o.desa.id
  const jenisSurat: JenisSurat[] = JENIS_SURAT_BAWAAN.map((j) => ({
    ...structuredClone(j),
    id: `js_${o.desa.kodeSurat.toLowerCase()}_${j.kode.toLowerCase()}`,
    desaId,
  }))
  const jenisKode = (kode: string) => {
    const j = jenisSurat.find((x) => x.kode === kode)
    if (!j) throw new Error(`Jenis surat ${kode} tidak ada`)
    return j
  }
  const jenisId = (id: string) => {
    const j = jenisSurat.find((x) => x.id === id)
    if (!j) throw new Error(`Jenis surat ${id} tidak ada`)
    return j
  }
  const pegawai = (peran: Peran) => {
    const p = o.pengguna.find((x) => x.desaId === desaId && x.peran === peran && x.aktif)
    if (!p) throw new Error(`Akun ${peran} desa demo tidak ada`)
    return p
  }
  const operator = pegawai('operator')
  const sekdes = pegawai('sekdes')
  const kades = pegawai('kades')
  const pengolah = () => (acak.peluang(0.8) ? operator : sekdes)

  const sekarang = o.acuan.getTime()
  const batas = sekarang - 5 * MENIT_MS
  const hariIni = hariDari(sekarang)
  const kemarin = geserHariKerja(hariIni, -1)
  const duaHariLalu = geserHariKerja(hariIni, -2)

  const umur = (p: Penduduk) => hitungUmur(p.tanggalLahir, o.acuan).tahun
  const warga = o.penduduk.filter((p) => p.desaId === desaId)
  const indeks = new Map(warga.map((p) => [p.id, p]))
  const penduduk = (id: string) => {
    const p = indeks.get(id)
    if (!p) throw new Error(`Penduduk ${id} tidak ada`)
    return p
  }
  const idPersona = new Set(PERSONA.flatMap((k) => k.anggota.map((a) => a.id)))
  // Anggota keluarga persona tidak diambil acak, supaya riwayat surat alur demo tetap bersih (SPEC §12.6).
  const dewasa = warga.filter((p) => p.statusDasar === 'Hidup' && !idPersona.has(p.id) && umur(p) >= 17)
  const SYARAT_PEMOHON: Partial<Record<string, (p: Penduduk) => boolean>> = {
    SKU: (p) => p.pekerjaan === 'Wiraswasta' || p.pekerjaan === 'Pedagang' || p.pekerjaan === 'Perdagangan' || p.pekerjaan === 'Industri',
    SKP: (p) => p.pekerjaan !== null && BERPENGHASILAN.has(p.pekerjaan),
    SPCK: (p) => umur(p) <= 40,
    SKBM: (p) => p.statusPerkawinan === 'Belum Kawin',
    SPN: (p) => p.statusPerkawinan === 'Belum Kawin' && umur(p) >= 19 && umur(p) <= 40,
  }
  const kolam = new Map<string, Penduduk[]>()
  const calonPemohon = (kode: string): Penduduk[] => {
    const ada = kolam.get(kode)
    if (ada) return ada
    const syarat = SYARAT_PEMOHON[kode]
    const cocok = syarat ? dewasa.filter(syarat) : dewasa
    const daftar = cocok.length > 0 ? cocok : dewasa
    kolam.set(kode, daftar)
    return daftar
  }
  const anakSekolah = (p: Penduduk) =>
    warga.find((a) => a.keluargaId === p.keluargaId && a.hubunganKeluarga === 'Anak' && a.statusDasar === 'Hidup' && umur(a) >= 6 && umur(a) <= 22)

  function isianUntuk(kode: string, p: Penduduk, masuk: number): Record<string, string> {
    switch (kode) {
      case 'SKD':
        return { keperluan: acak.pilih(KEPERLUAN_SKD) }
      case 'SKTM': {
        const keperluan = acak.berbobot<KeperluanSktm>([['Pendidikan', 50], ['Kesehatan', 40], ['Lainnya', 10]])
        const anak = keperluan === 'Pendidikan' ? anakSekolah(p) : undefined
        return { keperluan, instansiTujuan: acak.pilih(INSTANSI_SKTM[keperluan]), anggotaDibantu: anak?.nama ?? '' }
      }
      case 'SKU': {
        const [namaUsaha, jenisUsaha] = acak.pilih(USAHA)
        return { namaUsaha, jenisUsaha, alamatUsaha: alamatLengkap(p, o.dusun, o.desa.istilahWilayah), mulaiUsaha: String(acak.bulat(2008, 2025)) }
      }
      case 'SPCK':
        return { keperluan: acak.pilih(KEPERLUAN_SPCK) }
      case 'SKP':
        return { penghasilan: String(acak.bulat(30, 70) * 50_000), keperluan: acak.pilih(KEPERLUAN_SKP) }
      case 'SKBM':
        return { keperluan: acak.pilih(KEPERLUAN_SKBM) }
      case 'SPN': {
        const jenisKelamin = p.jenisKelamin === 'L' ? 'P' : 'L'
        const lahir = `${acak.bulat(1992, 2004)}-${pad2(acak.bulat(1, 12))}-${pad2(acak.bulat(1, 28))}`
        return {
          namaPasangan: acak.pilih(jenisKelamin === 'P' ? PASANGAN_P : PASANGAN_L),
          nikPasangan: buatNik({ kodeWilayah: '147101', tanggalLahir: lahir, jenisKelamin, nomorUrut: acak.bulat(8001, 9999) }),
          alamatPasangan: acak.pilih(ALAMAT_PASANGAN),
          rencanaTanggal: tanggalIsoWib(new Date(masuk + acak.bulat(21, 60) * HARI_MS)),
        }
      }
      case 'SKBN':
        return {
          namaLain: p.nama.endsWith('h') ? p.nama.slice(0, -1) : `${p.nama}h`,
          jenisDokumen: acak.pilih(DOKUMEN_BEDA),
          nomorDokumen: `${acak.bulat(100_000, 999_999)}/${acak.bulat(1998, 2020)}`,
        }
      case 'SKH':
        return {
          barangHilang: acak.pilih(BARANG_HILANG),
          waktuHilang: `${formatTanggal(tanggalIsoWib(new Date(masuk - acak.bulat(1, 6) * HARI_MS)))}, ${acak.pilih(['pagi hari', 'siang hari', 'sore hari'])}`,
          tempatHilang: acak.pilih(TEMPAT_HILANG),
        }
      default:
        throw new Error(`Isian contoh untuk ${kode} belum ada`)
    }
  }

  function lampiranUntuk(j: JenisSurat, nama: string): Lampiran[] {
    return j.syarat
      .filter((s) => !s.includes('(opsional)') || acak.peluang(0.5))
      .map((s, i) => {
        const syarat = s.replace(/\s*\(opsional\)/, '')
        return { id: `lmp_${i + 1}`, syarat, berkas: `${slug(syarat)}-${slug(nama)}.${acak.peluang(0.85) ? 'jpg' : 'pdf'}`, ukuranKb: acak.bulat(140, 900) }
      })
  }

  const entri = (kejadian: KejadianSurat, ms: number, oleh: Pelaku, catatan: string | null = null): EntriRiwayatSurat => ({
    id: acak.id('rws'),
    kejadian,
    waktu: iso(ms),
    oleh,
    catatan,
  })

  function baru(j: JenisSurat, kanal: Kanal, pemohon: Penduduk, masuk: number, isian: Record<string, string>, pembuat: Pengguna = operator): Permohonan {
    return {
      id: acak.id('srt'), desaId, dusunId: pemohon.dusunId, noUrut: 1, jenisId: j.id, kanal, pemohonId: pemohon.id,
      subjekId: null, mutasiId: null, isian, status: 'menunggu', tahap: null, dikembalikan: null, penolakan: null,
      pembatalan: null, diambil: null, masukPada: iso(masuk), ditutupPada: null,
      lampiran: kanal === 'online' ? lampiranUntuk(j, pemohon.nama) : [],
      catatanInternal: null,
      riwayat: [kanal === 'online' ? entri('diajukan', masuk, pelaku(pemohon)) : entri('dibuat', masuk, pelaku(pembuat))],
      terbit: null,
    }
  }

  const draf: Draf[] = []

  /** Waktu tanda tangan: 60% di hari yang sama, 30% hari kerja berikutnya, sisanya 2–3 hari kerja (median ≈ 1 hari). */
  function waktuSelesai(masuk: number): number {
    const h = hariDari(masuk)
    const r = acak.angka()
    if (r < 0.6 && hariKerja(h) && menitDari(masuk) < 13 * 60) {
      return Math.max(masuk + acak.bulat(45, 180) * MENIT_MS, pada(h, BUKA + acak.bulat(15, 60)))
    }
    return pada(geserHariKerja(h, r < 0.9 ? 1 : acak.bulat(2, 3)), acak.bulat(BUKA + 15, 15 * 60))
  }

  /** Permohonan yang sudah ditutup: proses, (paraf), tanda tangan; sebagian ditolak, dibatalkan, atau sudah diambil. */
  function tutup(p: Permohonan, j: JenisSurat, selesai: number, nasib: 'selesai' | 'ditolak' | 'dibatalkan') {
    const masuk = Date.parse(p.masukPada)
    if (nasib === 'ditolak') {
      const oleh = pelaku(pengolah())
      const alasan = acak.pilih(ALASAN_TOLAK)
      Object.assign(p, { status: 'ditolak', ditutupPada: iso(selesai), penolakan: { oleh, pada: iso(selesai), catatan: alasan } })
      p.riwayat.push(entri('tolak', selesai, oleh, alasan))
      draf.push({ p, ttd: null })
      return
    }
    const olehProses = pengolah()
    const langkah: [KejadianSurat, Pengguna][] = [
      ...(p.kanal === 'online' ? [['proses', olehProses] as [KejadianSurat, Pengguna]] : []),
      ['ajukan-ttd', olehProses],
      ...(j.wajibParaf ? [['paraf', sekdes] as [KejadianSurat, Pengguna]] : []),
    ]
    // Jarak mundur dari tanda tangan, lalu dijaga tetap setelah waktu masuk dan berurutan.
    const mundur: number[] = []
    let t = selesai
    for (let i = 0; i < langkah.length; i++) {
      t -= acak.bulat(8, 40) * MENIT_MS
      mundur.unshift(t)
    }
    let sebelum = masuk
    langkah.forEach(([kejadian, oleh], i) => {
      sebelum = Math.max(mundur[i], sebelum + MENIT_MS)
      p.riwayat.push(entri(kejadian, sebelum, pelaku(oleh)))
    })
    const tTtd = Math.max(selesai, sebelum + MENIT_MS)
    const penandatangan = j.bolehAtasNama && acak.peluang(0.15) ? sekdes : kades
    // Catatan berisi nomor surat; diisi saat penomoran di bawah.
    p.riwayat.push(entri('tandatangani', tTtd, pelaku(penandatangan)))
    Object.assign(p, { status: 'selesai', ditutupPada: iso(tTtd) })
    draf.push({ p, ttd: { ms: tTtd, oleh: penandatangan } })
    if (nasib === 'dibatalkan') {
      const tBatal = pada(geserHariKerja(hariDari(tTtd), acak.bulat(1, 3)), acak.bulat(BUKA + 30, 14 * 60))
      if (tBatal <= batas) {
        const oleh = pelaku(acak.peluang(0.5) ? kades : sekdes)
        const alasan = acak.pilih(ALASAN_BATAL)
        Object.assign(p, { status: 'dibatalkan', pembatalan: { oleh, pada: iso(tBatal), catatan: alasan } })
        p.riwayat.push(entri('batalkan', tBatal, oleh, alasan))
        return
      }
    }
    if (p.kanal === 'loket') {
      const tAmbil = acak.peluang(0.7)
        ? tTtd + acak.bulat(20, 90) * MENIT_MS
        : pada(geserHariKerja(hariDari(tTtd), 1), acak.bulat(BUKA + 15, 14 * 60))
      if (tAmbil <= batas && (hariDari(tAmbil) !== hariIni || menitDari(tAmbil) >= AWAL_HARI_INI)) {
        p.diambil = { pada: iso(tAmbil), oleh: pelaku(operator) }
        p.riwayat.push(entri('tandai-diambil', tAmbil, pelaku(operator)))
      }
    }
  }

  // 1. Permohonan harian 12 bulan terakhir, semuanya sudah ditutup. Yang belum sempat ditandatangani dilewati.
  for (let h = hariIni - HARI_RIWAYAT_SURAT; h <= hariIni; h++) {
    const rata = RATA_HARIAN[hariDalamPekan(h)]
    const jumlah = Math.floor(rata) + (acak.peluang(rata % 1) ? 1 : 0)
    for (let i = 0; i < jumlah; i++) {
      const kerja = hariKerja(h)
      const kode = acak.berbobot(kerja ? BOBOT_JENIS : BOBOT_ONLINE)
      const j = jenisKode(kode)
      const kanal: Kanal = !kerja || (j.online && acak.peluang(0.4)) ? 'online' : 'loket'
      const awal = h === hariIni ? AWAL_HARI_INI : kanal === 'online' ? 6 * 60 : BUKA
      const akhir = kanal === 'online' ? 22 * 60 : hariDalamPekan(h) === 5 ? 11 * 60 : 14 * 60 + 30
      if (awal >= akhir) continue
      const masuk = pada(h, acak.bulat(awal, akhir))
      const selesai = waktuSelesai(masuk)
      if (selesai > batas) continue
      const nasib =
        kanal === 'online'
          ? acak.berbobot<'selesai' | 'ditolak' | 'dibatalkan'>([['selesai', 89], ['ditolak', 8], ['dibatalkan', 3]])
          : acak.berbobot<'selesai' | 'dibatalkan'>([['selesai', 97], ['dibatalkan', 3]])
      const pemohon = acak.pilih(calonPemohon(kode))
      tutup(baru(j, kanal, pemohon, masuk, isianUntuk(kode, pemohon, masuk)), j, selesai, nasib)
    }
  }

  // 2. Surat kelahiran, kematian, dan pengantar pindah dari mutasi yang tercatat.
  for (const m of o.mutasi) {
    if (m.desaId !== desaId || m.jenis === 'datang') continue
    const hMutasi = hariTanggal(m.tanggal)
    if (hMutasi < hariIni - HARI_RIWAYAT_SURAT || hMutasi >= hariIni) continue
    if (!acak.peluang(m.jenis === 'lahir' ? 0.9 : 0.8)) continue
    let hMasuk = hMutasi + acak.bulat(0, 2)
    if (!hariKerja(hMasuk)) hMasuk = geserHariKerja(hMasuk, 1)
    if (hMasuk >= hariIni) continue
    const masuk = pada(hMasuk, acak.bulat(BUKA, 14 * 60))
    const selesai = waktuSelesai(masuk)
    if (selesai > batas) continue
    const subjek = indeks.get(m.pendudukIds[0])
    if (!subjek) continue
    if (m.jenis === 'lahir') {
      const r = m.rincian
      const pemohon = [r.ayahId, r.ibuId].map((id) => (id ? indeks.get(id) : undefined)).find((x) => x?.statusDasar === 'Hidup')
      if (!pemohon) continue
      const j = jenisKode('SKL')
      const p = baru(j, 'loket', pemohon, masuk, { pelapor: r.pelapor })
      Object.assign(p, { subjekId: subjek.id, mutasiId: m.id })
      tutup(p, j, selesai, 'selesai')
    } else if (m.jenis === 'meninggal') {
      const r = m.rincian
      const pemohon = warga.find((x) => x.keluargaId === subjek.keluargaId && x.id !== subjek.id && x.statusDasar === 'Hidup' && umur(x) >= 17)
      if (!pemohon) continue
      const j = jenisKode('SKM')
      const p = baru(j, 'loket', pemohon, masuk, { tanggalMeninggal: m.tanggal, tempatMeninggal: r.tempat, sebab: r.sebab, pelapor: r.pelapor })
      Object.assign(p, { subjekId: subjek.id, mutasiId: m.id })
      tutup(p, j, selesai, 'selesai')
    } else {
      const r = m.rincian
      const t = r.tujuan
      const anggota = m.pendudukIds.flatMap((id) => indeks.get(id)?.nama ?? [])
      const j = jenisKode('SPP')
      const p = baru(j, 'loket', subjek, masuk, {
        alamatTujuan: `${t.alamat}, ${t.desa}, Kec. ${t.kecamatan}, ${t.kabupaten}, ${t.provinsi}`,
        alasan: r.alasan,
        anggotaPindah: anggota.join(', '),
      })
      p.mutasiId = m.id
      tutup(p, j, selesai, 'selesai')
    }
  }

  // 3. Antrean saat ini (SPEC §12.6): 7 menunggu, 5 diproses, 3 perlu TTD.
  /** Jam hari ini `mundur` menit sebelum batas, paling awal 07.30; bila tidak muat, jam cadangan di hari kerja kemarin. */
  const hariIniAtau = (mundur: number, cadangan: number) => {
    const t = batas - mundur * MENIT_MS
    return t >= pada(hariIni, AWAL_HARI_INI) ? t : pada(kemarin, cadangan)
  }
  /** Untuk loket: hanya hari kerja 08.00–15.00; bila demo dibuka malam, jamnya ditarik ke sore tadi. */
  const loketHariIniAtau = (mundur: number, cadangan: number) => {
    const t = Math.min(batas, pada(hariIni, 15 * 60)) - mundur * MENIT_MS
    return hariKerja(hariIni) && t >= pada(hariIni, BUKA) ? t : pada(kemarin, cadangan)
  }
  const sudahDipakai = new Set<string>()
  const ambilPemohon = (calon: readonly Penduduk[]) => {
    const bebas = calon.filter((p) => !sudahDipakai.has(p.id))
    const p = acak.pilih(bebas.length > 0 ? bebas : calon)
    sudahDipakai.add(p.id)
    return p
  }
  const antre = (kode: string, kanal: Kanal, masuk: number, pembuat: Pengguna = operator) => {
    const pemohon = ambilPemohon(calonPemohon(kode))
    const p = baru(jenisKode(kode), kanal, pemohon, masuk, isianUntuk(kode, pemohon, masuk), pembuat)
    draf.push({ p, ttd: null })
    return p
  }

  for (const masuk of [
    pada(duaHariLalu, 7 * 60 + 12), pada(duaHariLalu, 20 * 60 + 31), pada(kemarin, 9 * 60 + 47), pada(kemarin, 21 * 60 + 5),
    hariIniAtau(150, 22 * 60 + 10), hariIniAtau(70, 22 * 60 + 40), hariIniAtau(25, 23 * 60 + 15),
  ]) {
    antre(acak.berbobot(BOBOT_ONLINE), 'online', masuk)
  }

  // Siti Rahmah: Domisili online yang sedang diproses (alur demo 1 dimulai tanpa SKTM).
  const siti = penduduk('pdk_siti_rahmah')
  const pSiti = baru(jenisKode('SKD'), 'online', siti, pada(kemarin, 10 * 60 + 12), { keperluan: 'pendaftaran sekolah anak' })
  pSiti.status = 'diproses'
  pSiti.riwayat.push(entri('proses', pada(kemarin, 13 * 60 + 30), pelaku(operator)))
  draf.push({ p: pSiti, ttd: null })

  // Zulkifli: SKU dari loket, dikembalikan Kades karena alamat usahanya belum lengkap (SPEC §12.9).
  const zulkifli = penduduk('pdk_zulkifli')
  const pZul = baru(jenisKode('SKU'), 'loket', zulkifli, pada(duaHariLalu, 10 * 60 + 15), {
    namaUsaha: 'Toko Bangunan Rengas Jaya', jenisUsaha: 'Perdagangan bahan bangunan', alamatUsaha: 'Teluk Rengas', mulaiUsaha: '2016',
  })
  const catatanKembali = 'Alamat usaha belum lengkap. Tuliskan RT/RW dan nama dusunnya.'
  const tKembali = pada(kemarin, 14 * 60 + 20)
  pZul.riwayat.push(entri('ajukan-ttd', pada(duaHariLalu, 10 * 60 + 31), pelaku(operator)), entri('kembalikan', tKembali, pelaku(kades), catatanKembali))
  Object.assign(pZul, {
    status: 'diproses',
    dikembalikan: { oleh: pelaku(kades), pada: iso(tKembali), catatan: catatanKembali },
    catatanInternal: 'Pemohon sudah ditelepon dan akan datang melengkapi alamat usaha.',
  })
  draf.push({ p: pZul, ttd: null })

  antre(acak.berbobot(BOBOT_JENIS), 'loket', pada(kemarin, 14 * 60 + 5)).status = 'diproses'
  antre(acak.berbobot(BOBOT_JENIS), 'loket', loketHariIniAtau(55, 14 * 60 + 40), sekdes).status = 'diproses'
  const daring = antre(acak.berbobot(BOBOT_ONLINE), 'online', pada(duaHariLalu, 16 * 60 + 20))
  daring.status = 'diproses'
  daring.riwayat.push(entri('proses', pada(kemarin, 8 * 60 + 20), pelaku(operator)))

  // Perlu TTD: SKTM di tahap paraf, Domisili dan Pengantar SKCK di tahap tanda tangan.
  const keluargaSekolah = dewasa.filter((p) => anakSekolah(p) !== undefined)
  const pemohonSktm = ambilPemohon(keluargaSekolah.length > 0 ? keluargaSekolah : dewasa)
  const pSktm = baru(jenisKode('SKTM'), 'loket', pemohonSktm, pada(kemarin, 11 * 60), {
    keperluan: 'Pendidikan', instansiTujuan: 'SMA Negeri 1 Teluk Meranti', anggotaDibantu: anakSekolah(pemohonSktm)?.nama ?? '',
  })
  pSktm.riwayat.push(entri('ajukan-ttd', pada(kemarin, 11 * 60 + 12), pelaku(operator)))
  Object.assign(pSktm, { status: 'perlu-ttd', tahap: 'paraf' })
  draf.push({ p: pSktm, ttd: null })
  const pSkd = antre('SKD', 'online', pada(kemarin, 6 * 60 + 50))
  pSkd.riwayat.push(entri('proses', pada(kemarin, 8 * 60 + 30), pelaku(operator)), entri('ajukan-ttd', pada(kemarin, 8 * 60 + 41), pelaku(operator)))
  Object.assign(pSkd, { status: 'perlu-ttd', tahap: 'tanda-tangan' })
  const masukSpck = loketHariIniAtau(35, 15 * 60)
  const pSpck = antre('SPCK', 'loket', masukSpck)
  pSpck.riwayat.push(entri('ajukan-ttd', masukSpck + 8 * MENIT_MS, pelaku(operator)))
  Object.assign(pSpck, { status: 'perlu-ttd', tahap: 'tanda-tangan' })

  // 4. Nomor urut permohonan per tahun masuk.
  const urutMasuk = new Map<string, number>()
  for (const { p } of [...draf].sort((a, b) => a.p.masukPada.localeCompare(b.p.masukPada))) {
    const tahun = p.masukPada.slice(0, 4)
    const n = (urutMasuk.get(tahun) ?? 0) + 1
    urutMasuk.set(tahun, n)
    p.noUrut = n
  }

  // 5. Nomor surat menurut urutan tanda tangan per tahun kalender (SPEC §7.2), termasuk yang kemudian dibatalkan.
  const nomorTahun = new Map<number, number>()
  const kodeTerpakai = new Set<string>()
  const ditandatangani = draf.flatMap((d) => (d.ttd ? [{ p: d.p, ttd: d.ttd }] : [])).sort((a, b) => a.ttd.ms - b.ttd.ms)
  for (const { p, ttd } of ditandatangani) {
    const j = jenisId(p.jenisId)
    const tanggal = tanggalIsoWib(new Date(ttd.ms))
    const tahun = Number(tanggal.slice(0, 4))
    const urut = (nomorTahun.get(tahun) ?? 0) + 1
    nomorTahun.set(tahun, urut)
    let kode = buatKodeVerifikasi(o.desa.kodeSurat, acak.angka)
    while (kodeTerpakai.has(kode)) kode = buatKodeVerifikasi(o.desa.kodeSurat, acak.angka)
    kodeTerpakai.add(kode)
    const nomor = formatNomorSurat(FORMAT_NOMOR_BAWAAN, { klasifikasi: j.klasifikasi, kodeJenis: j.kode, urut, kodeDesa: o.desa.kodeSurat, tanggal })
    p.terbit = {
      nomor, tahun, urut, kodeVerifikasi: kode, pada: iso(ttd.ms),
      penandatangan: { id: ttd.oleh.id, nama: ttd.oleh.nama, peran: ttd.oleh.peran === 'sekdes' ? 'sekdes' : 'kades' },
      mode: 'tte',
      berlakuSampai: berlakuSampai(tanggal, j.masaBerlakuBulan),
      lembar: susunLembar({
        jenis: j, isian: p.isian, pemohon: penduduk(p.pemohonId), subjek: p.subjekId ? penduduk(p.subjekId) : null,
        mutasi: o.mutasi.find((m) => m.id === p.mutasiId) ?? null, desa: o.desa, dusun: o.dusun, tanggal,
      }),
    }
    const catatan = p.riwayat.find((r) => r.kejadian === 'tandatangani')
    if (catatan) catatan.catatan = nomor
  }

  // 6. Buku hari ini (SPEC §5.3): permohonan masuk, surat terbit, ditolak, dan dibatalkan hari ini.
  const aktivitas: Aktivitas[] = []
  const catat = (waktu: string, jenis: JenisAktivitas, ringkasan: string, oleh: Pelaku | null, p: Permohonan) => {
    if (hariDari(Date.parse(waktu)) !== hariIni) return
    aktivitas.push({ id: acak.id('akt'), desaId, dusunId: p.dusunId, waktu, jenis, ringkasan, oleh, rujukan: { jenis: 'permohonan', id: p.id } })
  }
  for (const { p } of draf) {
    const kode = jenisId(p.jenisId).kode
    const nama = penduduk(p.pemohonId).nama
    catat(p.masukPada, 'permohonan-masuk', `Permohonan ${kode} · ${nama} (${p.kanal})`, p.kanal === 'loket' ? p.riwayat[0].oleh : null, p)
    if (p.terbit) catat(p.terbit.pada, 'surat-terbit', `Surat terbit · ${kode} ${p.terbit.nomor} · ${nama}`, pelaku(p.terbit.penandatangan), p)
    if (p.penolakan) catat(p.penolakan.pada, 'surat-ditolak', `Permohonan ditolak · ${kode} · ${nama}`, p.penolakan.oleh, p)
    if (p.pembatalan) catat(p.pembatalan.pada, 'surat-dibatalkan', `Surat dibatalkan · ${kode} ${p.terbit?.nomor ?? ''}`, p.pembatalan.oleh, p)
  }

  return { jenisSurat, permohonan: draf.map((d) => d.p).sort((a, b) => a.masukPada.localeCompare(b.masukPada)), aktivitas }
}
