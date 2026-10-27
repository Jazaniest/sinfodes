import { z } from 'zod'

/**
 * Akses bantuan sementara (SPEC-V0.2 §5.3): desa memberi Tim Sinfodes izin melihat panelnya untuk membantu. Tim hanya bisa
 * melihat, dan setiap halaman yang dibuka tercatat di riwayat.
 */
export const LAMA_AKSES_JAM = [2, 24, 72] as const
export type LamaAksesJam = (typeof LAMA_AKSES_JAM)[number]
export const LABEL_LAMA_AKSES: Readonly<Record<LamaAksesJam, string>> = { 2: '2 jam', 24: '24 jam', 72: '3 hari' }

export const beriAksesSchema = z.object({
  lamaJam: z.union([z.literal(2), z.literal(24), z.literal(72)]),
  sembunyikanDataPribadi: z.boolean(),
})
export type BeriAkses = z.infer<typeof beriAksesSchema>

const waktu = z.iso.datetime({ offset: true })

export const aksesAktifSchema = z.object({
  id: z.string(),
  mulai: waktu,
  sampai: waktu,
  sembunyikanDataPribadi: z.boolean(),
  diberiOleh: z.string(),
})
export type AksesAktif = z.infer<typeof aksesAktifSchema>

const jejakSchema = z.object({ jalur: z.string(), waktu })
export type JejakHalaman = z.infer<typeof jejakSchema>

/** Satu akses yang pernah diberikan. `berakhir` null selama akses masih berlaku. */
export const riwayatAksesSchema = z.object({
  id: z.string(),
  mulai: waktu,
  sampai: waktu,
  berakhir: z.enum(['habis', 'dicabut']).nullable(),
  diberiOleh: z.string(),
  sesi: z.array(z.object({ oleh: z.string(), mulai: waktu, halaman: z.array(jejakSchema) })),
})
export type RiwayatAkses = z.infer<typeof riwayatAksesSchema>

/** GET /pengaturan/akses-sinfodes. Riwayat terbaru dulu, termasuk akses yang masih berlaku. */
export const aksesSinfodesSchema = z.object({ aktif: aksesAktifSchema.nullable(), riwayat: z.array(riwayatAksesSchema) })
export type AksesSinfodes = z.infer<typeof aksesSinfodesSchema>

/** Awalan path API (tanpa `/api/v1`) → nama modul, supaya desa membaca riwayat per modul, bukan per URL. */
const MODUL_JEJAK: readonly [readonly string[], string][] = [
  [['penduduk', 'keluarga', 'mutasi', 'statistik'], 'Kependudukan'],
  [['surat', 'jenis-surat', 'arsip'], 'Layanan Surat'],
  [['pengaduan'], 'Pengaduan'],
  [['bansos'], 'Bantuan Sosial'],
  [['kesehatan'], 'Kesehatan'],
  [['keuangan'], 'Keuangan'],
  [['pembangunan'], 'Pembangunan'],
  [['aset'], 'Aset Desa'],
  [['lembaga'], 'Lembaga Desa'],
  [['buku-administrasi'], 'Buku Administrasi'],
  [['beranda'], 'Beranda'],
  [['cari'], 'Pencarian'],
]

/** "/penduduk?page=1" → "Kependudukan". */
export function labelJejak(jalur: string): string {
  const awalan = jalur.replace(/^\/+/, '').split(/[/?#]/)[0] ?? ''
  return MODUL_JEJAK.find(([daftar]) => daftar.includes(awalan))?.[1] ?? 'Lainnya'
}

/** Jumlah halaman per modul, terbanyak dulu; yang sama banyak menurut urutan pertama dibuka. */
export function ringkasJejak(halaman: readonly JejakHalaman[]): { label: string; jumlah: number }[] {
  const hitung = new Map<string, number>()
  for (const h of halaman) {
    const label = labelJejak(h.jalur)
    hitung.set(label, (hitung.get(label) ?? 0) + 1)
  }
  return [...hitung].map(([label, jumlah]) => ({ label, jumlah })).sort((a, b) => b.jumlah - a.jumlah)
}
