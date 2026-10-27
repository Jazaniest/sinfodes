import { DOMAIN_INDUK, keAlamat } from '@/app/alamat'
import { CariDesa } from '@/features/induk/CariDesa'

/** `/admin` dan `/warga` di alamat induk (SPEC-V0.2 §4.4): panel dan layanan warga kini ada di alamat desa masing-masing. */
export function HalamanPanelPindah() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="text-label font-medium text-tinta-2 uppercase">Alamat berubah</p>
      <h1 className="mt-1 font-serif text-judul-halaman font-medium">Panel desa sekarang ada di alamat desa Anda</h1>
      <p className="mt-2 text-tinta-2">
        Panel perangkat desa dan layanan warga dibuka dari alamat desa masing-masing, misalnya{' '}
        <span className="font-mono">sungaisialang.{DOMAIN_INDUK}/admin</span>.
      </p>
      <a href={keAlamat({ jenis: 'induk' })} className="mt-4 inline-block text-biru underline underline-offset-4">
        Ke halaman utama Sinfodes
      </a>
      <div className="mt-10 border-t border-garis pt-8">
        <CariDesa />
      </div>
    </main>
  )
}
