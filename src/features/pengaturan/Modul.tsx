import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { kunciModul, opsiModul, ubahModul } from '@/api/modul'
import { kunciSesi } from '@/api/sesi'
import { Saklar } from '@/ui/isian/Saklar'
import { tampilkanToast } from '@/ui/toast/antrean'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaPengaturan } from './TabPengaturan'

/**
 * Pengaturan › Modul (SPEC-V0.2 12.3): Sekretaris Desa menyalakan atau mematikan modul. Baru Kesehatan (Posyandu); data
 * modul yang dimatikan tidak dihapus. Sesi dimuat ulang sesudahnya supaya menu dan hak akses langsung ikut berubah.
 */
export function Modul() {
  const queryClient = useQueryClient()
  const modul = useQuery(opsiModul())
  const ubah = useMutation({
    mutationFn: ubahModul,
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciModul, baru)
      void queryClient.invalidateQueries({ queryKey: kunciSesi })
      tampilkanToast({ pesan: baru.kesehatan ? 'Modul Kesehatan dinyalakan.' : 'Modul Kesehatan dimatikan.', nada: 'berhasil' })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })

  return (
    <div className="flex flex-col gap-6">
      <KepalaPengaturan aktif="modul" />
      {modul.isPending ? (
        <BarisKerangka jumlah={1} label="Memuat modul…" />
      ) : modul.isError ? (
        <ErrorState pesan={pesanGalat(modul.error)} onCobaLagi={() => void modul.refetch()} />
      ) : (
        <ul aria-label="Modul desa" className="divide-y divide-garis border-y border-garis bg-lembar">
          <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Kesehatan (Posyandu)</p>
              <p id="modul-kesehatan-keterangan" className="text-tinta-2">
                Menu Kesehatan, jadwal posyandu di website, layanan warga, dan Beranda Kepala Dusun. Data tidak dihapus saat dimatikan.
              </p>
            </div>
            <Saklar
              labelTersembunyi
              aria-describedby="modul-kesehatan-keterangan"
              isSelected={modul.data.kesehatan}
              isDisabled={ubah.isPending}
              onChange={(kesehatan) => ubah.mutate({ ...modul.data, kesehatan })}
            >
              Kesehatan (Posyandu)
            </Saklar>
          </li>
        </ul>
      )}
    </div>
  )
}
