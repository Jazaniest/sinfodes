import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { opsiProgramBansos } from '@/api/bansos'
import { pesanGalat } from '@/api/galat'
import { labelTahap, tahapBerikutnya, type RingkasProgram } from '@/domain/bansos/schema'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'

/** "Tahap III · 30 Sep 2026", atau keterangan bila semua tahap tahun ini sudah lewat. */
function teksBerikut(p: RingkasProgram, hariIni: string) {
  const t = tahapBerikutnya(p, hariIni)
  return t ? `${labelTahap(t.ke)} · ${formatTanggal(t.jadwal, 'pendek')}` : <span className="text-tinta-2">Semua tahap sudah disalurkan</span>
}

/** Program bantuan sosial (SPEC §8): jumlah KPM dan jadwal penyaluran. Hanya lihat. */
export function DaftarProgram({ onBuka, sekarang }: { onBuka: (id: string) => void; sekarang?: Date }) {
  const hariIni = useMemo(() => tanggalIsoWib(sekarang ?? new Date()), [sekarang])
  const daftar = useQuery(opsiProgramBansos())

  const kolom = useMemo(
    (): KolomTabel<RingkasProgram>[] => [
      {
        id: 'program',
        judul: 'Program',
        wajib: true,
        isi: (p) => (
          <span className="flex flex-col">
            <span className="font-medium">{p.nama}</span>
            <span className="text-teks-kecil text-tinta-2">
              {p.sumber}
              {p.dikelolaDesa && ' · dikelola desa'}
            </span>
          </span>
        ),
      },
      { id: 'penerima', judul: 'Penerima', rataKanan: true, isi: (p) => <span className="whitespace-nowrap">{formatAngka(p.jumlahPenerima)} KPM</span> },
      { id: 'bentuk', judul: 'Bentuk bantuan', isi: (p) => p.bentuk },
      { id: 'berikut', judul: 'Penyaluran berikutnya', isi: (p) => teksBerikut(p, hariIni) },
      {
        id: 'tinjau',
        judul: 'Perlu ditinjau',
        isi: (p) =>
          p.perluDitinjau > 0 ? (
            <span className="font-medium text-oker">{formatAngka(p.perluDitinjau)} perlu ditinjau</span>
          ) : (
            <span className="text-tinta-2">—</span>
          ),
      },
    ],
    [hariIni],
  )

  return (
    <div>
      <PageHeader
        jejak={[{ label: 'Data desa' }]}
        judul="Bantuan Sosial"
        meta={daftar.data ? `${formatAngka(daftar.data.data.length)} program · penerima dihitung per keluarga (KPM)` : null}
      />
      <div className="pt-6">
        <DataTable
          label="Program bantuan sosial"
          kolom={kolom}
          kolomUtama="program"
          baris={daftar.data?.data}
          memuat={daftar.isPending}
          galat={daftar.isError ? pesanGalat(daftar.error) : null}
          onCobaLagi={() => void daftar.refetch()}
          kosong={<EmptyState judul="Belum ada program bantuan sosial" />}
          onBukaBaris={(p) => onBuka(p.id)}
          barisRingkas={(p) => (
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{p.nama}</span>
              <span className="text-teks-kecil text-tinta-2">
                {formatAngka(p.jumlahPenerima)} KPM · berikutnya {teksBerikut(p, hariIni)}
              </span>
              {p.perluDitinjau > 0 && <span className="text-teks-kecil font-medium text-oker">{formatAngka(p.perluDitinjau)} perlu ditinjau</span>}
            </span>
          )}
        />
      </div>
    </div>
  )
}
