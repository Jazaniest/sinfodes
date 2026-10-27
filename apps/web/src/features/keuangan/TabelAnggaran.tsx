import { useId } from 'react'
import type { Jumlah } from '@/domain/keuangan/schema'
import { Rupiah } from '@/ui/domain/Rupiah'
import { MiniBar } from '@/ui/grafik/MiniBar'

type Baris = { kode: string; nama: string; anggaran: number; realisasi: number }
type Props = {
  judul: string
  baris: readonly Baris[]
  /** Baris kaki; bawaannya "Jumlah" dari semua baris. Pembiayaan memakai "Pembiayaan netto". */
  jumlah?: { label: string; nilai: Jumlah }
}

const sel = 'px-3 py-2.5 align-top'

/** Tabel APBDes: uraian, anggaran, realisasi, dan capaian. Uang rata kanan dan ditulis penuh (SPEC §4.5). */
export function TabelAnggaran({ judul, baris, jumlah }: Props) {
  const id = useId()
  const kaki = jumlah ?? {
    label: 'Jumlah',
    nilai: baris.reduce((j, b) => ({ anggaran: j.anggaran + b.anggaran, realisasi: j.realisasi + b.realisasi }), { anggaran: 0, realisasi: 0 }),
  }
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-label font-medium text-tinta-2 uppercase">
        {judul}
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[38rem] border-y border-garis bg-lembar text-left">
          <caption className="sr-only">{judul}</caption>
          <thead>
            <tr className="text-teks-kecil text-tinta-2">
              <th scope="col" className={sel}>
                Uraian
              </th>
              <th scope="col" className={`${sel} text-right`}>
                Anggaran
              </th>
              <th scope="col" className={`${sel} text-right`}>
                Realisasi
              </th>
              <th scope="col" className={`${sel} w-40`}>
                Capaian
              </th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.kode} className="border-t border-garis">
                <th scope="row" className={`${sel} font-normal`}>
                  <span className="mr-2 font-mono text-teks-kecil text-tinta-2">{b.kode}</span>
                  {b.nama}
                </th>
                <td className={`${sel} text-right`}>
                  <Rupiah nilai={b.anggaran} />
                </td>
                <td className={`${sel} text-right`}>
                  <Rupiah nilai={b.realisasi} />
                </td>
                <td className={sel}>
                  <MiniBar label={b.nama} nilai={b.realisasi} maks={b.anggaran} labelTersembunyi />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-garis font-medium">
              <th scope="row" className={sel}>
                {kaki.label}
              </th>
              <td className={`${sel} text-right`}>
                <Rupiah nilai={kaki.nilai.anggaran} />
              </td>
              <td className={`${sel} text-right`}>
                <Rupiah nilai={kaki.nilai.realisasi} />
              </td>
              <td className={sel}>
                <MiniBar label={kaki.label} nilai={kaki.nilai.realisasi} maks={kaki.nilai.anggaran} labelTersembunyi />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
