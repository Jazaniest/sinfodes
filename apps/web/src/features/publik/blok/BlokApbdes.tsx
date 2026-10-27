import type { BlokTampil } from '@/domain/publik/schema'
import { Rupiah } from '@/ui/domain/Rupiah'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Rubrik } from '@/ui/website/Rubrik'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'apbdes' }>; dasar: string }

/** APBDes ringkas (SPEC-V0.2 11.4): `batang` seperti Warta v0.1, `tabel` dua baris realisasi terhadap anggaran. */
export function BlokApbdes({ blok, dasar }: Props) {
  const a = blok.data
  const keterangan = (j: { anggaran: number; realisasi: number }) => (
    <>
      <Rupiah nilai={j.realisasi} ringkas /> dari <Rupiah nilai={j.anggaran} ringkas />
    </>
  )
  return (
    <WadahBlok blok={blok}>
      <Rubrik
        id={blok.id}
        judul={`APBDes ${a.tahun}`}
        aksi={
          <Tautan href={`${dasar}/transparansi`} className="text-teks-kecil">
            Rincian APBDes
          </Tautan>
        }
      >
        {blok.varian === 'tabel' ? (
          <table className="w-full text-baca">
            <caption className="pb-2 text-left text-teks-kecil text-tinta-2">Realisasi terhadap anggaran tahun ini</caption>
            <thead>
              <tr className="border-b border-garis text-left text-label tracking-wide text-tinta-2 uppercase">
                <th scope="col" className="py-1.5 font-semibold">
                  Bagian
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Realisasi
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Anggaran
                </th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Pendapatan', a.pendapatan],
                ['Belanja', a.belanja],
              ] as const).map(([label, j]) => (
                <tr key={label} className="border-b border-garis last:border-b-0">
                  <th scope="row" className="py-1.5 text-left font-medium">
                    {label}
                  </th>
                  <td className="py-1.5 text-right">
                    <Rupiah nilai={j.realisasi} />
                  </td>
                  <td className="py-1.5 text-right text-tinta-2">
                    <Rupiah nilai={j.anggaran} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <>
            <p className="text-teks-kecil text-tinta-2">Realisasi terhadap anggaran tahun ini</p>
            <div className="flex flex-col gap-5">
              <MiniBar label="Pendapatan" nilai={a.pendapatan.realisasi} maks={a.pendapatan.anggaran} keterangan={keterangan(a.pendapatan)} />
              <MiniBar label="Belanja" nilai={a.belanja.realisasi} maks={a.belanja.anggaran} keterangan={keterangan(a.belanja)} />
            </div>
          </>
        )}
      </Rubrik>
    </WadahBlok>
  )
}
