import { z } from 'zod'
import { apbdesSchema, jumlahKelompok, pembiayaanNetto, posUtama, type Apbdes, type Jumlah, type PosApbdes } from '../keuangan/schema'
import { barisKegiatanSchema, dokumentasiSchema } from '../pembangunan/schema'
import { fotoPublikSchema } from './schema'

/** Dokumentasi progres dengan foto berketerangan dan berkredit (SPEC §9). */
export const dokumentasiPublikSchema = dokumentasiSchema.extend({ foto: fotoPublikSchema.nullable() })
export type DokumentasiPublik = z.infer<typeof dokumentasiPublikSchema>

/** Kegiatan pembangunan di website: anggaran dan realisasinya dari rincian APBDes (SPEC §8). */
export const kegiatanPublikSchema = barisKegiatanSchema
  .pick({
    id: true, nama: true, volume: true, lokasi: true, sumberDana: true, mulai: true, targetSelesai: true, progresFisik: true,
    status: true, anggaran: true, realisasi: true,
  })
  .extend({ dokumentasi: z.array(dokumentasiPublikSchema) })
export type KegiatanPublik = z.infer<typeof kegiatanPublikSchema>

export const apbdesPublikSchema = apbdesSchema.pick({ tahun: true, pos: true, sinkronPada: true })
export type ApbdesPublik = z.infer<typeof apbdesPublikSchema>

/** GET /publik/:slug/transparansi (SPEC §9). `apbdes` null bila desa belum mengumumkan APBDes. */
export const transparansiPublikSchema = z.object({ apbdes: apbdesPublikSchema.nullable(), kegiatan: z.array(kegiatanPublikSchema) })
export type TransparansiPublik = z.infer<typeof transparansiPublikSchema>

export type BarisApbdes = Pick<PosApbdes, 'kode' | 'nama' | 'anggaran' | 'realisasi'>
export type BagianApbdes = {
  kunci: 'pendapatan' | 'belanja' | 'pembiayaan'
  judul: string
  baris: BarisApbdes[]
  jumlah: { label: string; nilai: Jumlah }
}

/**
 * Tiga bagian APBDes untuk layar Transparansi dan lembar cetaknya: pendapatan per sumber, belanja per bidang (rincian
 * kegiatan tidak dihitung dua kali), dan pembiayaan dengan jumlah netto. Sama dengan panel Keuangan.
 */
export function bagianApbdes(a: Pick<Apbdes, 'pos'>): BagianApbdes[] {
  return [
    {
      kunci: 'pendapatan', judul: 'Pendapatan per sumber', baris: posUtama(a, 'pendapatan'),
      jumlah: { label: 'Jumlah pendapatan', nilai: jumlahKelompok(a, 'pendapatan') },
    },
    {
      kunci: 'belanja', judul: 'Belanja per bidang', baris: posUtama(a, 'belanja'),
      jumlah: { label: 'Jumlah belanja', nilai: jumlahKelompok(a, 'belanja') },
    },
    {
      kunci: 'pembiayaan',
      judul: 'Pembiayaan',
      baris: [
        ...posUtama(a, 'pembiayaan-penerimaan').map((p) => ({ ...p, nama: `Penerimaan · ${p.nama}` })),
        ...posUtama(a, 'pembiayaan-pengeluaran').map((p) => ({ ...p, nama: `Pengeluaran · ${p.nama}` })),
      ],
      jumlah: { label: 'Pembiayaan netto', nilai: pembiayaanNetto(a) },
    },
  ]
}
