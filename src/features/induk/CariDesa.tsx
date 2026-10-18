import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiCariDesa } from '@/api/induk'
import { DOMAIN_INDUK, keAlamat } from '@/app/alamat'
import { useTunda } from '@/ui/hooks/useTunda'
import { SearchField } from '@/ui/isian/SearchField'

const MIN_KATA = 3

/**
 * Cari desa di alamat induk (SPEC-V0.2 §4.4): warga dan perangkat yang belum tahu alamat desanya menemukan website desa dari
 * namanya. Hanya desa yang websitenya tayang yang muncul. `judulBesar`: judul selevel bagian lain di halaman utama.
 */
export function CariDesa({ id = 'cari-desa', judulBesar = false }: { id?: string; judulBesar?: boolean }) {
  const [kata, setKata] = useState('')
  const tenang = useTunda(kata.trim(), 300)
  const cari = useQuery({ ...opsiCariDesa(tenang), enabled: tenang.length >= MIN_KATA })
  const hasil = tenang.length >= MIN_KATA ? cari.data?.hasil : undefined

  let status = ''
  if (kata.trim().length > 0 && kata.trim().length < MIN_KATA) status = `Ketik sedikitnya ${MIN_KATA} huruf.`
  else if (tenang.length >= MIN_KATA) {
    if (cari.isError) status = pesanGalat(cari.error)
    else if (!hasil) status = 'Mencari…'
    else if (hasil.length === 0) status = `Tidak ada desa bernama "${tenang}" yang sudah memakai Sinfodes.`
    else status = `${hasil.length} desa ditemukan`
  }

  return (
    <section id={id} aria-labelledby={`${id}-judul`} className="flex flex-col gap-4">
      <div>
        <h2 id={`${id}-judul`} className={`font-serif font-medium ${judulBesar ? 'text-judul-halaman' : 'text-judul-bagian'}`}>
          Cari desa Anda
        </h2>
        <p className="mt-1 text-tinta-2">Ketik nama desa untuk membuka website dan layanan warganya.</p>
      </div>
      <SearchField label="Nama desa" labelTersembunyi={false} placeholder="mis. Sungai Sialang" value={kata} onChange={setKata} />
      <p role="status" aria-live="polite" className="min-h-5 text-teks-kecil text-tinta-2">
        {status}
      </p>
      {hasil && hasil.length > 0 && (
        <ul className="divide-y divide-garis border-y border-garis">
          {hasil.map((d) => (
            <li key={d.label}>
              <a
                href={keAlamat({ jenis: 'desa', label: d.label })}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-1 py-3 hover:bg-kertas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-biru focus-visible:outline-solid"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-biru">Desa {d.nama}</span>
                  <span className="text-teks-kecil text-tinta-2">
                    {d.kecamatan} · {d.kabupaten}
                  </span>
                </span>
                <span className="font-mono text-teks-kecil text-tinta-2">
                  {d.label}.{DOMAIN_INDUK}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
