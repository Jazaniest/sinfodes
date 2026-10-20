import { Tautan } from '@/ui/navigasi/Tautan'
import { useBoleh } from './useBoleh'

/**
 * Pita di atas isi panel selama desa Ditangguhkan (SPEC-V0.2 §10.5): panel hanya bisa dilihat, diunduh, dan diekspor. Menu
 * Langganan tetap bisa dipakai untuk mengunggah bukti, jadi pita menautkannya bagi peran yang berhak membukanya.
 */
export function PitaDitangguhkan() {
  const boleh = useBoleh()
  return (
    <div
      role="status"
      className="sticky top-14 z-20 -mx-4 -mt-6 mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-b border-oker bg-oker-muda px-4 py-2 text-teks-kecil sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8 print:hidden"
    >
      <p className="font-medium">Langganan ditangguhkan, hubungi Sinfodes.</p>
      <p className="text-tinta-2">Panel hanya bisa dilihat dan diunduh. Data desa tidak dihapus.</p>
      {boleh('langganan.lihat') && (
        <Tautan href="/admin/pengaturan/langganan" nada="tinta">
          Buka Langganan
        </Tautan>
      )}
    </div>
  )
}
