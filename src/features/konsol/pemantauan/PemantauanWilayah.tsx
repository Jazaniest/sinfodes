import { CaretRight, DownloadSimple } from '@phosphor-icons/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarDesaKonsol, opsiPemantauan } from '@/api/konsol'
import { formatAngka, formatPersen } from '@/domain/format/angka'
import { keCsv } from '@/domain/format/csv'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { slugDesa } from '@/domain/konsol/aturan'
import { barisCsvPemantauan, rasioApbdes, type RingkasanWilayah } from '@/domain/konsol/pemantauan'
import { cn } from '@/ui/cn'
import { Select } from '@/ui/isian/Select'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { unduhBerkas } from '@/ui/unduh'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiKonsol } from '../sesi-konteks'

type Props = { wilayah: string | null; onUbahWilayah: (kode: string) => void; sekarang?: Date }

/** Kabupaten bawaan Tim Sinfodes: Pelalawan, tempat sebagian besar desa pelanggan. */
const WILAYAH_BAWAAN = '14.05'
const kepala = 'border-b border-garis px-3 py-2 text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2 tabular-nums'
const fokus =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'

const teksJam = (jam: number | null) => (jam === null ? '—' : `${formatAngka(Math.round(jam))} jam`)
const teksPersen = (rasio: number | null) => (rasio === null ? '—' : formatPersen(rasio))
const teksAdopsi = (r: RingkasanWilayah) => `${formatAngka(r.adopsi.aktif)} dari ${formatAngka(r.jumlahDesa)} aktif`

function SelAngka(p: { surat: number; layanan: number | null; kelengkapan: number | null; tanggapan: number | null; realisasi: number | null }) {
  const kanan = cn(sel, 'text-right whitespace-nowrap')
  return (
    <>
      <td className={kanan}>{formatAngka(p.surat)}</td>
      <td className={kanan}>{teksJam(p.layanan)}</td>
      <td className={kanan}>{teksPersen(p.kelengkapan)}</td>
      <td className={kanan}>{teksJam(p.tanggapan)}</td>
      <td className={kanan}>{teksPersen(p.realisasi)}</td>
    </>
  )
}

/**
 * Pemantauan wilayah (SPEC §11 layar 5): tabel per kecamatan yang bisa dibuka menjadi per desa, dengan Unduh CSV. Pemantau
 * hanya melihat kabupatennya dan hanya angka agregat; Tim Sinfodes memilih kabupaten.
 */
export function PemantauanWilayah({ wilayah, onUbahWilayah, sekarang = new Date() }: Props) {
  const { pengguna } = useSesiKonsol()
  const tim = pengguna.peran === 'tim'
  const kode = tim ? (wilayah ?? WILAYAH_BAWAAN) : null
  const kueri = useQuery({ ...opsiPemantauan(kode), placeholderData: keepPreviousData })
  const daftarDesa = useQuery({ ...opsiDaftarDesaKonsol({}), enabled: tim })
  const kabupaten = [...new Map((daftarDesa.data ?? []).map((d) => [d.kabupaten.kode, d.kabupaten])).values()].sort((a, b) =>
    a.nama.localeCompare(b.nama, 'id'),
  )
  const [terbuka, setTerbuka] = useState<ReadonlySet<string>>(new Set())
  const d = kueri.data
  const semuaTerbuka = d !== undefined && d.kecamatan.length > 0 && d.kecamatan.every((k) => terbuka.has(k.kecamatan.kode))
  const balik = (k: string) =>
    setTerbuka((lama) => {
      const baru = new Set(lama)
      if (baru.has(k)) baru.delete(k)
      else baru.add(k)
      return baru
    })
  const unduh = () => {
    if (d) unduhBerkas(`pemantauan-${slugDesa(d.wilayah.nama)}-${tanggalIsoWib(sekarang)}.csv`, keCsv(barisCsvPemantauan(d)))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        judul="Pemantauan wilayah"
        meta={d && `Kabupaten ${d.wilayah.nama} · ${formatAngka(d.total.jumlahDesa)} desa · ${formatTanggal(tanggalIsoWib(sekarang), 'hari')}`}
        aksi={
          <Tombol ikon={<DownloadSimple aria-hidden size={16} />} isDisabled={!d} onPress={unduh}>
            Unduh CSV
          </Tombol>
        }
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        {tim ? (
          <Select
            label="Kabupaten"
            className="w-56"
            pilihan={kabupaten.map((k) => ({ id: k.kode, label: k.nama }))}
            nilai={kode}
            onUbah={(id) => {
              if (id) onUbahWilayah(id)
            }}
          />
        ) : (
          <p className="max-w-prose text-tinta-2">Angka gabungan per desa di wilayah Anda. Tidak ada data pribadi warga.</p>
        )}
        {d && d.kecamatan.length > 0 && (
          <Tombol ukuran="kecil" onPress={() => setTerbuka(semuaTerbuka ? new Set() : new Set(d.kecamatan.map((k) => k.kecamatan.kode)))}>
            {semuaTerbuka ? 'Tutup semua desa' : 'Buka semua desa'}
          </Tombol>
        )}
      </div>
      {kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : !d ? (
        <BarisKerangka jumlah={8} label="Memuat pemantauan…" />
      ) : d.kecamatan.length === 0 ? (
        <EmptyState judul="Belum ada desa pelanggan" keterangan="Kabupaten ini belum punya desa yang memakai Sinfodes." />
      ) : (
        <div aria-busy={kueri.isPlaceholderData} className={cn('overflow-x-auto border-y border-garis bg-lembar', kueri.isPlaceholderData && 'opacity-60')}>
          <table className="w-full min-w-[60rem] border-collapse">
            <caption className="sr-only">{`Pemantauan Kabupaten ${d.wilayah.nama} per kecamatan`}</caption>
            <thead>
              <tr>
                <th scope="col" className={cn(kepala, 'text-left')}>
                  Kecamatan / desa
                </th>
                <th scope="col" className={cn(kepala, 'text-left')}>
                  Status adopsi
                </th>
                <th scope="col" className={cn(kepala, 'text-right')}>
                  Surat bulan ini
                </th>
                <th scope="col" className={cn(kepala, 'text-right')}>
                  Waktu layanan
                </th>
                <th scope="col" className={cn(kepala, 'text-right')}>
                  Kelengkapan data
                </th>
                <th scope="col" className={cn(kepala, 'text-right')}>
                  Tanggapan pengaduan
                </th>
                <th scope="col" className={cn(kepala, 'text-right')}>
                  Realisasi APBDes
                </th>
              </tr>
            </thead>
            {d.kecamatan.map((k) => {
              const buka = terbuka.has(k.kecamatan.kode)
              return (
                <tbody key={k.kecamatan.kode} className="border-t border-garis">
                  <tr>
                    <th scope="row" className={cn(sel, 'text-left font-medium')}>
                      <Button onPress={() => balik(k.kecamatan.kode)} aria-expanded={buka} className={cn('inline-flex items-center gap-1.5 rounded-1 text-left', fokus)}>
                        <CaretRight aria-hidden size={14} className={cn('shrink-0 transition-transform', buka && 'rotate-90')} />
                        {k.kecamatan.nama}
                      </Button>
                    </th>
                    <td className={cn(sel, 'whitespace-nowrap')}>{teksAdopsi(k)}</td>
                    <SelAngka
                      surat={k.suratBulanIni}
                      layanan={k.waktuLayananJam}
                      kelengkapan={k.kelengkapan}
                      tanggapan={k.waktuTanggapanJam}
                      realisasi={k.realisasiApbdes}
                    />
                  </tr>
                  {buka &&
                    k.desa.map((x) => (
                      <tr key={x.id} className="text-teks-kecil">
                        <th scope="row" className={cn(sel, 'pl-9 text-left font-normal')}>
                          {x.nama}
                        </th>
                        <td className={sel}>{x.status}</td>
                        <SelAngka
                          surat={x.suratBulanIni}
                          layanan={x.waktuLayananJam}
                          kelengkapan={x.kelengkapan}
                          tanggapan={x.waktuTanggapanJam}
                          realisasi={rasioApbdes(x.apbdes)}
                        />
                      </tr>
                    ))}
                </tbody>
              )
            })}
            <tfoot>
              <tr className="border-t-[1.5px] border-tinta font-medium">
                <th scope="row" className={cn(sel, 'text-left')}>
                  {`Kabupaten ${d.wilayah.nama}`}
                </th>
                <td className={cn(sel, 'whitespace-nowrap')}>{teksAdopsi(d.total)}</td>
                <SelAngka
                  surat={d.total.suratBulanIni}
                  layanan={d.total.waktuLayananJam}
                  kelengkapan={d.total.kelengkapan}
                  tanggapan={d.total.waktuTanggapanJam}
                  realisasi={d.total.realisasiApbdes}
                />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <dl className="grid max-w-3xl gap-x-6 gap-y-1 text-teks-kecil text-tinta-2 sm:grid-cols-[auto_1fr]">
        <dt className="font-medium text-tinta">Surat bulan ini</dt>
        <dd>Surat Selesai yang terbit sejak tanggal 1 bulan ini.</dd>
        <dt className="font-medium text-tinta">Waktu layanan</dt>
        <dd>Median jam dari permohonan masuk sampai Selesai, untuk surat yang terbit 30 hari terakhir.</dd>
        <dt className="font-medium text-tinta">Kelengkapan data</dt>
        <dd>Persentase penduduk hidup yang data wajibnya terisi.</dd>
        <dt className="font-medium text-tinta">Tanggapan pengaduan</dt>
        <dd>Median jam sampai balasan pertama desa, untuk pengaduan yang masuk 90 hari terakhir.</dd>
        <dt className="font-medium text-tinta">Realisasi APBDes</dt>
        <dd>Realisasi belanja dibanding anggarannya, tahun berjalan.</dd>
        <dt className="font-medium text-tinta">Kecamatan dan kabupaten</dt>
        <dd>Kelengkapan ditimbang jumlah penduduk; waktu adalah median dari median desa. Tanda — berarti belum ada datanya.</dd>
      </dl>
    </div>
  )
}
