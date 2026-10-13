import { useQuery } from '@tanstack/react-query'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiArtikelPublik } from '@/api/publik'
import { formatTanggal } from '@/domain/format/tanggal'
import { Tautan } from '@/ui/navigasi/Tautan'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { usePublik } from '../publik-konteks'

/**
 * Halaman artikel (SPEC §9): teks 17px dengan sekitar 68 karakter per baris supaya nyaman dibaca. 1ch = lebar angka "0",
 * sedangkan huruf rata-rata lebih sempit, jadi ±68 karakter teks ≈ 56ch.
 */
export function ArtikelPublik({ artikel }: { artikel: string }) {
  const { slug } = usePublik()
  const kueri = useQuery(opsiArtikelPublik(slug, artikel))
  const daftar = `/desa/${slug}/kabar`
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Memuat kabar…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState
          judul="Kabar tidak ditemukan"
          keterangan="Kabar ini mungkin belum terbit, sudah dihapus, atau alamatnya salah."
          aksi={<Tautan href={daftar}>Lihat semua kabar</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  const a = kueri.data
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4">
      <Tautan href={daftar} className="self-start">
        ← Semua kabar
      </Tautan>
      <p className="text-label font-semibold tracking-wide text-biru uppercase">{a.kategori}</p>
      <h1 className="font-serif text-judul-halaman font-medium sm:text-judul-warta">{a.judul}</h1>
      <p className="text-tinta-2">
        Oleh {a.penulis} · {formatTanggal(a.tanggal, 'hari')}
      </p>
      {a.foto && (
        <FotoWarta
          berkas={a.foto.berkas}
          alt={a.foto.keterangan}
          keterangan={a.foto.keterangan}
          kredit={a.foto.kredit}
          sizes="(min-width: 48rem) 48rem, 100vw"
          utama
        />
      )}
      <div className="flex max-w-[56ch] flex-col gap-4 text-baca">
        {a.isi.map((paragraf) => (
          <p key={paragraf.slice(0, 40)}>{paragraf}</p>
        ))}
      </div>
    </article>
  )
}
