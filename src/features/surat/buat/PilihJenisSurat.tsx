import { useState } from 'react'
import { Button } from 'react-aria-components'
import { formatAngka } from '@/domain/format/angka'
import { cocokNama } from '@/domain/penduduk/cari'
import type { JenisDenganPakai } from '@/domain/surat/jenis'
import { cn } from '@/ui/cn'
import { SearchField } from '@/ui/isian/SearchField'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'

type Props = { daftar: readonly JenisDenganPakai[]; terpilih: string | null; onPilih: (kode: string) => void }

const fokus = 'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-biru'

/** Langkah 1 (SPEC §7.4): jenis surat aktif, yang paling sering dipakai di atas, beserta syarat dan masa berlakunya. */
export function PilihJenisSurat({ daftar, terpilih, onPilih }: Props) {
  const [kata, setKata] = useState('')
  const urut = daftar
    .filter((j) => j.aktif && (kata.trim() === '' || cocokNama(`${j.nama} ${j.kode}`, kata)))
    .sort((a, b) => b.jumlahPakai - a.jumlahPakai || a.nama.localeCompare(b.nama, 'id'))
  return (
    <div className="flex flex-col gap-4">
      <SearchField label="Cari jenis surat" placeholder="Nama atau kode surat" value={kata} onChange={setKata} className="w-full sm:w-80" />
      {urut.length === 0 ? (
        <EmptyState
          judul={`Tidak ada jenis surat yang cocok dengan “${kata.trim()}”`}
          aksi={<Tombol onPress={() => setKata('')}>Hapus pencarian</Tombol>}
        />
      ) : (
        <ul aria-label="Jenis surat" className="grid gap-3 lg:grid-cols-2">
          {urut.map((j) => (
            <li key={j.id}>
              <Button
                onPress={() => onPilih(j.kode)}
                className={cn(
                  'flex h-full w-full flex-col items-start gap-1 rounded-2 border bg-lembar px-4 py-3 text-left hover:border-biru',
                  j.kode === terpilih ? 'border-biru' : 'border-garis',
                  fokus,
                )}
              >
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span className="font-medium">{j.nama}</span>
                  <span className="font-mono text-teks-kecil text-tinta-2">{j.kode}</span>
                </span>
                <span className="text-teks-kecil text-tinta-2">Syarat: {j.syarat.join(', ')}</span>
                <span className="text-teks-kecil text-tinta-2">
                  {j.masaBerlakuBulan ? `Berlaku ${j.masaBerlakuBulan} bulan` : 'Berlaku tanpa batas waktu'} · Dipakai{' '}
                  {formatAngka(j.jumlahPakai)} kali dalam 12 bulan terakhir
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
