import { keAlamat } from '@/app/alamat'

/** `/privasi` di alamat induk: draf kebijakan privasi (SPEC-V0.2 §4.4). */
export function HalamanPrivasi() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-label font-medium text-tinta-2 uppercase">Sinfodes</p>
      <h1 className="mt-1 font-serif text-judul-halaman font-medium">Kebijakan privasi</h1>
      <p className="mt-3 text-tinta-2">Draf. Kebijakan privasi lengkap disusun sebelum Sinfodes dipakai desa sungguhan.</p>
      <ol className="mt-8 divide-y divide-garis border-y border-garis">
        {[
          'Data desa milik desa. Tim Sinfodes tidak melihat isi data penduduk, surat, pengaduan, atau keuangan.',
          'Tim Sinfodes hanya bisa melihat panel desa bila desa sendiri memberi akses bantuan sementara, dan setiap halaman yang dibuka tercatat.',
          'Data disimpan di Indonesia sesuai UU Pelindungan Data Pribadi.',
        ].map((butir, i) => (
          <li key={butir} className="flex gap-4 py-4">
            <span aria-hidden className="w-4 shrink-0 font-mono text-tinta-2">
              {i + 1}
            </span>
            <span className="text-baca">{butir}</span>
          </li>
        ))}
      </ol>
      <a href={keAlamat({ jenis: 'induk' })} className="mt-8 inline-block text-biru underline underline-offset-4">
        Ke halaman utama Sinfodes
      </a>
    </main>
  )
}
