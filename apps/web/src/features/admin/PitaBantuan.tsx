import { formatJam } from '@/domain/format/tanggal'

/** Pita di atas isi panel selama sesi bantuan Tim Sinfodes (SPEC-V0.2 §5.3), supaya tidak ada yang lupa sedang di mode apa. */
export function PitaBantuan({ bantuan }: { bantuan: { sampai: string; sembunyikanDataPribadi: boolean } }) {
  return (
    <div
      role="status"
      className="sticky top-14 z-20 -mx-4 -mt-6 mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-b border-oker bg-oker-muda px-4 py-2 text-teks-kecil sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8 print:hidden"
    >
      <p className="font-medium">Mode bantuan Sinfodes · lihat saja · berakhir {formatJam(bantuan.sampai)}</p>
      <p className="text-tinta-2">
        {bantuan.sembunyikanDataPribadi ? 'NIK dan nomor KK disamarkan.' : 'Data pribadi warga terlihat.'} Setiap halaman tercatat
        di riwayat desa.
      </p>
    </div>
  )
}
