import { keAlamat } from '@/app/alamat'

/** Subdomain yang memakai nama terlarang atau tidak sah (SPEC-V0.2 §4.2). */
export function HalamanAlamatTidakDikenal() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="text-label font-medium text-tinta-2 uppercase">Galat 404</p>
      <h1 className="mt-1 font-serif text-judul-halaman font-medium">Alamat tidak dikenal</h1>
      <p className="mt-2 text-tinta-2">Alamat ini tidak dipakai desa, kabupaten, atau layanan Sinfodes mana pun.</p>
      <a href={keAlamat({ jenis: 'induk' })} className="mt-4 inline-block text-biru underline underline-offset-4">
        Ke halaman utama Sinfodes
      </a>
    </main>
  )
}
