import type { Aktivitas } from '@/domain/aktivitas/schema'
import type { Aset } from '@/domain/aset/schema'
import type { PenerimaBansos, ProgramBansos } from '@/domain/bansos/schema'
import type { LaporanImpor } from '@/domain/impor/schema'
import type { Keluarga } from '@/domain/keluarga/schema'
import type { Apbdes } from '@/domain/keuangan/schema'
import type { Langganan, PenggunaKonsol } from '@/domain/konsol/schema'
import type { Pengukuran, Posyandu, StatusGizi } from '@/domain/kesehatan/schema'
import type { LaporanData } from '@/domain/laporan/schema'
import type { Pengurus } from '@/domain/lembaga/schema'
import type { Mutasi } from '@/domain/mutasi/schema'
import type { Notifikasi } from '@/domain/notifikasi/schema'
import type { Pengaduan } from '@/domain/pengaduan/schema'
import type { Kegiatan } from '@/domain/pembangunan/schema'
import type { Riwayat } from '@/domain/penduduk/riwayat'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Pengguna } from '@/domain/pengguna/schema'
import type { PetaDesa } from '@/domain/peta/schema'
import type { SuratMasuk } from '@/domain/surat/arsip'
import type { JenisSurat } from '@/domain/surat/jenis'
import type { PengaturanSurat } from '@/domain/surat/pengaturan'
import type { Permohonan } from '@/domain/surat/permohonan'
import type { Agenda, Artikel, FotoGaleri, Pengumuman, Potensi, ProfilDesa, TampilanWebsite, Umkm } from '@/domain/website/schema'
import type { Desa, Dusun } from '@/domain/wilayah/schema'

/** Naikkan setiap kali seed atau struktur data berubah; data lama di IndexedDB otomatis diganti (SPEC §12). */
export const VERSI_DATA = 19

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
  tampilanWebsite: TampilanWebsite[]
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
  rekamDesa: RekamDesa[]
  riwayatMasuk: MasukPanel[]
  /** Alamat lama desa (SPEC-V0.2 §4.2): tetap mengarah ke desanya selamanya dan tidak boleh dipakai desa lain. */
  aliasAlamat: AliasAlamat[]
  /** Akses bantuan Tim Sinfodes ke panel desa beserta jejaknya (SPEC-V0.2 §5.3). */
  aksesBantuan: AksesBantuan[]
}
