import { Link } from 'react-aria-components'
import type { BerandaPublik as DataBeranda, RingkasPotensi } from '@/domain/publik/schema'
import { Rupiah } from '@/ui/domain/Rupiah'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { Rubrik } from '@/ui/website/Rubrik'

function CuplikanApbdes({ a, dasar }: { a: NonNullable<DataBeranda['apbdes']>; dasar: string }) {
  const keterangan = (j: { anggaran: number; realisasi: number }) => (
    <>
      <Rupiah nilai={j.realisasi} ringkas /> dari <Rupiah nilai={j.anggaran} ringkas />
    </>
  )
  return (
    <Rubrik
      id="apbdes-desa"
      judul={`APBDes ${a.tahun}`}
      aksi={
        <Tautan href={`${dasar}/transparansi`} className="text-teks-kecil">
          Rincian APBDes
        </Tautan>
      }
    >
      <p className="text-teks-kecil text-tinta-2">Realisasi terhadap anggaran tahun ini</p>
      <div className="flex flex-col gap-5">
        <MiniBar label="Pendapatan" nilai={a.pendapatan.realisasi} maks={a.pendapatan.anggaran} keterangan={keterangan(a.pendapatan)} />
        <MiniBar label="Belanja" nilai={a.belanja.realisasi} maks={a.belanja.anggaran} keterangan={keterangan(a.belanja)} />
      </div>
    </Rubrik>
  )
}

function PotensiDesa({ potensi, dasar }: { potensi: readonly RingkasPotensi[]; dasar: string }) {
  return (
    <Rubrik
      id="potensi-desa"
      judul="Potensi desa"
      aksi={
        <Tautan href={`${dasar}/potensi`} className="text-teks-kecil">
          Potensi dan UMKM
        </Tautan>
      }
    >
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {potensi.map((p) => (
          <li key={p.id}>
            <Link
              href={`${dasar}/potensi#${p.id}`}
              className="group flex flex-col gap-1.5 rounded-1 outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru"
            >
              {p.foto && (
                <FotoWarta
                  berkas={p.foto.berkas}
                  alt=""
                  rasio="foto"
                  sizes="(min-width: 64rem) 13rem, (min-width: 40rem) 30vw, 50vw"
                  className="w-full rounded-1"
                />
              )}
              <span className="text-label font-semibold tracking-wide text-tinta-2 uppercase">{p.kategori}</span>
              <span className="font-medium group-data-[hovered]:text-biru group-data-[hovered]:underline">{p.judul}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Rubrik>
  )
}

/** Rubrik bawah Beranda (cuplikan APBDes dan potensi desa), dimuat terpisah supaya JS awal Beranda tetap ≤ 200 KB. */
export default function BerandaLanjut({ b, dasar }: { b: DataBeranda; dasar: string }) {
  if (!b.apbdes && b.potensi.length === 0) return null
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
      {b.apbdes && <CuplikanApbdes a={b.apbdes} dasar={dasar} />}
      {b.potensi.length > 0 && <PotensiDesa potensi={b.potensi} dasar={dasar} />}
    </div>
  )
}
