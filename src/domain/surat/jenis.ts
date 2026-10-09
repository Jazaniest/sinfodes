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
})
export type JenisSurat = z.infer<typeof jenisSuratSchema>

/** Jenis surat beserta pemakaiannya 12 bulan terakhir: urutan langkah 1 Buat surat dan halaman Jenis Surat. */
export const jenisDenganPakaiSchema = jenisSuratSchema.extend({ jumlahPakai: z.number().int().min(0) })
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

/** Dua isian sama bila setiap kuncinya sama setelah spasi tepi dibuang; kunci yang hilang dianggap kosong. */
export function samaIsian(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const kunci = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...kunci].every((k) => (a[k] ?? '').trim() === (b[k] ?? '').trim())
}
