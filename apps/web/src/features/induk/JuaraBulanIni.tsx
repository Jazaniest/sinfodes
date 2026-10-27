import type { ReactNode } from 'react'
import { keAlamat } from '@/app/alamat'
import type { JuaraInduk } from '@/domain/alamat/schema'
import { LABEL_KATEGORI_KABUPATEN } from '@/domain/indeks/kategori'
import { Tautan } from '@/ui/navigasi/Tautan'

const kepalaTabel = 'border-b border-garis px-3 py-2 text-left text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const PERINGKAT = [1, 2, 3] as const

type Juara = { peringkat: number; bersama: boolean }

/** Sel Juara 1-3: satu atau lebih nama (seri), dengan "Juara n bersama" bila seri. */
function SelJuara<T extends Juara>({ juara, peringkat, isi }: { juara: readonly T[]; peringkat: number; isi: (j: T) => ReactNode }) {
  const baris = juara.filter((j) => j.peringkat === peringkat)
  return (
    <td className="px-3 py-2.5 align-top">
      {baris.length === 0 ? (
        <span className="text-tinta-2">-</span>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {baris.map((j, i) => (
            <li key={i} className="flex flex-col">
              {isi(j)}
              {j.bersama && <span className="text-teks-kecil text-tinta-2">{`Juara ${peringkat} bersama`}</span>}
            </li>
          ))}
        </ul>
      )}
    </td>
  )
}

function Tabel({ judul, kolomPertama, children }: { judul: string; kolomPertama: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border-t-[1.5px] border-tinta">
      <table className="w-full min-w-[34rem] border-collapse">
        <caption className="sr-only">{judul}</caption>
        <thead>
          <tr>
            <th scope="col" className={kepalaTabel}>
              {kolomPertama}
            </th>
            {PERINGKAT.map((p) => (
              <th key={p} scope="col" className={kepalaTabel}>{`Juara ${p}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

/**
 * "Juara bulan ini" di halaman utama (SPEC-V0.2 §6 butir 3): tabel register dari podium bulan terakhir tutup, tanpa piala atau
 * ilustrasi. Kabupaten mitra bertautan ke portalnya, dan nama desa ke websitenya.
 */
export function JuaraBulanIni({ juara, contoh }: { juara: NonNullable<JuaraInduk>; contoh: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="font-serif text-judul-bagian font-medium">{`Juara ${juara.periode.label}`}</h2>
        {contoh && <span className="border border-garis-input px-1.5 py-0.5 font-mono text-label text-tinta-2 uppercase">Data contoh</span>}
      </div>
      {juara.provinsi.map((p) => (
        <section key={p.provinsi.kode} aria-label={`Juara antarkabupaten, Provinsi ${p.provinsi.nama}`} className="flex flex-col gap-2">
          <h3 className="text-label font-semibold tracking-wide uppercase">{`Antarkabupaten · Provinsi ${p.provinsi.nama}`}</h3>
          <Tabel judul={`Juara antarkabupaten, Provinsi ${p.provinsi.nama}`} kolomPertama="Kategori">
            {p.kategori.map((k) => (
              <tr key={k.kategori} className="border-b border-garis">
                <th scope="row" className="px-3 py-2.5 text-left align-top font-medium">
                  {LABEL_KATEGORI_KABUPATEN[k.kategori]}
                </th>
                {PERINGKAT.map((n) => (
                  <SelJuara
                    key={n}
                    juara={k.podium}
                    peringkat={n}
                    isi={(j) =>
                      j.kabupaten.label ? <Tautan href={keAlamat({ jenis: 'kabupaten', label: j.kabupaten.label })}>{j.kabupaten.nama}</Tautan> : j.kabupaten.nama
                    }
                  />
                ))}
              </tr>
            ))}
          </Tabel>
        </section>
      ))}
      {juara.kabupatenMitra.length > 0 && (
        <section aria-label="Juara Umum per kabupaten mitra" className="flex flex-col gap-2">
          <h3 className="text-label font-semibold tracking-wide uppercase">Juara Umum per kabupaten mitra</h3>
          <Tabel judul="Juara Umum per kabupaten mitra" kolomPertama="Kabupaten">
            {juara.kabupatenMitra.map((m) => (
              <tr key={m.kabupaten.label} className="border-b border-garis">
                <th scope="row" className="px-3 py-2.5 text-left align-top font-medium">
                  <Tautan href={keAlamat({ jenis: 'kabupaten', label: m.kabupaten.label })}>{m.kabupaten.nama}</Tautan>
                </th>
                {PERINGKAT.map((n) => (
                  <SelJuara
                    key={n}
                    juara={m.juaraUmum}
                    peringkat={n}
                    isi={(j) => <Tautan href={keAlamat({ jenis: 'desa', label: j.desa.alamat })}>{j.desa.nama}</Tautan>}
                  />
                ))}
              </tr>
            ))}
          </Tabel>
        </section>
      )}
    </div>
  )
}
