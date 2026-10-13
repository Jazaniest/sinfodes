import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiKabarPublik } from '@/api/publik'
import { KATEGORI_ARTIKEL, type KategoriArtikel } from '@/domain/website/schema'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { usePublik } from '../publik-konteks'
import { KartuKabar } from './KartuKabar'

/** Kabar desa (SPEC §9): daftar kabar terbit dengan filter kategori. Filter berupa tautan, jadi alamatnya bisa dibagikan. */
export function DaftarKabar({ kategori }: { kategori: KategoriArtikel | null }) {
  const { slug } = usePublik()
  const kueri = useQuery(opsiKabarPublik(slug, kategori))
  const dasar = `/desa/${slug}`
  const pilihan: { label: string; nilai: KategoriArtikel | null }[] = [
    { label: 'Semua', nilai: null },
    ...KATEGORI_ARTIKEL.map((k) => ({ label: k, nilai: k })),
  ]
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-judul-halaman font-medium">Kabar desa</h1>
      <nav aria-label="Kategori kabar">
        <ul className="flex flex-wrap gap-2">
          {pilihan.map((p) => (
            <li key={p.label}>
              <Link
                href={p.nilai ? `${dasar}/kabar?kategori=${encodeURIComponent(p.nilai)}` : `${dasar}/kabar`}
                aria-current={p.nilai === kategori ? 'page' : undefined}
                className="inline-flex min-h-tombol items-center rounded-penuh border border-garis-input bg-lembar px-4 text-teks-kecil outline-none hover:bg-kertas-2 aria-[current=page]:border-biru aria-[current=page]:bg-biru-muda aria-[current=page]:font-medium data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru"
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {kueri.isPending && <BarisKerangka jumlah={5} label="Memuat kabar…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {kueri.isSuccess && kueri.data.length === 0 && (
        <EmptyState judul="Belum ada kabar" keterangan="Belum ada kabar di kategori ini. Coba kategori lain." />
      )}
      {kueri.isSuccess && kueri.data.length > 0 && (
        <div className="flex flex-col gap-6">
          {kueri.data.map((a) => (
            <KartuKabar key={a.slug} a={a} dasar={dasar} tingkat={2} />
          ))}
        </div>
      )}
    </div>
  )
}
