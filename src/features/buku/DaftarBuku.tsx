import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { opsiDaftarBuku } from '@/api/buku'
import { pesanGalat } from '@/api/galat'
import { KELOMPOK_BUKU, LABEL_KELOMPOK_BUKU, type RingkasBuku } from '@/domain/buku/schema'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

function KelompokBuku({ judul, daftar }: { judul: string; daftar: readonly RingkasBuku[] }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-label font-medium text-tinta-2 uppercase">
        {judul}
      </h2>
      <ul className="mt-2 divide-y divide-garis border-y border-garis bg-lembar">
        {daftar.map((b) => (
          <li
            key={b.kode}
            aria-labelledby={`${id}-${b.kode}`}
            className="grid gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p id={`${id}-${b.kode}`} className="font-medium">
                {b.nama}
              </p>
              <p className="text-teks-kecil text-tinta-2">
                {b.sumber
                  ? [
                      `Terisi otomatis dari ${b.sumber}`,
                      b.jumlah !== null && `${formatAngka(b.jumlah)} baris`,
                      b.diperbarui && `diperbarui ${formatTanggal(b.diperbarui, 'pendek')}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Diisi manual'}
              </p>
            </div>
            {b.sumber && (
              <TautanTombol href={`/admin/buku/${b.kode}`} ukuran="kecil" aria-label={`Lihat ${b.nama}`}>
                Lihat
              </TautanTombol>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Buku Administrasi (SPEC §8, Lampiran B): buku wajib Permendagri 47/2016 per kelompok, dengan sumber datanya. */
export function DaftarBuku() {
  const kueri = useQuery(opsiDaftarBuku())
  const daftar = kueri.data
  const otomatis = daftar?.filter((b) => b.sumber !== null).length ?? 0
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        jejak={[{ label: 'Tata kelola' }]}
        judul="Buku Administrasi"
        meta={daftar ? `Permendagri 47/2016 · ${formatAngka(daftar.length)} buku, ${formatAngka(otomatis)} terisi otomatis dari data modul` : null}
      />
      {kueri.isPending ? (
        <BarisKerangka jumlah={8} label="Memuat daftar buku…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        KELOMPOK_BUKU.map((k) => {
          const isi = kueri.data.filter((b) => b.kelompok === k)
          return isi.length > 0 ? <KelompokBuku key={k} judul={LABEL_KELOMPOK_BUKU[k]} daftar={isi} /> : null
        })
      )}
    </div>
  )
}
