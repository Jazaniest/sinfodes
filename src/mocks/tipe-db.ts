import type { Aktivitas } from '@/domain/aktivitas/schema'
import type { Aset } from '@/domain/aset/schema'
import type { PenerimaBansos, ProgramBansos } from '@/domain/bansos/schema'
import type { BarisMentah } from '@/domain/kabupaten/data-gabungan'
import type { LampiranSiaran, SasaranSiaran } from '@/domain/kabupaten/siaran'
import type { UkuranBulan } from '@/domain/indeks/hitung'
import type { KategoriDesa } from '@/domain/indeks/kategori'
import type { TingkatLencana } from '@/domain/indeks/lencana'
import type { Periode } from '@/domain/indeks/periode'
import type { LaporanImpor } from '@/domain/impor/schema'
import type { Keluarga } from '@/domain/keluarga/schema'
import type { Apbdes } from '@/domain/keuangan/schema'
import type { KabupatenMitra, PenggunaKabupaten } from '@/domain/kabupaten/schema'
import type { Langganan, PenggunaKonsol } from '@/domain/konsol/schema'
import type { Tagihan } from '@/domain/langganan/tagihan'
import type { Pengukuran, Posyandu, StatusGizi } from '@/domain/kesehatan/schema'
import type { LaporanData } from '@/domain/laporan/schema'
import type { Pengurus } from '@/domain/lembaga/schema'
import type { Mutasi } from '@/domain/mutasi/schema'
import type { Notifikasi } from '@/domain/notifikasi/schema'
import type { Pengaduan } from '@/domain/pengaduan/schema'
import type { Kegiatan } from '@/domain/pembangunan/schema'
import type { Riwayat } from '@/domain/penduduk/riwayat'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { ModulDesa } from '@/domain/pengaturan/modul'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { PetaDesa } from '@/domain/peta/schema'
import type { SuratMasuk } from '@/domain/surat/arsip'
import type { JenisSurat } from '@/domain/surat/jenis'
import type { PengaturanSurat } from '@/domain/surat/pengaturan'
import type { Permohonan } from '@/domain/surat/permohonan'
import type { Agenda, Artikel, FotoGaleri, Pengumuman, Potensi, ProfilDesa, Umkm } from '@/domain/website/schema'
import type { SitusDesa } from '@/domain/website/situs'
import type { Desa, Dusun, StatusDesa } from '@/domain/wilayah/schema'

/** Naikkan setiap kali seed atau struktur data berubah; data lama di IndexedDB otomatis diganti (SPEC §12). */
export const VERSI_DATA = 34

/** Modul yang menyala di satu desa (SPEC-V0.2 12.3). */
export type ModulDesaDb = ModulDesa & { desaId: string }

/** Satu perubahan status desa oleh Tim Sinfodes (SPEC-V0.2 §7, §10.5), dengan alasannya. */
export type RiwayatStatusDesa = {
  desaId: string
  dari: StatusDesa
  ke: StatusDesa
  alasan: string
  pada: string
  oleh: { id: string; nama: string }
}

/** Satu alamat lama desa, mis. slug v0.1 "sungai-sialang" untuk Sungai Sialang. */
export type AliasAlamat = { label: string; desaId: string }

/** Sesi Tim Sinfodes selama akses bantuan; `halaman` adalah path API yang dibuka (tanpa `/api/v1`). */
export type SesiBantuan = { id: string; olehId: string; olehNama: string; mulai: string; halaman: { jalur: string; waktu: string }[] }
/** Akses bantuan sementara yang diberikan desa (SPEC-V0.2 §5.3). `dicabut`: waktu desa mencabutnya, atau null. */
export type AksesBantuan = {
  id: string
  desaId: string
  diberiOlehId: string
  mulai: string
  sampai: string
  sembunyikanDataPribadi: boolean
  dicabut: string | null
  sesi: SesiBantuan[]
  /** Tiket terakhir yang diminta Tim Sinfodes dari Konsol: berlaku 60 detik dan dihapus begitu ditukar. */
  tiket?: { kode: string; berlakuSampai: string; olehId: string; olehNama: string } | null
}

/** Berkas impor yang sudah diperiksa dan menunggu konfirmasi (SPEC §6.8). */
export type SesiImpor = { id: string; desaId: string; olehId: string; laporan: LaporanImpor; selesai: boolean }

/** Riwayat pengukuran satu balita. Statusnya dihitung pembangkit data (SPEC §8); null bila belum pernah diukur. */
export type PengukuranBalita = { pendudukId: string; desaId: string; pengukuran: Pengukuran[]; status: StatusGizi | null }

/** Akun layanan warga: PIN dari kantor desa (SPEC §10). Demo menyimpan PIN apa adanya; produksi menyimpan hash (SPEC §15). */
export type AkunWarga = { pendudukId: string; desaId: string; pin: string; whatsapp: string }

/** Pengaman percobaan masuk warga, per NIK yang diketik, termasuk NIK yang tidak terdaftar (SPEC §10). */
export type PercobaanMasukWarga = { nik: string; gagal: number; terkunciSampai: string | null }

/** Kunci kiriman dari HP warga: Kirim ulang dengan kunci yang sama mengembalikan hasil pertama (SPEC §10). */
export type KirimanWarga = { kunci: string; pendudukId: string; jenis: 'permohonan' | 'laporan' | 'pengaduan'; rujukanId: string }

/** Pengaman verifikasi surat di website desa: waktu kode-kode salah dalam jendela 10 menit, per desa (SPEC §7.6, §3.4). */
export type PercobaanVerifikasi = { desaId: string; gagal: string[]; terkunciSampai: string | null }

/** Angka pemakaian desa tanpa data panel di demo (38 desa fiktif Konsol, SPEC §12.8). */
export type RekamDesa = {
  desaId: string
  jiwa: number
  /** Dua paragraf profil singkat untuk website minimal desa rekaman (7E-2); desa rekaman tak punya profil lengkap. */
  profilSingkat?: string[]
  kelengkapan: number | null
  penggunaAktif: number
  aktivitasTerakhir: string | null
  langkahSelesai: number
  suratPerBulan: { bulan: string; jumlah: number }[]
  masukPerMinggu: { mulai: string; jumlah: number }[]
  suratMingguIni: number
  kontak: { kades: string | null; operator: { nama: string; email: string } | null; sekdes: { nama: string; email: string } | null }
  /** Pemantauan wilayah (SPEC §11): median jam layanan surat 30 hari dan tanggapan pengaduan 90 hari, belanja APBDes tahun ini. */
  waktuLayananJam: number | null
  waktuTanggapanJam: number | null
  apbdes: { anggaran: number; realisasi: number } | null
  /** Dana Desa kabupaten (SPEC-V0.2 §8.3): belanja per bulan, Januari sampai bulan acuan; jumlahnya = `apbdes.realisasi`. */
  belanjaBulanan: { bulan: string; belanja: number }[] | null
  /** Data gabungan kabupaten (SPEC-V0.2 §8.3 butir 6): komposisi penduduk dan penerima bansos; null bila belum ada penduduk. */
  komposisi: Omit<BarisMentah, 'jiwa'> | null
}

/** Jejak satu desa dalam satu bulan kalender WIB untuk Indeks dan peringkat (SPEC-V0.2 §9). Baris bulan tutup dibekukan. */
export type UkuranBulanIndeks = UkuranBulan & { desaId: string; bulan: string }

/**
 * Lencana juara yang sudah terbit (SPEC-V0.2 §9.6): satu baris per desa di podium kecamatan atau kabupaten untuk satu kategori
 * dan satu periode tutup. `tampil` mengatur website desa; halaman bukti selalu bisa membuka kodenya.
 */
export type Lencana = {
  kode: string
  desaId: string
  kategori: KategoriDesa
  peringkat: number
  bersama: boolean
  tingkat: TingkatLencana
  wilayah: { kode: string; nama: string }
  periode: Periode
  nilai: number
  terbitPada: string
  tampil: boolean
}

/** Tenggat laporan yang diatur Admin Kabupaten (SPEC-V0.2 §8.3 butir 4). Tanggal "YYYY-MM-DD" WIB. */
export type TenggatLaporan = {
  id: string
  kabupatenKode: string
  nama: string
  tanggal: string
  dibuatPada: string
  dibuatOleh: { id: string; nama: string }
}

/** Tanda "Sudah dikirim" dari desa untuk satu tenggat; satu per desa per tenggat. */
export type KirimLaporan = { tenggatId: string; desaId: string; tanggal: string; oleh: { id: string; nama: string }; dicatatPada: string }

/**
 * Siaran kabupaten ke desa (SPEC-V0.2 §8.4). `desaIds`: desa sasaran yang dibekukan saat kirim, jadi desa yang bergabung
 * kemudian tidak menerima siaran lama. Tidak bisa diubah; `ditarik` diisi saat Admin menariknya.
 */
export type SiaranKabupaten = {
  id: string
  kabupatenKode: string
  judul: string
  isi: string
  lampiran: LampiranSiaran | null
  tindakLanjut: { tenggat: string } | null
  sasaran: SasaranSiaran
  desaIds: string[]
  dikirimPada: string
  dikirimOleh: { id: string; nama: string }
  ditarik: { pada: string; oleh: { id: string; nama: string } } | null
}

/** Status baca satu desa untuk satu siaran: dibuat saat siapa pun di desa itu pertama kali membukanya. */
export type BacaSiaran = {
  siaranId: string
  desaId: string
  dibaca: { pada: string; oleh: { id: string; nama: string } }
  tindakLanjut: { pada: string; oleh: { id: string; nama: string }; catatan: string } | null
}

/** Satu kali masuk panel admin: dasar "login per minggu" dan "pengguna aktif" di Konsol (SPEC §11). */
export type MasukPanel = { penggunaId: string; desaId: string; waktu: string }

export type DbDemo = {
  versiData: number
  /** Waktu ISO WIB saat data dibangkitkan; semua tanggal dihitung relatif terhadapnya (SPEC §12.7). */
  tanggalAcuan: string
  desa: Desa[]
  dusun: Dusun[]
  pengguna: Pengguna[]
  /** Termasuk mantan penduduk (Meninggal/Pindah); jumlah jiwa dihitung dari yang Hidup. */
  penduduk: Penduduk[]
  keluarga: Keluarga[]
  mutasi: Mutasi[]
  riwayat: Riwayat[]
  aktivitas: Aktivitas[]
  /** Laporan dari warga: perbaikan data dan kelahiran yang belum dicatat (SPEC §5.3, §10). */
  laporanData: LaporanData[]
  impor: SesiImpor[]
  /** Layanan Surat (SPEC §7, §12.6). */
  jenisSurat: JenisSurat[]
  permohonan: Permohonan[]
  pengaturanSurat: PengaturanSurat[]
  /** Register surat masuk (SPEC §7.4 layar 5). */
  suratMasuk: SuratMasuk[]
  /** Notifikasi per pengguna (SPEC §5.5). */
  notifikasi: Notifikasi[]
  /** Pengaduan warga beserta percakapannya (SPEC §8). */
  pengaduan: Pengaduan[]
  /** Bantuan sosial: program dan keluarga penerimanya (SPEC §8, §12.6). */
  programBansos: ProgramBansos[]
  penerimaBansos: PenerimaBansos[]
  /** Kesehatan: posyandu dan pengukuran balita (SPEC §8, §12.6). */
  posyandu: Posyandu[]
  pengukuranBalita: PengukuranBalita[]
  /** Geometri desa untuk Peta Desa (SPEC §8). */
  peta: PetaDesa[]
  /** Kegiatan pembangunan; anggarannya dibaca dari rincian APBDes (SPEC §8). */
  kegiatan: Kegiatan[]
  /** APBDes per tahun, disinkronkan dari Siskeudes (SPEC §8). */
  apbdes: Apbdes[]
  /** Inventaris aset desa (SPEC §8). */
  aset: Aset[]
  /** Pengurus lembaga desa, dipakai juga halaman Profil website (SPEC §8). */
  pengurusLembaga: Pengurus[]
  /** Website Desa (SPEC §8, §12.6). Isinya dikelola Operator dan Sekdes, ditampilkan website publik (Tahap 5). */
  artikel: Artikel[]
  pengumuman: Pengumuman[]
  agenda: Agenda[]
  galeri: FotoGaleri[]
  /** Tema dan (kelak) susunan website per desa (SPEC-V0.2 §11.6); menggantikan `tampilanWebsite` v0.1. */
  situs: SitusDesa[]
  /** Isi halaman Profil dan Potensi website (SPEC §9, §12.6): satu profil per desa, potensi, dan UMKM warga. */
  profilDesa: ProfilDesa[]
  potensi: Potensi[]
  umkm: Umkm[]
  /** Layanan mandiri warga (SPEC §10). */
  akunWarga: AkunWarga[]
  percobaanMasukWarga: PercobaanMasukWarga[]
  kirimanWarga: KirimanWarga[]
  percobaanVerifikasi: PercobaanVerifikasi[]
  /** Konsol Sinfodes (SPEC §11): akun konsol, langganan desa, angka desa tanpa data panel, dan riwayat masuk panel. */
  penggunaKonsol: PenggunaKonsol[]
  langganan: Langganan[]
  /** Tagihan langganan semua desa (SPEC-V0.2 §10). */
  tagihan: Tagihan[]
  /** Riwayat perubahan status desa, terlama dulu; dipakai Detail desa dan penentuan peserta peringkat (7D-2). */
  riwayatStatusDesa: RiwayatStatusDesa[]
  rekamDesa: RekamDesa[]
  riwayatMasuk: MasukPanel[]
  /** Alamat lama desa (SPEC-V0.2 §4.2): tetap mengarah ke desanya selamanya dan tidak boleh dipakai desa lain. */
  aliasAlamat: AliasAlamat[]
  /** Akses bantuan Tim Sinfodes ke panel desa beserta jejaknya (SPEC-V0.2 §5.3). */
  aksesBantuan: AksesBantuan[]
  /** Kabupaten mitra dan akunnya (SPEC-V0.2 §8). */
  kabupatenMitra: KabupatenMitra[]
  penggunaKabupaten: PenggunaKabupaten[]
  /** Tenggat laporan Dana Desa dan tanda kirim dari desa (SPEC-V0.2 §8.3 butir 4). */
  tenggatLaporan: TenggatLaporan[]
  kirimLaporan: KirimLaporan[]
  /** Siaran kabupaten dan status bacanya per desa (SPEC-V0.2 §8.4). */
  siaran: SiaranKabupaten[]
  bacaSiaran: BacaSiaran[]
  /** Jejak bulanan per desa untuk Indeks Desa Digital (SPEC-V0.2 §9). */
  ukuranIndeks: UkuranBulanIndeks[]
  /** Lencana juara dan kunci `musim:kode` periode tutup yang sudah diproses (SPEC-V0.2 §9.6). */
  lencana: Lencana[]
  periodeLencana: string[]
  /** Modul yang dinyalakan Sekretaris Desa, satu baris per desa (SPEC-V0.2 12.3). */
  modulDesa: ModulDesaDb[]
}
