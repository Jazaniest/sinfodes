import { waktuIsoWib } from '@/domain/format/tanggal'
import { ID_SUNGAI_SIALANG } from '../data/desa-demo'
import type { AksesBantuan } from '../tipe-db'

const MENIT_MS = 60_000
const JAM_MS = 60 * MENIT_MS

/**
 * Satu akses bantuan yang sudah habis di Sungai Sialang (SPEC-V0.2 §5.3): Sekretaris Desa memberi akses 24 jam dua minggu
 * lalu, dan Dina dari Tim Sinfodes membuka beberapa halaman. Tanpa PRNG supaya data tahap sebelumnya tetap identik.
 */
export function contohAksesBantuan(sekarang: Date): AksesBantuan[] {
  const mulai = sekarang.getTime() - 14 * 24 * JAM_MS
  const sesiMulai = mulai + 2 * JAM_MS
  const jalur = ['/beranda', '/penduduk?page=1', '/penduduk/pdk_siti_rahmah', '/surat?status=Diproses', '/surat/jenis']
  return [
    {
      id: 'aks_contoh',
      desaId: ID_SUNGAI_SIALANG,
      diberiOlehId: 'pgn_hendri',
      mulai: waktuIsoWib(new Date(mulai)),
      sampai: waktuIsoWib(new Date(mulai + 24 * JAM_MS)),
      sembunyikanDataPribadi: true,
      dicabut: null,
      sesi: [
        {
          id: 'sbt_contoh',
          olehId: 'kns_dina',
          olehNama: 'Dina',
          mulai: waktuIsoWib(new Date(sesiMulai)),
          halaman: jalur.map((j, i) => ({ jalur: j, waktu: waktuIsoWib(new Date(sesiMulai + (i + 1) * MENIT_MS)) })),
        },
      ],
    },
  ]
}
