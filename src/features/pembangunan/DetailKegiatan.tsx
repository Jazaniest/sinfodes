import { MapTrifold } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiKegiatan } from '@/api/pembangunan'
import { formatTanggal } from '@/domain/format/tanggal'
import { LABEL_SUMBER_DANA, type BarisKegiatan, type Dokumentasi } from '@/domain/pembangunan/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Rupiah } from '@/ui/domain/Rupiah'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'

const JEJAK = [{ label: 'Pembangunan', href: '/admin/pembangunan' }]
const TAHAP_FOTO: readonly Dokumentasi['persen'][] = [0, 50, 100]
const judulBagian = 'text-label font-medium text-tinta-2 uppercase'
const redup = (teks: string) => <span className="text-tinta-2">{teks}</span>

/** Detail kegiatan pembangunan (SPEC §8): progres, dokumentasi 0%, 50%, 100%, dan tautan ke peta. */
export function DetailKegiatan({ id }: { id: string }) {
  const kueri = useQuery(opsiKegiatan(id))
  if (kueri.isPending) return <BarisKerangka jumlah={6} label="Memuat kegiatan…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState judulHalaman judul="Kegiatan pembangunan tidak ditemukan" aksi={<Tautan href="/admin/pembangunan">Kembali ke Pembangunan</Tautan>} />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return <IsiKegiatan kegiatan={kueri.data} />
}

function IsiKegiatan({ kegiatan: k }: { kegiatan: BarisKegiatan }) {
  const { desa, dusun } = useSesiAdmin()
  const d = dusun.find((x) => x.id === k.dusunId)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={JEJAK}
        judul={k.nama}
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Cap varian={k.status} />
            <span>
              {k.lokasi}
              {d && ` · ${namaDusun(d, desa.istilahWilayah)}`}
            </span>
          </span>
        }
        aksi={
          <TautanTombol href={`/admin/peta?kegiatan=${k.id}`} ikon={<MapTrifold aria-hidden size={16} />}>
            Lihat di peta
          </TautanTombol>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-8">
          <section aria-label="Progres" className="grid gap-6 sm:grid-cols-2">
            <MiniBar label="Progres fisik" nilai={k.progresFisik} maks={100} keterangan="Bagian pekerjaan yang sudah selesai" />
            <MiniBar
              label="Progres keuangan"
              nilai={k.realisasi}
              maks={k.anggaran}
              keterangan={
                <>
                  <Rupiah nilai={k.realisasi} ringkas /> dari <Rupiah nilai={k.anggaran} ringkas />
                </>
              }
            />
          </section>
          <section aria-labelledby="judul-dokumentasi">
            <h2 id="judul-dokumentasi" className={judulBagian}>
              Dokumentasi progres
            </h2>
            <ul aria-label="Dokumentasi progres" className="mt-3 grid gap-4 sm:grid-cols-3">
              {TAHAP_FOTO.map((persen) => {
                const dok = k.dokumentasi.find((x) => x.persen === persen)
                return (
                  <li key={persen}>
                    <figure>
                      {dok?.foto ? (
                        <img src={dok.foto} alt={`${k.nama}, progres ${persen}%`} className="aspect-[4/3] w-full rounded-1 object-cover" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center rounded-1 border border-dashed border-garis-input bg-kertas-2 px-3 text-center text-teks-kecil text-tinta-2">
                          {dok ? 'Belum ada foto' : `Belum mencapai ${persen}%`}
                        </div>
                      )}
                      <figcaption className="mt-1.5 text-teks-kecil">
                        <span className="font-medium">{persen}%</span>
                        {dok && (
                          <span className="text-tinta-2">
                            {' '}
                            · {formatTanggal(dok.tanggal, 'pendek')} · {dok.keterangan}
                          </span>
                        )}
                      </figcaption>
                    </figure>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
        <aside aria-label="Rincian kegiatan">
          <DescriptionList
            items={[
              { label: 'Lokasi', nilai: k.lokasi },
              { label: desa.istilahWilayah.dusun, nilai: d ? namaDusun(d, desa.istilahWilayah) : null },
              { label: 'Volume', nilai: k.volume },
              { label: 'Sumber dana', nilai: LABEL_SUMBER_DANA[k.sumberDana] },
              { label: 'Pelaksana', nilai: k.pelaksana },
              { label: 'Mulai', nilai: k.mulai ? formatTanggal(k.mulai) : redup('Belum dimulai') },
              { label: 'Target selesai', nilai: formatTanggal(k.targetSelesai) },
              {
                label: 'Anggaran',
                nilai: (
                  <span className="flex flex-col">
                    <Rupiah nilai={k.anggaran} />
                    <span className="text-teks-kecil text-tinta-2">
                      APBDes · <span className="font-mono">{k.kodeApbdes}</span>
                    </span>
                  </span>
                ),
              },
              { label: 'Realisasi', nilai: <Rupiah nilai={k.realisasi} /> },
            ]}
          />
        </aside>
      </div>
    </div>
  )
}
