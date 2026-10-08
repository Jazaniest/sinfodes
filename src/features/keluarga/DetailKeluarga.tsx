import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiKeluarga } from '@/api/keluarga'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import type { Penduduk } from '@/domain/penduduk/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { Nik } from '@/ui/domain/Nik'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { jenisKelaminPanjang } from '../penduduk/kolom'

const JEJAK = [{ label: 'Kependudukan' }, { label: 'Keluarga', href: '/admin/kependudukan/keluarga' }]

/** Detail KK ditata mirip kartu KK fisik (SPEC §6.5). */
export function DetailKeluarga({ id, onBukaPenduduk }: { id: string; onBukaPenduduk: (id: string) => void }) {
  const { desa, dusun } = useSesiAdmin()
  const kueri = useQuery(opsiKeluarga(id))
  const anggota = kueri.data?.anggota
  const kolom = useMemo((): KolomTabel<Penduduk>[] => {
    const nomor = new Map((anggota ?? []).map((a, i) => [a.id, i + 1] as const))
    return [
      { id: 'no', judul: 'No', rataKanan: true, isi: (a) => nomor.get(a.id) },
      { id: 'nama', judul: 'Nama lengkap', isi: (a) => <span className="font-medium">{a.nama}</span> },
      { id: 'nik', judul: 'NIK', isi: (a) => <Nik nik={a.nik} /> },
      { id: 'jk', judul: 'Jenis kelamin', isi: (a) => jenisKelaminPanjang(a.jenisKelamin) },
      { id: 'tempatLahir', judul: 'Tempat lahir', isi: (a) => a.tempatLahir },
      { id: 'tanggalLahir', judul: 'Tanggal lahir', isi: (a) => formatTanggal(a.tanggalLahir, 'pendek') },
      { id: 'agama', judul: 'Agama', isi: (a) => a.agama },
      { id: 'pendidikan', judul: 'Pendidikan', isi: (a) => a.pendidikan ?? '—' },
      { id: 'pekerjaan', judul: 'Jenis pekerjaan', isi: (a) => a.pekerjaan ?? '—' },
      { id: 'kawin', judul: 'Status perkawinan', isi: (a) => a.statusPerkawinan ?? '—' },
      { id: 'hubungan', judul: 'Hubungan dalam keluarga', isi: (a) => a.hubunganKeluarga },
      { id: 'wn', judul: 'Kewarganegaraan', isi: (a) => a.kewarganegaraan },
    ]
  }, [anggota])

  if (kueri.isPending) return <BarisKerangka jumlah={6} label="Memuat kartu keluarga…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState
          judul="Data keluarga tidak ditemukan"
          keterangan="KK ini tidak ada, atau berada di luar wilayah yang bisa Anda lihat."
          aksi={<Tautan href="/admin/kependudukan/keluarga">Kembali ke daftar keluarga</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }

  const { keluarga: kk } = kueri.data
  const daftarAnggota = kueri.data.anggota
  const kepala = daftarAnggota.find((a) => a.id === kk.kepalaKeluargaId)
  const d = dusun.find((x) => x.id === kk.dusunId)
  const istilah = desa.istilahWilayah
  const isianKartu: ReadonlyArray<readonly [string, string]> = [
    ['Nama kepala keluarga', kepala?.nama ?? '—'],
    ['Alamat', d ? namaDusun(d, istilah) : '—'],
    [`${istilah.rt}/${istilah.rw}`, `${kk.rt}/${kk.rw}`],
    ['Desa/Kelurahan', desa.nama],
    ['Kecamatan', desa.kecamatan.nama],
    ['Kabupaten/Kota', desa.kabupaten.nama],
    ['Provinsi', desa.provinsi.nama],
    ['Kode pos', desa.kodePos || '—'],
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={JEJAK}
        judul={`KK ${kepala?.nama ?? ''}`.trim()}
        meta={`${formatAngka(daftarAnggota.length)} anggota · diterbitkan ${formatTanggal(kk.tanggalTerbit)}`}
      />
      <section aria-labelledby="judul-kartu" className="rounded-2 border border-garis bg-lembar p-5 sm:p-6">
        <div className="flex flex-col items-center gap-1 border-b border-garis pb-4 text-center">
          <h2 id="judul-kartu" className="text-label font-medium tracking-widest text-tinta-2 uppercase">
            Kartu Keluarga
          </h2>
          <p className="font-mono text-judul-bagian font-medium tabular-nums">No. {kelompokkanNik(kk.nomorKk)}</p>
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {isianKartu.map(([label, nilai]) => (
            <div key={label} className="grid grid-cols-[10rem_1fr] gap-2">
              <dt className="text-tinta-2">{label}</dt>
              <dd className="font-medium">{nilai}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="judul-anggota">
        <h2 id="judul-anggota" className="mb-2 text-label font-medium text-tinta-2 uppercase">
          Anggota keluarga
        </h2>
        <DataTable
          label="Anggota keluarga"
          kolom={kolom}
          kolomUtama="nama"
          baris={daftarAnggota}
          memuat={false}
          galat={null}
          kosong={null}
          onBukaBaris={(a) => onBukaPenduduk(a.id)}
          barisRingkas={(a) => (
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{a.nama}</span>
              <Nik nik={a.nik} />
              <span className="text-teks-kecil text-tinta-2">{a.hubunganKeluarga}</span>
            </span>
          )}
        />
      </section>
    </div>
  )
}
