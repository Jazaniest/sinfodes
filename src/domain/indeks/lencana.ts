import { z } from 'zod'
import { KATEGORI_DESA, LABEL_KATEGORI_DESA, type KategoriDesa } from './kategori'
import { labelPeriode, type Periode } from './periode'
import { kategoriDesaSchema, musimSchema } from './schema'

/** Lencana hanya terbit dari podium desa di dua tingkat ini; podium antarkabupaten milik kabupaten (rencana 7C-2 butir 1). */
export const TINGKAT_LENCANA = ['kecamatan', 'kabupaten'] as const
export type TingkatLencana = (typeof TINGKAT_LENCANA)[number]

const ABJAD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** FNV-1a 32 bit atas kode UTF-16; `awal` membedakan dua putaran hash. */
function fnv1a(teks: string, awal: number): number {
  let h = awal >>> 0
  for (let i = 0; i < teks.length; i++) {
    h ^= teks.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

export type MasukanKodeLencana = { desaId: string; kategori: KategoriDesa; tingkat: TingkatLencana; wilayahKode: string; musim: string; periode: string }

/**
 * `LJ-XXXXXXXX`: 40 bit dari dua hash FNV-1a, ditulis dalam 8 karakter Crockford base32. Kodenya tetap untuk masukan yang sama.
 * Di produksi kode diganti acak dari server; di demo keabsahannya ditentukan oleh keberadaannya di `db.lencana`.
 */
export function kodeLencana(o: MasukanKodeLencana): string {
  const teks = [o.desaId, o.kategori, o.tingkat, o.wilayahKode, o.musim, o.periode].join('|')
  let nilai = fnv1a(teks, 0x811c9dc5) * 256 + (fnv1a(`${teks}|2`, 0x01000193) & 0xff)
  let kode = ''
  for (let i = 0; i < 8; i++) {
    kode = ABJAD[nilai % 32] + kode
    nilai = Math.floor(nilai / 32)
  }
  return `LJ-${kode}`
}

export const POLA_KODE_LENCANA = /^LJ-[0-9A-HJKMNP-TV-Z]{8}$/

export type MasukanKalimat = { peringkat: number; bersama: boolean; kategori: KategoriDesa; tingkat: TingkatLencana; wilayahNama: string; periode: Periode }

/** `Juara 1 Layanan Tercepat · Kabupaten Pelalawan · Agustus 2026`; seri: `Juara 1 bersama Layanan Tercepat · …`. */
export function kalimatLencana(o: MasukanKalimat): string {
  const wilayah = `${o.tingkat === 'kecamatan' ? 'Kecamatan' : 'Kabupaten'} ${o.wilayahNama}`
  return `Juara ${o.peringkat}${o.bersama ? ' bersama' : ''} ${LABEL_KATEGORI_DESA[o.kategori]} · ${wilayah} · ${labelPeriode(o.periode)}`
}

/** Satu kalimat per kategori untuk halaman bukti: apa yang diukur (SPEC-V0.2 §9.2). */
export const PENJELASAN_KATEGORI: Readonly<Record<KategoriDesa, string>> = {
  layanan: 'Median waktu dari permohonan masuk sampai surat ditandatangani, dari jejak aplikasi.',
  responsif: 'Gabungan persentase pengaduan yang dibalas dalam 72 jam dan median waktu balasan pertama, dari jejak aplikasi.',
  data: 'Gabungan kelengkapan data penduduk dan persentase mutasi yang dicatat paling lambat 30 hari setelah peristiwa.',
  transparan: 'Rata-rata tiga butir: APBDes terbit di website, realisasi diperbarui dalam 35 hari, dan kegiatan pembangunan yang punya kabar kemajuan.',
  digital: 'Persentase surat yang diajukan warga sendiri lewat layanan mandiri dari semua surat masuk.',
  website: 'Persentase minggu dalam periode yang punya kabar atau pengumuman terbit di website desa.',
  serapan: 'Realisasi belanja kumulatif dibanding target berjalan dari APBDes, paling tinggi 100%.',
  meningkat: 'Kenaikan nilai Indeks Desa Digital dibanding periode sebelumnya yang sama panjang.',
  umum: 'Nilai Indeks Desa Digital, rata-rata skor kategori yang syaratnya terpenuhi.',
}

const periodeLencanaSchema = z.strictObject({ musim: musimSchema, kode: z.string(), label: z.string() })

/** Lencana yang boleh keluar ke publik: tanpa tingkatan, Indeks, skor, atau klasemen (SPEC-V0.2 §9.1). */
export const lencanaPublikSchema = z.strictObject({
  kode: z.string().regex(POLA_KODE_LENCANA),
  kalimat: z.string(),
  peringkat: z.number().int().min(1),
  bersama: z.boolean(),
  kategori: kategoriDesaSchema,
  tingkat: z.enum(TINGKAT_LENCANA),
  periode: periodeLencanaSchema,
})
export type LencanaPublik = z.infer<typeof lencanaPublikSchema>

export const buktiLencanaSchema = lencanaPublikSchema.extend({
  desa: z.strictObject({ nama: z.string(), kecamatan: z.string(), kabupaten: z.string(), alamat: z.string().nullable() }),
  nilai: z.string(),
  terbitPada: z.string(),
  penjelasan: z.string(),
})
export type BuktiLencana = z.infer<typeof buktiLencanaSchema>

export const lencanaAdminSchema = lencanaPublikSchema.extend({ tampil: z.boolean() })
export type LencanaAdmin = z.infer<typeof lencanaAdminSchema>

export const ubahTampilLencanaSchema = z.strictObject({ tampil: z.boolean() })

export const URUTAN_KATEGORI = (k: KategoriDesa): number => KATEGORI_DESA.indexOf(k)
