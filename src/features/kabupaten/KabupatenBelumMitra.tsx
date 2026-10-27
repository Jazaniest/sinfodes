import { CariDesa } from '@/features/induk/CariDesa'

/**
 * Alamat kabupaten yang belum bermitra (SPEC-V0.2 §8.2): tidak ada portal maupun dasbor, tetapi warga yang tersesat ke sini
 * tetap bisa mencari website desanya.
 */
export function KabupatenBelumMitra({ nama }: { nama: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="text-label font-medium text-tinta-2 uppercase">Kabupaten {nama}</p>
        <h1 className="mt-1 font-serif text-judul-halaman font-medium">Kabupaten ini belum memakai Sinfodes</h1>
        <p className="mt-2 text-tinta-2">Portal dan dasbor kabupaten dibuka setelah kabupaten bermitra dengan Sinfodes.</p>
      </div>
      <CariDesa />
    </main>
  )
}
