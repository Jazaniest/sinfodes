import { z } from 'zod'
import { mutasiSchema } from '../mutasi/schema'
import { pendudukSchema } from '../penduduk/schema'
import {
  isianTambahanSchema, jenisDenganPakaiSchema, PENANDA_TABEL, SISIPAN_UMUM, sisipanDalamTeks, type IsianTambahan, type JenisSurat,
} from './jenis'
import { pengaturanSuratSchema } from './pengaturan'
import { pejabatSchema } from './permohonan'
import { tataLetakSuratSchema } from './tata-letak'

/** Bagian jenis surat yang disunting di halaman ubah (SPEC §7.4 layar 6). Saklar aktif dan online ada di daftar. */
export type FormJenisSurat = Pick<
  JenisSurat,
  'nama' | 'klasifikasi' | 'bolehAtasNama' | 'wajibParaf' | 'masaBerlakuBulan' | 'syarat' | 'isian' | 'teks' | 'tataLetak'
>

export const formDariJenis = (j: JenisSurat): FormJenisSurat => ({
  nama: j.nama,
  klasifikasi: j.klasifikasi,
  bolehAtasNama: j.bolehAtasNama,
  wajibParaf: j.wajibParaf,
  masaBerlakuBulan: j.masaBerlakuBulan,
  syarat: [...j.syarat],
  isian: j.isian.map((d) => ({ ...d, pilihan: d.pilihan ? [...d.pilihan] : null })),
  teks: j.teks,
  tataLetak: j.tataLetak ? structuredClone(j.tataLetak) : null,
})

/**
 * PATCH /jenis-surat/:id. Kolom yang tidak dikirim tidak berubah; `kode` dan `subjek` tidak termasuk, jadi dibuang.
 * Teks boleh kosong di sini: pesan per kolom datang dari `periksaJenisSurat`, sama dengan di layar.
 */
export const ubahJenisSuratSchema = z
  .object({
    nama: z.string().max(100),
    klasifikasi: z.string().max(20),
    bolehAtasNama: z.boolean(),
    wajibParaf: z.boolean(),
    masaBerlakuBulan: z.number().int().nullable(),
    online: z.boolean(),
    aktif: z.boolean(),
    syarat: z.array(z.string().max(100)).max(15),
    isian: z.array(isianTambahanSchema.extend({ label: z.string().max(60), pilihan: z.array(z.string().max(60)).max(12).nullable() })).max(12),
    teks: z.string().max(4000),
    /** Null mengembalikan jenis ini ke tata letak desa (SPEC-V0.2 12.2). */
    tataLetak: tataLetakSuratSchema.nullable(),
  })
  .partial()
export type UbahJenisSurat = z.infer<typeof ubahJenisSuratSchema>

/** Sisipan yang boleh dipakai teks surat: sisipan umum, isian jenis ini, lalu penanda tabel rincian (SPEC §7.3). */
export function sisipanTersedia(isian: readonly Pick<IsianTambahan, 'kunci' | 'label'>[]): { kunci: string; label: string }[] {
  return [
    ...SISIPAN_UMUM,
    ...isian.map((d) => ({ kunci: d.kunci, label: d.label.trim() || d.kunci })),
    { kunci: PENANDA_TABEL, label: 'Tabel rincian' },
  ]
}

const POLA_KLASIFIKASI = /^\d{3}(\.\d+)?$/
const kecil = (s: string) => s.trim().toLocaleLowerCase('id-ID')

/** Pesan galat per kolom sebelum jenis surat disimpan; objek kosong berarti sah. Dipakai layar dan API tiruan. */
export function periksaJenisSurat(f: FormJenisSurat): Record<string, string> {
  const galat: Record<string, string> = {}
  if (f.nama.trim() === '') galat.nama = 'Nama surat wajib diisi'
  if (!POLA_KLASIFIKASI.test(f.klasifikasi.trim())) {
    galat.klasifikasi = 'Kode klasifikasi berupa 3 angka, boleh diikuti titik dan angka, mis. 474.1'
  }
  const masa = f.masaBerlakuBulan
  if (masa !== null && (!Number.isInteger(masa) || masa < 1 || masa > 60)) galat.masaBerlakuBulan = 'Masa berlaku 1 sampai 60 bulan'
  f.syarat.forEach((s, i) => {
    if (s.trim() === '') galat[`syarat.${i}`] = 'Syarat tidak boleh kosong'
  })
  const label = new Set<string>()
  const kunci = new Set<string>()
  f.isian.forEach((d, i) => {
    if (d.label.trim() === '') galat[`isian.${i}.label`] = 'Label isian wajib diisi'
    else if (label.has(kecil(d.label)) || kunci.has(d.kunci)) galat[`isian.${i}.label`] = 'Label isian sudah dipakai'
    label.add(kecil(d.label))
    kunci.add(d.kunci)
    if (d.jenis === 'pilihan' && (d.pilihan ?? []).filter((p) => p.trim() !== '').length < 2) {
      galat[`isian.${i}.pilihan`] = 'Isi minimal dua pilihan'
    }
  })
  if (f.teks.trim() === '') {
    galat.teks = 'Teks surat wajib diisi'
  } else {
    const dikenal = new Set(sisipanTersedia(f.isian).map((s) => s.kunci))
    const asing = sisipanDalamTeks(f.teks).filter((k) => !dikenal.has(k))
    if (asing.length > 0) {
      galat.teks = `Sisipan ${asing.map((k) => `[${k}]`).join(', ')} tidak dikenal. Hapus, atau tambahkan isiannya lebih dulu.`
    }
  }
  return galat
}

/** Kunci isian baru dari labelnya: "Nama usaha" → "namaUsaha"; bila terpakai diberi angka, "namaUsaha2". */
export function kunciDariLabel(label: string, terpakai: readonly string[]): string {
  const kata = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  let dasar = kata.map((k, i) => (i === 0 ? k : k.charAt(0).toUpperCase() + k.slice(1))).join('')
  if (!/^[a-z]/.test(dasar)) dasar = `isian${dasar.charAt(0).toUpperCase()}${dasar.slice(1)}`
  // Kunci sekaligus nama sisipan, jadi tidak boleh sama dengan sisipan umum atau penanda tabel.
  const pakai = new Set<string>([...terpakai, ...SISIPAN_UMUM.map((s) => s.kunci), PENANDA_TABEL])
  if (!pakai.has(dasar)) return dasar
  let n = 2
  while (pakai.has(`${dasar}${n}`)) n++
  return `${dasar}${n}`
}

/**
 * GET /jenis-surat/:id: jenis surat dan bahan pratinjau halaman ubah. Contohnya permohonan terakhir jenis ini beserta
 * isiannya; bila belum ada, penduduk dewasa pertama dengan isian kosong; bila desa belum punya penduduk, pemohon contoh.
 */
export const detailJenisSuratSchema = z.object({
  jenis: jenisDenganPakaiSchema,
  contoh: z.object({
    pemohon: pendudukSchema,
    /** Pemohon contoh tanpa NIK, karena desa belum punya penduduk (tahap 6C). */
    tiruan: z.boolean(),
    subjek: pendudukSchema.nullable(),
    mutasi: mutasiSchema.nullable(),
    isian: z.record(z.string(), z.string()),
  }),
  pengaturan: pengaturanSuratSchema,
  pejabat: pejabatSchema,
})
export type DetailJenisSurat = z.infer<typeof detailJenisSuratSchema>
