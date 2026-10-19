import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiRingkasanKabupaten } from '@/api/kabupaten'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import type { RingkasanKabupaten as DataRingkasan } from '@/domain/kabupaten/schema'
import { hrefPerhatianKabupaten, kalimatPerhatianKabupaten } from '@/domain/kabupaten/perhatian'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiKabupaten } from './sesi-konteks'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

/** "5 desa lain dalam persiapan dan 2 ditangguhkan."; null bila keduanya nol. */
function kalimatBelumBergabung({ persiapan, ditangguhkan }: DataRingkasan['adopsi']): string | null {
  const p = formatAngka(persiapan)
  const d = formatAngka(ditangguhkan)
  if (persiapan > 0 && ditangguhkan > 0) return `${p} desa lain dalam persiapan dan ${d} ditangguhkan.`
  if (persiapan > 0) return `${p} desa lain dalam persiapan.`
  if (ditangguhkan > 0) return `${d} desa lain ditangguhkan.`
  return null
}

/**
 * Ringkasan dasbor kabupaten (SPEC-V0.2 §8.3 butir 1): perlu perhatian (termasuk realisasi Dana Desa tertinggal), lalu adopsi
 * desa. Butir siaran menyusul di 7B-3; rata-rata Indeks dan posisi se-provinsi di 7C.
 */
export function RingkasanKabupaten({ sekarang = new Date() }: { sekarang?: Date }) {
  const { kabupaten } = useSesiKabupaten()
  const kueri = useQuery(opsiRingkasanKabupaten())
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader judul="Ringkasan" meta={`Kabupaten ${kabupaten.nama} · ${formatTanggal(tanggalIsoWib(sekarang), 'hari')}`} />
      {kueri.isPending ? (
        <BarisKerangka jumlah={4} label="Memuat ringkasan…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <>
          <section aria-labelledby="judul-perhatian">
            <h2 id="judul-perhatian" className={judulBagian}>
              Perlu perhatian
            </h2>
            {kueri.data.perhatian.length === 0 ? (
              <p className="mt-2 text-tinta-2">Tidak ada yang perlu diperhatikan saat ini.</p>
            ) : (
              <ul className="mt-2 divide-y divide-garis border-y border-garis bg-lembar">
                {kueri.data.perhatian.map((p) => (
                  <li key={p.jenis} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                    <span className="font-medium">{kalimatPerhatianKabupaten(p)}</span>
                    <Tautan href={hrefPerhatianKabupaten(p)} className="text-teks-kecil">
                      {p.jenis === 'realisasi-tertinggal' ? 'Buka Dana Desa' : 'Buka Pemantauan'}
                    </Tautan>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="judul-adopsi" className="flex flex-col gap-3">
            <h2 id="judul-adopsi" className={judulBagian}>
              Adopsi
            </h2>
            <p className="font-serif text-judul-bagian">
              {formatAngka(kueri.data.adopsi.bergabung)} dari {formatAngka(kueri.data.adopsi.jumlahDesa)} desa di Kabupaten{' '}
              {kabupaten.nama} sudah memakai Sinfodes.
            </p>
            {kalimatBelumBergabung(kueri.data.adopsi) && <p className="text-tinta-2">{kalimatBelumBergabung(kueri.data.adopsi)}</p>}
            <MiniBar
              label="Desa bergabung"
              labelTersembunyi
              nilai={kueri.data.adopsi.bergabung}
              maks={kueri.data.adopsi.jumlahDesa}
              keterangan={`${formatAngka(kueri.data.adopsi.bergabung)} dari ${formatAngka(kueri.data.adopsi.jumlahDesa)} desa`}
              className="max-w-md"
            />
          </section>
        </>
      )}
    </div>
  )
}
