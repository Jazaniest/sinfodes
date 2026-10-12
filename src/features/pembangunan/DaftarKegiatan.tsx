import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiDaftarKegiatan } from '@/api/pembangunan'
import { formatAngka, formatRupiahRingkas } from '@/domain/format/angka'
import { LABEL_SUMBER_DANA, type BarisKegiatan } from '@/domain/pembangunan/schema'
import { Cap } from '@/ui/cap/Cap'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Rupiah } from '@/ui/domain/Rupiah'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'

/** Kegiatan pembangunan tahun berjalan (SPEC §8). Anggaran dan realisasinya dari rincian APBDes. */
export function DaftarKegiatan({ onBuka }: { onBuka: (id: string) => void }) {
  const daftar = useQuery(opsiDaftarKegiatan())
  const kegiatan = daftar.data?.data
  const kolom = useMemo(
    (): KolomTabel<BarisKegiatan>[] => [
      {
        id: 'kegiatan',
        judul: 'Kegiatan',
        wajib: true,
        isi: (k) => (
          <span className="flex flex-col">
            <span className="font-medium">{k.nama}</span>
            <span className="text-teks-kecil text-tinta-2">
              {k.volume && `${k.volume} · `}
              {k.lokasi}
            </span>
          </span>
        ),
      },
      { id: 'anggaran', judul: 'Anggaran', rataKanan: true, isi: (k) => <Rupiah nilai={k.anggaran} ringkas /> },
      { id: 'sumber', judul: 'Sumber dana', isi: (k) => LABEL_SUMBER_DANA[k.sumberDana] },
      { id: 'pelaksana', judul: 'Pelaksana', isi: (k) => k.pelaksana },
      {
        id: 'progres',
        judul: 'Progres',
        lebar: 'w-48',
        isi: (k) => (
          <span className="flex flex-col gap-2">
            <MiniBar label="Fisik" nilai={k.progresFisik} maks={100} />
            <MiniBar label="Keuangan" nilai={k.realisasi} maks={k.anggaran} />
          </span>
        ),
      },
      { id: 'status', judul: 'Status', isi: (k) => <Cap varian={k.status} /> },
    ],
    [],
  )
  const meta = kegiatan
    ? `${formatAngka(kegiatan.length)} kegiatan · ${formatRupiahRingkas(kegiatan.reduce((n, k) => n + k.anggaran, 0))} dari bidang Pelaksanaan Pembangunan Desa`
    : null

  return (
    <div>
      <PageHeader jejak={[{ label: 'Tata kelola' }]} judul="Pembangunan" meta={meta} />
      <div className="pt-6">
        <DataTable
          label="Kegiatan pembangunan"
          kolom={kolom}
          kolomUtama="kegiatan"
          baris={kegiatan}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={<EmptyState judul="Belum ada kegiatan pembangunan tahun ini" />}
          onBukaBaris={(k) => onBuka(k.id)}
          barisRingkas={(k) => (
            <span className="flex flex-col gap-2">
              <span className="font-medium">{k.nama}</span>
              <span className="text-teks-kecil text-tinta-2">
                <Rupiah nilai={k.anggaran} ringkas /> · {LABEL_SUMBER_DANA[k.sumberDana]}
              </span>
              <MiniBar label="Fisik" nilai={k.progresFisik} maks={100} />
              <span>
                <Cap varian={k.status} />
              </span>
            </span>
          )}
        />
      </div>
    </div>
  )
}
