import { z } from 'zod'
import { tanggalValid } from '../format/kalender'

export const JENIS_ISIAN = ['teks', 'angka', 'tanggal', 'pilihan'] as const
export type JenisIsian = (typeof JENIS_ISIAN)[number]

/** Isian tambahan satu jenis surat (SPEC §7.3, §7.4 layar 6). `kunci` sekaligus nama sisipannya di teks surat. */
export const isianTambahanSchema = z.object({
  kunci: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
  label: z.string().min(1),
  jenis: z.enum(JENIS_ISIAN),
  wajib: z.boolean(),
  pilihan: z.array(z.string().min(1)).nullable(),
  /** Angka rupiah ditulis "Rp1.250.000 (satu juta … rupiah)" di surat. */
  rupiah: z.boolean(),
  /** Dicetak sebagai baris tabel rincian di posisi [tabelRincian]. */
  diTabel: z.boolean(),
  keterangan: z.string().nullable(),
})
export type IsianTambahan = z.infer<typeof isianTambahanSchema>

/** Surat tentang orang lain memakai data subjeknya (bayi, almarhum); pemohonnya adalah pelapor (SPEC §7.4). */
export const SUBJEK_SURAT = ['pemohon', 'kelahiran', 'kematian'] as const
export type SubjekSurat = (typeof SUBJEK_SURAT)[number]

export const ASAL_JENIS = ['bawaan', 'desa'] as const
export type AsalJenis = (typeof ASAL_JENIS)[number]

/** SPEC §7.3. Klasifikasi, penandatangan, masa berlaku, syarat, isian, dan teks bisa diubah desa. */
export const jenisSuratSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  kode: z.string().regex(/^[A-Z]{2,5}$/),
  nama: z.string().min(1),
  klasifikasi: z.string().regex(/^\d{3}(\.\d+)?$/),
  subjek: z.enum(SUBJEK_SURAT),
  isian: z.array(isianTambahanSchema),
  /** Sekretaris Desa boleh menandatangani atas nama Kepala Desa. */
  bolehAtasNama: z.boolean(),
  wajibParaf: z.boolean(),
  /** Null berarti berlaku tanpa batas. */
  masaBerlakuBulan: z.number().int().min(1).nullable(),
  online: z.boolean(),
  syarat: z.array(z.string().min(1)),
  /** Paragraf dipisah baris kosong; sisipan ditulis [nama], [keperluan], dan seterusnya. */
  teks: z.string().min(1),
  aktif: z.boolean(),
  /** Bawaan Sinfodes tidak bisa dihapus atau diarsipkan; jenis buatan desa bisa (SPEC-V0.2 12.1). */
  asal: z.enum(ASAL_JENIS),
  /** Waktu jenis diarsipkan (ISO WIB); null bila belum. Jenis arsip tidak aktif dan tidak bisa diubah. */
  diarsipkan: z.string().nullable(),
})
export type JenisSurat = z.infer<typeof jenisSuratSchema>

/** Jenis surat beserta pemakaiannya 12 bulan terakhir: urutan langkah 1 Buat surat dan halaman Jenis Surat. */
export const jenisDenganPakaiSchema = jenisSuratSchema.extend({
  jumlahPakai: z.number().int().min(0),
  /** Pernah dipakai permohonan mana pun, kapan pun (bukan hanya 12 bulan): jenis yang sudah dipakai tidak bisa dihapus, hanya diarsipkan. */
  dipakai: z.boolean(),
})
export type JenisDenganPakai = z.infer<typeof jenisDenganPakaiSchema>

/** Sisipan yang selalu tersedia; setiap isian tambahan menambah sisipan sesuai `kunci`-nya (SPEC §7.3). */
export const SISIPAN_UMUM = [
  { kunci: 'nama', label: 'Nama' },
  { kunci: 'nik', label: 'NIK' },
  { kunci: 'tempatTanggalLahir', label: 'Tempat, tanggal lahir' },
  { kunci: 'jenisKelamin', label: 'Jenis kelamin' },
  { kunci: 'alamat', label: 'Alamat' },
  { kunci: 'pekerjaan', label: 'Pekerjaan' },
  { kunci: 'namaAyah', label: 'Nama ayah' },
  { kunci: 'namaIbu', label: 'Nama ibu' },
  { kunci: 'namaDesa', label: 'Nama desa' },
  { kunci: 'kecamatan', label: 'Kecamatan' },
  { kunci: 'kabupaten', label: 'Kabupaten' },
  { kunci: 'berlakuSampai', label: 'Berlaku sampai' },
] as const

/** Paragraf berisi penanda ini diganti tabel rincian isian bertanda `diTabel`. */
export const PENANDA_TABEL = 'tabelRincian'

/** Semua sisipan "[kunci]" di teks surat, urut kemunculan, tanpa duplikat. */
export function sisipanDalamTeks(teks: string): string[] {
  return [...new Set([...teks.matchAll(/\[(\w+)\]/g)].map((m) => m[1]))]
}

/** Isian yang boleh disimpan: hanya kunci milik jenis surat ini, dengan spasi di tepi dibuang. */
export function saringIsian(jenis: Pick<JenisSurat, 'isian'>, isian: Readonly<Record<string, string>>): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const d of jenis.isian) if (typeof isian[d.kunci] === 'string') hasil[d.kunci] = isian[d.kunci].trim()
  return hasil
}

const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/
const tanggalSah = (nilai: string) => {
  const m = POLA_TANGGAL.exec(nilai)
  return m !== null && tanggalValid(Number(m[1]), Number(m[2]), Number(m[3]))
}

/** Pesan galat per kunci isian; objek kosong berarti lengkap dan valid (SPEC §7.4 langkah 3). */
export function periksaIsian(jenis: Pick<JenisSurat, 'isian'>, isian: Readonly<Record<string, string>>): Record<string, string> {
  const galat: Record<string, string> = {}
  for (const d of jenis.isian) {
    const nilai = (isian[d.kunci] ?? '').trim()
    if (nilai === '') {
      if (d.wajib) galat[d.kunci] = `${d.label} wajib diisi`
    } else if (d.jenis === 'angka' && !/^\d+$/.test(nilai)) {
      galat[d.kunci] = `${d.label} harus berupa angka`
    } else if (d.jenis === 'tanggal' && !tanggalSah(nilai)) {
      galat[d.kunci] = `${d.label} tidak valid`
    } else if (d.jenis === 'pilihan' && !(d.pilihan ?? []).includes(nilai)) {
      galat[d.kunci] = `Pilih salah satu ${d.label.toLocaleLowerCase('id-ID')}`
    }
  }
  return galat
}

/** Status di daftar Jenis Surat: arsip mengalahkan saklar aktif (jenis arsip selalu mati). */
export const STATUS_DAFTAR_JENIS = ['aktif', 'dihentikan', 'diarsipkan'] as const
export type StatusJenis = (typeof STATUS_DAFTAR_JENIS)[number]

export function statusJenis(jenis: Pick<JenisSurat, 'aktif' | 'diarsipkan'>): StatusJenis {
  if (jenis.diarsipkan !== null) return 'diarsipkan'
  return jenis.aktif ? 'aktif' : 'dihentikan'
}

/** Jenis yang boleh dipakai membuat permohonan baru, dari loket maupun layanan warga: menyala dan tidak diarsipkan. */
export const dilayani = (jenis: Pick<JenisSurat, 'aktif' | 'diarsipkan'>): boolean => jenis.aktif && jenis.diarsipkan === null

/** Hanya jenis buatan desa yang belum pernah dipakai permohonan apa pun (SPEC-V0.2 12.1); selebihnya diarsipkan. */
export function bolehDihapus(jenis: Pick<JenisSurat, 'asal'>, dipakai: boolean): boolean {
  return jenis.asal === 'desa' && !dipakai
}

export function bolehDiarsipkan(jenis: Pick<JenisSurat, 'asal' | 'diarsipkan'>): boolean {
  return jenis.asal === 'desa' && jenis.diarsipkan === null
}

/** Isian dialog Tambah jenis surat. `dari` null = mulai dari kosong; selain itu id jenis desa yang disalin. */
export const tambahJenisSchema = z.object({
  dari: z.string().nullable(),
  kode: z.string().regex(/^[A-Z]{2,5}$/, 'Kode 2-5 huruf kapital.'),
  nama: z.string().trim().min(1, 'Nama jenis surat wajib diisi.'),
})
export type TambahJenis = z.infer<typeof tambahJenisSchema>

/** Jenis baru yang kosong: siap diedit, mati sampai desa menyalakannya (SPEC-V0.2 12.1). Sisipan memakai daftar `SISIPAN_UMUM`. */
export function jenisKosong(desa: { id: string }, kode: string, nama: string): Omit<JenisSurat, 'id'> {
  return {
    desaId: desa.id, kode, nama, klasifikasi: '470', subjek: 'pemohon', isian: [], bolehAtasNama: true, wajibParaf: false,
    masaBerlakuBulan: null, online: false, syarat: ['KTP-el pemohon'],
    teks: 'Yang bertanda tangan di bawah ini menerangkan bahwa [nama] adalah warga Desa [namaDesa].',
    aktif: false, asal: 'desa', diarsipkan: null,
  }
}

/** Salinan dalam dari `sumber` dengan identitas baru; mengubah salinan tidak mengubah sumber. Mati, buatan desa, tidak diarsipkan. */
export function salinJenis(sumber: JenisSurat, kode: string, nama: string): Omit<JenisSurat, 'id'> {
  const salinan: Partial<JenisSurat> = structuredClone(sumber)
  delete salinan.id
  return { ...(salinan as Omit<JenisSurat, 'id'>), kode, nama, aktif: false, asal: 'desa', diarsipkan: null }
}

/** Dua isian sama bila setiap kuncinya sama setelah spasi tepi dibuang; kunci yang hilang dianggap kosong. */
export function samaIsian(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const kunci = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...kunci].every((k) => (a[k] ?? '').trim() === (b[k] ?? '').trim())
}
