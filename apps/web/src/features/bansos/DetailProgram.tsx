import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { opsiDetailProgram, opsiPenerimaBansos } from '@/api/bansos'
import { GalatApi, pesanGalat } from '@/api/galat'
import { labelTahap, tahapBerikutnya, type FilterPenerima, type PenerimaBansos, type RingkasProgram } from '@/domain/bansos/schema'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { cakupanDusun } from '@/domain/pengguna/hak-akses'
import { namaDusun, namaDusunPendek } from '@/domain/wilayah/alamat'
import { Cap } from '@/ui/cap/Cap'
import { ChipFilter } from '@/ui/data/ChipFilter'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Pagination } from '@/ui/data/Pagination'
import { Select } from '@/ui/isian/Select'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'

type Props = {
  id: string
  filter: FilterPenerima
  onUbahFilter: (ubah: Partial<FilterPenerima>) => void
  onBukaPenduduk: (id: string) => void
  sekarang?: Date
}

const JEJAK = [{ label: 'Bantuan Sosial', href: '/admin/bansos' }]
const SEMUA = 'semua'

/** Detail program bansos (SPEC §8): jadwal tahap dan daftar penerima beserta status tiap tahap. Hanya lihat. */
export function DetailProgram({ id, ...lain }: Props) {
  const program = useQuery(opsiDetailProgram(id))
  if (program.isPending) return <BarisKerangka jumlah={6} label="Memuat program bantuan…" />
  if (program.isError) {
    if (program.error instanceof GalatApi && program.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState judulHalaman judul="Program bantuan tidak ditemukan" aksi={<Tautan href="/admin/bansos">Kembali ke Bantuan Sosial</Tautan>} />
      )
    }
    return <ErrorState pesan={pesanGalat(program.error)} onCobaLagi={() => void program.refetch()} />
  }
  return <IsiProgram program={program.data} {...lain} />
}

function IsiProgram({ program: p, filter, onUbahFilter, onBukaPenduduk, sekarang }: Omit<Props, 'id'> & { program: RingkasProgram }) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => tanggalIsoWib(sekarang ?? new Date()), [sekarang])
  const penerima = useQuery({ ...opsiPenerimaBansos(p.id, filter), placeholderData: keepPreviousData })
  const istilah = desa.istilahWilayah
  const namaPendek = useMemo(() => new Map(dusun.map((d) => [d.id, namaDusunPendek(d, istilah)])), [dusun, istilah])
  const berikut = tahapBerikutnya(p, hariIni)
  const satuDusun = cakupanDusun(pengguna) !== null
  const total = penerima.data?.meta.total

  const kolom = useMemo(
    (): KolomTabel<PenerimaBansos>[] => [
      { id: 'kk', judul: 'No. KK', isi: (x) => <span className="font-mono text-teks-kecil whitespace-nowrap">{kelompokkanNik(x.nomorKk)}</span> },
      {
        id: 'nama',
        judul: 'Atas nama',
        wajib: true,
        isi: (x) => (
          <span className="flex flex-col gap-1">
            <span className="font-medium">{x.atasNama.nama}</span>
            {x.perluDitinjau && (
              <span className="flex flex-wrap items-center gap-2 text-teks-kecil">
                <Cap varian="perlu-ditinjau" />
                <span className="text-tinta-2">{x.perluDitinjau.alasan}</span>
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'dusun',
        judul: istilah.dusun,
        isi: (x) => (
          <span className="whitespace-nowrap">
            {namaPendek.get(x.dusunId) ?? '—'} · {istilah.rt} {x.rt}
          </span>
        ),
      },
      { id: 'desil', judul: 'Desil', rataKanan: true, isi: (x) => formatAngka(x.desil) },
      ...p.tahap.map(
        (t, i): KolomTabel<PenerimaBansos> => ({ id: `tahap-${t.ke}`, judul: labelTahap(t.ke), isi: (x) => <Cap varian={x.penyaluran[i] ?? 'dijadwalkan'} /> }),
      ),
    ],
    [p.tahap, istilah, namaPendek],
  )

  const kosong =
    (total ?? 0) > 0 ? (
      <EmptyState judul={`Halaman ${formatAngka(filter.page)} tidak ada`} aksi={<Tombol onPress={() => onUbahFilter({ page: 1 })}>Ke halaman pertama</Tombol>} />
    ) : filter.tampil === 'perlu-ditinjau' ? (
      <EmptyState
        judul="Tidak ada penerima yang perlu ditinjau"
        aksi={<Tombol onPress={() => onUbahFilter({ tampil: 'semua', page: 1 })}>Tampilkan semua penerima</Tombol>}
      />
    ) : (
      <EmptyState
        judul={`Tidak ada penerima di ${istilah.dusun.toLowerCase()} ini`}
        aksi={<Tombol onPress={() => onUbahFilter({ dusun: undefined, page: 1 })}>Hapus saringan</Tombol>}
      />
    )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader jejak={JEJAK} judul={p.nama} meta={`${formatAngka(p.jumlahPenerima)} KPM · ${p.bentuk} · ${p.sumber}`} />
      <section aria-labelledby="judul-jadwal">
        <h2 id="judul-jadwal" className="text-label font-medium text-tinta-2 uppercase">
          Jadwal penyaluran
        </h2>
        <ol aria-label="Jadwal penyaluran" className="mt-2 divide-y divide-garis border-y border-garis bg-lembar">
          {p.tahap.map((t) => (
            <li key={t.ke} className={t.ke === berikut?.ke ? 'px-4 py-2.5 font-medium' : 'px-4 py-2.5'}>
              {labelTahap(t.ke)} · {t.periode} · {formatTanggal(t.jadwal, 'pendek')}
              <span className="text-tinta-2">
                {' · '}
                {t.jadwal < hariIni ? 'sudah disalurkan' : t.ke === berikut?.ke ? 'berikutnya' : 'dijadwalkan'}
              </span>
            </li>
          ))}
        </ol>
      </section>
      {!p.dikelolaDesa && (
        <Banner>
          Data penerima dari {p.sumber}. Desa hanya melihat; usulan perubahan disampaikan lewat musyawarah desa dan pemutakhiran DTSEN.
        </Banner>
      )}
      {p.perluDitinjau > 0 && filter.tampil === 'semua' && (
        <Banner
          nada="peringatan"
          aksi={<Tombol onPress={() => onUbahFilter({ tampil: 'perlu-ditinjau', page: 1 })}>Tampilkan yang perlu ditinjau</Tombol>}
        >
          {formatAngka(p.perluDitinjau)} penerima perlu ditinjau karena meninggal atau pindah. Penyaluran berikutnya ditahan sampai ditinjau.
        </Banner>
      )}
      <section aria-labelledby="judul-penerima" className="flex flex-col gap-4">
        <h2 id="judul-penerima" className="text-label font-medium text-tinta-2 uppercase">
          Penerima
        </h2>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <ChipFilter
            label="Tampilkan penerima"
            pilihan={[
              { id: 'semua', label: 'Semua penerima' },
              { id: 'perlu-ditinjau', label: 'Perlu ditinjau' },
            ]}
            nilai={filter.tampil}
            onUbah={(id) => onUbahFilter({ tampil: id === 'perlu-ditinjau' ? 'perlu-ditinjau' : 'semua', page: 1 })}
          />
          {!satuDusun && (
            <Select
              label={istilah.dusun}
              pilihan={[{ id: SEMUA, label: `Semua ${istilah.dusun.toLowerCase()}` }, ...dusun.map((d) => ({ id: String(d.nomor), label: namaDusun(d, istilah) }))]}
              nilai={filter.dusun === undefined ? SEMUA : String(filter.dusun)}
              onUbah={(id) => onUbahFilter({ dusun: dusun.find((d) => String(d.nomor) === id)?.nomor, page: 1 })}
              className="w-full sm:w-64"
            />
          )}
        </div>
        <div aria-busy={penerima.isPlaceholderData} className={penerima.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            label={`Penerima ${p.singkat}`}
            kolom={kolom}
            kolomUtama="nama"
            baris={penerima.data?.data}
            memuat={penerima.isPending}
            galat={penerima.isError ? pesanGalat(penerima.error) : null}
            onCobaLagi={() => void penerima.refetch()}
            kosong={kosong}
            onBukaBaris={(x) => onBukaPenduduk(x.atasNama.pendudukId)}
            barisRingkas={(x) => {
              const i = berikut ? berikut.ke - 1 : p.tahap.length - 1
              return (
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{x.atasNama.nama}</span>
                  <span className="text-teks-kecil text-tinta-2">
                    {namaPendek.get(x.dusunId) ?? '—'} · {istilah.rt} {x.rt} · desil {x.desil}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-teks-kecil">
                    {labelTahap(i + 1)} <Cap varian={x.penyaluran[i] ?? 'dijadwalkan'} />
                    {x.perluDitinjau && <Cap varian="perlu-ditinjau" />}
                  </span>
                </span>
              )
            }}
          />
        </div>
        {penerima.data && penerima.data.meta.total > 0 && !penerima.isError && (
          <Pagination
            page={filter.page}
            pageSize={filter.pageSize}
            total={penerima.data.meta.total}
            onPage={(page) => onUbahFilter({ page })}
            onPageSize={(pageSize) => onUbahFilter({ pageSize, page: 1 })}
          />
        )}
      </section>
    </div>
  )
}
