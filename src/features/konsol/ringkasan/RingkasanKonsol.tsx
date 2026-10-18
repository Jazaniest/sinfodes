import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiRingkasanKonsol } from '@/api/konsol'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { kalimatPerhatian, kalimatPlatform } from '@/domain/konsol/aturan'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

/** Ringkasan Konsol (SPEC §11, SPEC-V0.2 §7): Perlu perhatian di atas, lalu angka platform dalam kalimat. */
export function RingkasanKonsol({ sekarang = new Date() }: { sekarang?: Date }) {
  const kueri = useQuery(opsiRingkasanKonsol())
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader judul="Ringkasan" meta={`Semua desa · ${formatTanggal(tanggalIsoWib(sekarang), 'hari')}`} />
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
                    <span className="font-medium">{kalimatPerhatian(p)}</span>
                    {p.jenis === 'berhenti-persiapan' && (
                      <Tautan href="/konsol/desa?status=Persiapan" className="text-teks-kecil">
                        Lihat desa dalam persiapan
                      </Tautan>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="judul-platform">
            <h2 id="judul-platform" className={judulBagian}>
              Angka platform
            </h2>
            <p className="mt-2 font-serif text-judul-bagian">{kalimatPlatform(kueri.data)}</p>
          </section>
        </>
      )}
    </div>
  )
}
