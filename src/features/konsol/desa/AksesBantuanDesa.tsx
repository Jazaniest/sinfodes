import { useMutation } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { ambilTiketBantuan } from '@/api/konsol'
import { keAlamat } from '@/app/alamat'
import { formatWaktuLog } from '@/domain/format/tanggal'
import type { DetailDesaKonsol } from '@/domain/konsol/schema'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'

/**
 * Akses bantuan dari desa (SPEC-V0.2 §5.3). Tim Sinfodes hanya bisa membuka panel desa bila desa memberinya akses; tombolnya
 * mengambil tiket sekali pakai lalu membuka alamat desa dalam mode lihat saja.
 */
export function AksesBantuanDesa({ d }: { d: DetailDesaKonsol }) {
  const buka = useMutation({
    mutationFn: () => ambilTiketBantuan(d.id),
    onSuccess: ({ tiket, alamat }) => {
      window.location.assign(keAlamat({ jenis: 'desa', label: alamat }, `/admin/bantuan?tiket=${encodeURIComponent(tiket)}`))
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })
  return (
    <section aria-labelledby="judul-akses-bantuan" className="flex max-w-2xl flex-col items-start gap-2">
      <h2 id="judul-akses-bantuan" className="text-label font-medium text-tinta-2 uppercase">
        Akses bantuan
      </h2>
      {d.aksesBantuan ? (
        <>
          <p className="font-medium">Akses bantuan aktif sampai {formatWaktuLog(d.aksesBantuan.sampai)}</p>
          <p>{d.aksesBantuan.sembunyikanDataPribadi ? 'Data pribadi warga disamarkan.' : 'Data pribadi warga terlihat.'}</p>
          <p className="text-teks-kecil text-tinta-2">Panel dibuka lihat saja, dan setiap halaman tercatat di riwayat desa.</p>
          <Tombol varian="utama" className="mt-1" memuat={buka.isPending} onPress={() => buka.mutate()}>
            Buka panel desa (lihat saja)
          </Tombol>
        </>
      ) : (
        <>
          <p>Desa belum memberi akses bantuan.</p>
          <p className="text-teks-kecil text-tinta-2">
            Sekretaris atau Kepala Desa memberinya dari Pengaturan › Akses Sinfodes di panel desa.
          </p>
        </>
      )}
    </section>
  )
}
