import { z } from 'zod'
import { formatTanggal, tanggalIsoWib } from '../format/tanggal'

/** SPEC §5.5. Pengaduan baru ditambahkan bersama modul Pengaduan. */
export const JENIS_NOTIFIKASI = ['permohonan-baru', 'surat-ditandatangani', 'surat-dikembalikan', 'laporan-data', 'pengumuman'] as const
export type JenisNotifikasi = (typeof JENIS_NOTIFIKASI)[number]

/** Satu notifikasi untuk satu pengguna; status baca milik penerimanya sendiri. */
export const notifikasiSchema = z.object({
  id: z.string(),
  desaId: z.string(),
  penggunaId: z.string(),
  jenis: z.enum(JENIS_NOTIFIKASI),
  judul: z.string().min(1),
  isi: z.string(),
  waktu: z.iso.datetime({ offset: true }),
  dibaca: z.boolean(),
  /** Laporan kelahiran membuka alur Lahir dengan laporannya; laporan perbaikan merujuk penduduknya. */
  rujukan: z.object({ jenis: z.enum(['permohonan', 'penduduk', 'laporan-kelahiran']), id: z.string() }).nullable(),
})
export type Notifikasi = z.infer<typeof notifikasiSchema>

/** GET /notifikasi: 50 terbaru milik pengguna, dan jumlah yang belum dibaca untuk angka menu. */
export const kotakNotifikasiSchema = z.object({ data: z.array(notifikasiSchema), belumDibaca: z.number().int().min(0) })
export type KotakNotifikasi = z.infer<typeof kotakNotifikasiSchema>

/** POST /notifikasi/tandai-dibaca. `ids` null berarti semua milik pengguna. */
export const tandaiDibacaSchema = z.object({ ids: z.array(z.string()).max(200).nullable() })

export function hrefNotifikasi(n: Pick<Notifikasi, 'rujukan'>): string | null {
  if (n.rujukan?.jenis === 'permohonan') return `/admin/surat/${n.rujukan.id}`
  if (n.rujukan?.jenis === 'penduduk') return `/admin/kependudukan/penduduk/${n.rujukan.id}`
  if (n.rujukan?.jenis === 'laporan-kelahiran') return `/admin/kependudukan/mutasi/lahir?laporan=${n.rujukan.id}`
  return null
}

const HARI_MS = 86_400_000

/** Dikelompokkan per tanggal WIB: "Hari ini", "Kemarin", lalu "Senin, 21 September 2026". Urutan masukan dipertahankan. */
export function kelompokPerHari(daftar: readonly Notifikasi[], sekarang: Date): { judul: string; item: Notifikasi[] }[] {
  const hariIni = tanggalIsoWib(sekarang)
  const kemarin = tanggalIsoWib(new Date(sekarang.getTime() - HARI_MS))
  const grup = new Map<string, Notifikasi[]>()
  for (const n of daftar) {
    // Waktu disimpan dengan zona +07:00, jadi 10 karakter pertamanya sudah tanggal WIB.
    const tanggal = n.waktu.slice(0, 10)
    grup.set(tanggal, [...(grup.get(tanggal) ?? []), n])
  }
  return [...grup].map(([tanggal, item]) => ({
    judul: tanggal === hariIni ? 'Hari ini' : tanggal === kemarin ? 'Kemarin' : formatTanggal(tanggal, 'hari'),
    item,
  }))
}
